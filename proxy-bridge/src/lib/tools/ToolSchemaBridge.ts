/**
 * ToolSchemaBridge — Provider-specific tool schema sanitization (OC-02)
 *
 * Inspired by OpenClaw's clean-for-gemini.ts pattern.
 * Different LLM providers have different JSON Schema support levels.
 * This module transforms tool definitions to be compatible with each provider.
 */

// Keywords that Gemini API rejects
const GEMINI_UNSUPPORTED_KEYWORDS = new Set([
  'patternProperties',
  'additionalProperties',
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'definitions',
  'examples',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'multipleOf',
  'pattern',
  'format',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
]);

/**
 * Recursively strip unsupported keywords from a schema for Gemini.
 */
function cleanSchemaForGemini(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini);

  const obj = schema as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (GEMINI_UNSUPPORTED_KEYWORDS.has(key)) continue;

    // Convert const to enum (Gemini doesn't support const)
    if (key === 'const') {
      cleaned.enum = [value];
      continue;
    }

    // Flatten type arrays (e.g., ["string", "null"] -> "string")
    if (key === 'type' && Array.isArray(value)) {
      const types = (value as string[]).filter(t => t !== 'null');
      cleaned.type = types.length === 1 ? types[0] : types;
      continue;
    }

    // Recurse into nested schemas
    if (key === 'properties' && value && typeof value === 'object') {
      const props = value as Record<string, unknown>;
      cleaned[key] = Object.fromEntries(
        Object.entries(props).map(([k, v]) => [k, cleanSchemaForGemini(v)])
      );
    } else if (key === 'items' && value && typeof value === 'object') {
      cleaned[key] = cleanSchemaForGemini(value);
    } else if ((key === 'anyOf' || key === 'oneOf' || key === 'allOf') && Array.isArray(value)) {
      // Try to flatten literal anyOf/oneOf into enum
      const flattened = tryFlattenLiteralUnion(value);
      if (flattened) {
        cleaned.type = flattened.type;
        cleaned.enum = flattened.values;
      } else {
        cleaned[key] = value.map(v => cleanSchemaForGemini(v));
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Try to flatten a union of literal types into a single enum.
 * e.g., anyOf: [{ const: "a", type: "string" }, { const: "b", type: "string" }]
 * becomes: { type: "string", enum: ["a", "b"] }
 */
function tryFlattenLiteralUnion(variants: unknown[]): { type: string; values: unknown[] } | null {
  if (variants.length === 0) return null;

  const values: unknown[] = [];
  let commonType: string | null = null;

  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') return null;
    const v = variant as Record<string, unknown>;

    let literalValue: unknown;
    if ('const' in v) {
      literalValue = v.const;
    } else if (Array.isArray(v.enum) && v.enum.length === 1) {
      literalValue = v.enum[0];
    } else {
      return null;
    }

    const variantType = typeof v.type === 'string' ? v.type : null;
    if (!variantType) return null;
    if (commonType === null) commonType = variantType;
    else if (commonType !== variantType) return null;

    values.push(literalValue);
  }

  if (commonType && values.length > 0) {
    return { type: commonType, values };
  }
  return null;
}

/**
 * Normalize schema for OpenAI: ensure top-level type is "object".
 */
function normalizeSchemaForOpenAI(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema;
  const obj = schema as Record<string, unknown>;
  if (!obj.type) {
    return { type: 'object', ...obj };
  }
  return schema;
}

export interface ToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Sanitize tool definitions for a specific provider.
 */
export function sanitizeToolsForProvider(tools: ToolDefinition[], providerId: string): ToolDefinition[] {
  const normalized = providerId.toLowerCase();

  if (normalized.includes('gemini') || normalized.includes('google')) {
    return tools.map(tool => ({
      ...tool,
      function: {
        ...tool.function,
        parameters: cleanSchemaForGemini(tool.function.parameters) as Record<string, unknown>,
      }
    }));
  }

  if (normalized.includes('openai') || normalized === 'nvidia') {
    return tools.map(tool => ({
      ...tool,
      function: {
        ...tool.function,
        parameters: normalizeSchemaForOpenAI(tool.function.parameters) as Record<string, unknown>,
      }
    }));
  }

  // Anthropic and others: pass through as-is
  return tools;
}
