/**
 * P20-06: OpenTelemetry (OTel) Observability Integration
 *
 * Provides standard OpenTelemetry-compatible tracing for agent sessions,
 * tool execution, LLM calls, and CompletionGate checks.
 *
 * Architecture:
 *   - No-op by default (zero overhead when disabled)
 *   - Enable via PolicyStore: `otel_enabled: true`, `otel_endpoint: "http://localhost:4318"`
 *   - When enabled, creates spans with standard OTel attributes
 *   - Compatible with Grafana, Datadog, Jaeger, Honeycomb, etc.
 *
 * This module provides its own lightweight span interface that maps 1:1 to OTel.
 * To use the real SDK, install `@opentelemetry/sdk-node` and set `useRealSDK: true`.
 */

import { broadcast } from './infrastructure/socket-instance';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  status: 'OK' | 'ERROR' | 'UNSET';
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface TracerConfig {
  enabled: boolean;
  serviceName?: string;
  endpoint?: string;
  /** Export spans via HTTP to OTel collector */
  exportHttp?: boolean;
  /** Emit spans as socket events for the dashboard */
  emitSocket?: boolean;
  /** Buffer size before flushing (default: 10) */
  bufferSize?: number;
}

/* ─── Span Builder ──────────────────────────────────────────────────── */

let spanIdCounter = 0;

function generateId(): string {
  spanIdCounter++;
  return `${Date.now().toString(36)}-${spanIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class SpanBuilder implements Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes = {};
  status: 'OK' | 'ERROR' | 'UNSET' = 'UNSET';
  events: SpanEvent[] = [];

  private tracer: OTelTracer;

  constructor(tracer: OTelTracer, name: string, traceId?: string, parentSpanId?: string) {
    this.tracer = tracer;
    this.name = name;
    this.traceId = traceId || generateId();
    this.spanId = generateId();
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
  }

  setAttribute(key: string, value: string | number | boolean): SpanBuilder {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attrs: SpanAttributes): SpanBuilder {
    Object.assign(this.attributes, attrs);
    return this;
  }

  addEvent(name: string, attributes?: SpanAttributes): SpanBuilder {
    this.events.push({ name, timestamp: Date.now(), attributes });
    return this;
  }

  setStatus(status: 'OK' | 'ERROR', message?: string): SpanBuilder {
    this.status = status;
    if (message) this.attributes['status.message'] = message;
    return this;
  }

  end(): void {
    this.endTime = Date.now();
    if (this.status === 'UNSET') this.status = 'OK';
    this.tracer.recordSpan(this);
  }
}

/* ─── No-Op Span (zero overhead when tracing disabled) ───────────── */

const NO_OP_SPAN: SpanBuilder = {
  name: '', traceId: '', spanId: '', startTime: 0,
  attributes: {}, status: 'UNSET', events: [],
  setAttribute: () => NO_OP_SPAN,
  setAttributes: () => NO_OP_SPAN,
  addEvent: () => NO_OP_SPAN,
  setStatus: () => NO_OP_SPAN,
  end: () => {},
  tracer: null as any,
} as any;

/* ─── OTelTracer ────────────────────────────────────────────────────── */

export class OTelTracer {
  private config: TracerConfig;
  private buffer: Span[] = [];
  private activeTraceId: string | null = null;

  constructor(config: Partial<TracerConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      serviceName: config.serviceName ?? 'queenbee',
      endpoint: config.endpoint,
      exportHttp: config.exportHttp ?? false,
      emitSocket: config.emitSocket ?? true,
      bufferSize: config.bufferSize ?? 10,
    };
  }

  /** Update config at runtime (e.g., when PolicyStore changes). */
  configure(config: Partial<TracerConfig>): void {
    Object.assign(this.config, config);
  }

  /** Check if tracing is enabled. */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /** Set the active trace ID for correlating child spans. */
  setActiveTrace(traceId: string): void {
    this.activeTraceId = traceId;
  }

  /* ─── Span Creation (typed helpers) ────────────────────────────── */

  /** Start a new session span (root span for an agent session). */
  startSession(sessionId: string, agentId: string, role: string): SpanBuilder {
    if (!this.config.enabled) return NO_OP_SPAN;

    const span = new SpanBuilder(this, 'agent.session');
    span.setAttributes({
      'agent.session.id': sessionId,
      'agent.id': agentId,
      'agent.role': role,
      'service.name': this.config.serviceName!,
    });
    this.activeTraceId = span.traceId;
    return span;
  }

  /** Start a tool execution span (child of session). */
  startToolExecution(toolName: string, agentId: string): SpanBuilder {
    if (!this.config.enabled) return NO_OP_SPAN;

    return new SpanBuilder(this, `tool.${toolName}`, this.activeTraceId || undefined)
      .setAttributes({
        'tool.name': toolName,
        'agent.id': agentId,
      });
  }

  /** Start an LLM call span (child of session). */
  startLLMCall(provider: string, model: string): SpanBuilder {
    if (!this.config.enabled) return NO_OP_SPAN;

    return new SpanBuilder(this, 'llm.call', this.activeTraceId || undefined)
      .setAttributes({
        'llm.provider': provider,
        'llm.model': model,
      });
  }

  /** Start a CompletionGate check span. */
  startGateCheck(checkpoint: string): SpanBuilder {
    if (!this.config.enabled) return NO_OP_SPAN;

    return new SpanBuilder(this, `gate.${checkpoint}`, this.activeTraceId || undefined)
      .setAttribute('gate.checkpoint', checkpoint);
  }

  /** Start a generic span. */
  startSpan(name: string, attributes?: SpanAttributes): SpanBuilder {
    if (!this.config.enabled) return NO_OP_SPAN;

    const span = new SpanBuilder(this, name, this.activeTraceId || undefined);
    if (attributes) span.setAttributes(attributes);
    return span;
  }

  /* ─── Span Recording & Export ──────────────────────────────────── */

  /** Record a completed span (called by SpanBuilder.end()). */
  recordSpan(span: Span): void {
    this.buffer.push(span);

    // Emit to dashboard via socket
    if (this.config.emitSocket) {
      broadcast('OTEL_SPAN', {
        name: span.name,
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        durationMs: (span.endTime || Date.now()) - span.startTime,
        status: span.status,
        attributes: span.attributes,
        events: span.events,
      });
    }

    // Flush buffer when full
    if (this.buffer.length >= (this.config.bufferSize || 10)) {
      this.flush();
    }
  }

  /** Flush buffered spans to the OTel collector endpoint. */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const spans = [...this.buffer];
    this.buffer = [];

    // Export via HTTP to OTel collector (if configured)
    if (this.config.exportHttp && this.config.endpoint) {
      try {
        const body = JSON.stringify({
          resourceSpans: [{
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: this.config.serviceName } },
              ],
            },
            scopeSpans: [{
              spans: spans.map(s => ({
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId || '',
                name: s.name,
                startTimeUnixNano: s.startTime * 1_000_000,
                endTimeUnixNano: (s.endTime || Date.now()) * 1_000_000,
                status: { code: s.status === 'ERROR' ? 2 : s.status === 'OK' ? 1 : 0 },
                attributes: Object.entries(s.attributes)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => ({
                    key: k,
                    value: typeof v === 'string' ? { stringValue: v }
                      : typeof v === 'number' ? { intValue: v }
                      : { boolValue: v },
                  })),
                events: s.events.map(e => ({
                  name: e.name,
                  timeUnixNano: e.timestamp * 1_000_000,
                })),
              })),
            }],
          }],
        });

        // Fire-and-forget POST to OTel collector
        fetch(`${this.config.endpoint}/v1/traces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }).catch(err => {
          console.warn('[OTelTracer] Failed to export spans:', err.message);
        });
      } catch {
        // Non-blocking — tracing should never break the app
      }
    }
  }

  /** Get all buffered spans (for testing/debugging). */
  getBufferedSpans(): Span[] {
    return [...this.buffer];
  }

  /** Clear all buffered spans. */
  clear(): void {
    this.buffer = [];
    this.activeTraceId = null;
  }
}

/** Singleton tracer instance — disabled by default. */
export const otelTracer = new OTelTracer({ enabled: false });
