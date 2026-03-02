/**
 * GraphEngine — Two-layer dependency graph for QueenBee
 *
 * Layer 1 (file-level):  skott  — resolves TS path aliases, detects unused files
 * Layer 2 (function-level): @ast-grep/napi — AST call-site extraction per file
 *
 * Public API:
 *   buildGraph(projectPath)            → full project graph (cached)
 *   scoutImpact(projectPath, filePath) → blast radius for one file
 *   getFunctionCallers(projectPath, functionName) → reverse call-graph for one fn
 */

import fs from 'fs-extra';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileNode {
  id: string;                  // relative path from project root
  imports: string[];           // files this file directly imports (project-local)
  importedBy: string[];        // files that directly import this file
  functions: FunctionNode[];   // functions declared in this file
  isOrphan: boolean;           // true if nothing imports this file AND not an entry point
  thirdParty: string[];        // npm packages imported
}

export interface FunctionNode {
  name: string;
  file: string;                // relative path
  line: number;
  calls: string[];             // function/method names called inside this function's body
}

export interface ProjectGraph {
  projectPath: string;
  builtAt: number;
  files: Record<string, FileNode>;
  totalFiles: number;
  orphanFiles: string[];
  circularDeps: string[][];
}

export interface ImpactResult {
  targetFile: string;
  directDependents: string[];     // files that directly import targetFile
  transitiveDependents: string[]; // all files in the reverse-dep chain (excl. self)
  directDependencies: string[];   // files targetFile imports
  orphanRisk: boolean;
  totalImpact: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const SKIPPED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.turbo', '.cache']);
const TS_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'];

// Patterns that indicate a file is an entry point (never an orphan)
const ENTRY_HEURISTICS = [
  /(?:^|[/\\])index\.[tj]sx?$/,
  /(?:^|[/\\])main\.[tj]sx?$/,
  /(?:^|[/\\])App\.[tj]sx?$/,
  /(?:^|[/\\])server\.[tj]sx?$/,
  /(?:^|[/\\])middleware\.[tj]sx?$/,    // Next.js middleware
  /[/\\]pages[/\\]/,                    // Next.js pages — routes
  /[/\\]app[/\\]/,                      // Next.js app dir
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /__tests__[/\\]/,
  /\.config\.[tj]sx?$/,                 // next.config.js, vite.config.ts etc.
  /\.config\.js$/,
  /\.d\.ts$/,                           // declaration files
];

function isEntryPoint(relPath: string): boolean {
  return ENTRY_HEURISTICS.some(re => re.test(relPath));
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const walk = async (current: string) => {
    let entries: fs.Dirent[];
    try { entries = await fs.readdir(current, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIPPED_DIRS.has(e.name)) await walk(path.join(current, e.name));
      } else if (TS_EXTS.some(ext => e.name.endsWith(ext))) {
        results.push(path.join(current, e.name));
      }
    }
  };
  await walk(dir);
  return results;
}

/**
 * Extract function/method declarations and their internal call sites using
 * ast-grep's rule-based API (catches top-level fns, arrow fns, AND class methods).
 */
async function extractFunctions(absFile: string, relFile: string): Promise<FunctionNode[]> {
  const { parse, Lang } = await import('@ast-grep/napi');

  let src: string;
  try { src = await fs.readFile(absFile, 'utf-8'); }
  catch { return []; }

  const isTsx = absFile.endsWith('.tsx') || absFile.endsWith('.jsx');
  const lang = isTsx ? Lang.Tsx : Lang.TypeScript;

  let sg: any;
  try { sg = parse(lang, src); }
  catch { return []; }

  const root = sg.root();
  const nodes: FunctionNode[] = [];

  // ── 1. Class methods (method_definition) ──────────────────────────────────
  let methodDefs: any[] = [];
  try { methodDefs = root.findAll({ rule: { kind: 'method_definition' } }); }
  catch { methodDefs = []; }

  for (const m of methodDefs) {
    const nameNode = m.field('name');
    if (!nameNode) continue;
    const fnName = nameNode.text();
    if (!fnName || fnName === 'constructor') continue;

    const line = m.range().start.line + 1;
    const body = m.field('body');
    const calls = extractCallsFromNode(body);
    nodes.push({ name: fnName, file: relFile, line, calls });
  }

  // ── 2. Top-level / nested function declarations ────────────────────────────
  let funcDecls: any[] = [];
  try { funcDecls = root.findAll({ rule: { kind: 'function_declaration' } }); }
  catch { funcDecls = []; }

  for (const fd of funcDecls) {
    const nameNode = fd.field('name');
    if (!nameNode) continue;
    const fnName = nameNode.text();
    if (!fnName) continue;
    const line = fd.range().start.line + 1;
    const body = fd.field('body');
    const calls = extractCallsFromNode(body);
    nodes.push({ name: fnName, file: relFile, line, calls });
  }

  // ── 3. Arrow functions and function expressions assigned to variables ──────
  //      const foo = (...) => { ... }   or   const foo = function(...) { ... }
  let varDecls: any[] = [];
  try { varDecls = root.findAll({ rule: { kind: 'variable_declarator' } }); }
  catch { varDecls = []; }

  for (const vd of varDecls) {
    const nameNode = vd.field('name');
    if (!nameNode) continue;
    const fnName = nameNode.text();
    if (!fnName) continue;

    const valueNode = vd.field('value');
    if (!valueNode) continue;
    const valueKind = valueNode.kind();
    if (valueKind !== 'arrow_function' && valueKind !== 'function' && valueKind !== 'function_expression') continue;

    const line = vd.range().start.line + 1;
    const body = valueNode.field('body');
    const calls = extractCallsFromNode(body ?? valueNode);
    nodes.push({ name: fnName, file: relFile, line, calls });
  }

  // ── 4. Dedupe by name+line ─────────────────────────────────────────────────
  const seen = new Set<string>();
  return nodes.filter(n => {
    const key = `${n.name}:${n.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Extract callee identifiers from all call_expression nodes within a subtree. */
function extractCallsFromNode(node: any): string[] {
  if (!node) return [];
  const calls: string[] = [];
  let callExprs: any[] = [];
  try { callExprs = node.findAll({ rule: { kind: 'call_expression' } }); }
  catch { return []; }

  for (const c of callExprs) {
    const fn = c.field('function');
    if (!fn) continue;
    const txt = fn.text();
    // Accept simple identifiers and member expressions (foo, foo.bar, this.foo)
    if (txt && /^[\w$.]+$/.test(txt)) {
      calls.push(txt);
    }
  }
  return [...new Set(calls)];
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { graph: ProjectGraph; mtime: number }>();
const CACHE_TTL_MS = 30_000; // 30 s

async function getCachedOrBuild(projectPath: string): Promise<ProjectGraph> {
  const now = Date.now();
  const cached = cache.get(projectPath);
  if (cached && now - cached.mtime < CACHE_TTL_MS) return cached.graph;
  const graph = await buildGraphInternal(projectPath);
  cache.set(projectPath, { graph, mtime: now });
  return graph;
}

// ─── Core builder ─────────────────────────────────────────────────────────────

async function buildGraphInternal(projectPath: string): Promise<ProjectGraph> {
  // We always search from projectPath, but skip .next / dist etc. in collectSourceFiles
  const absFiles = await collectSourceFiles(projectPath);
  const relFiles = absFiles.map(f => path.relative(projectPath, f));

  // File-node skeleton
  const fileMap: Record<string, FileNode> = {};
  for (const rel of relFiles) {
    fileMap[rel] = { id: rel, imports: [], importedBy: [], functions: [], isOrphan: false, thirdParty: [] };
  }

  // ── skott for accurate import resolution (handles tsconfig paths) ──────────
  let skottGraph: Record<string, { adjacentTo: string[]; body?: { thirdPartyDependencies?: string[] } }> | null = null;
  try {
      const skottMod = await import('skott');
      const skott = (skottMod.default ?? skottMod) as (...args: any[]) => Promise<any>;
      const instance = await skott({
      cwd: projectPath,
      tsConfigPath: (await fs.pathExists(path.join(projectPath, 'tsconfig.json')))
        ? path.join(projectPath, 'tsconfig.json') : undefined,
      fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      dependencyTracking: { thirdParty: true, builtin: false, typeOnly: true },
      // Ignore .next and other build artifacts
      ignorePatterns: ['.next/**', 'dist/**', 'build/**', 'out/**', 'coverage/**'],
    });
    const { graph } = instance.getStructure();
    // Only keep entries that are inside our own relFiles set (skip .next etc.)
    const relSet = new Set(relFiles);
    skottGraph = Object.fromEntries(
      Object.entries(graph as Record<string, any>).filter(([id]) => relSet.has(id))
    );
  } catch {
    skottGraph = null;
  }

  if (skottGraph) {
    for (const [rel, node] of Object.entries(skottGraph)) {
      if (!fileMap[rel]) fileMap[rel] = { id: rel, imports: [], importedBy: [], functions: [], isOrphan: false, thirdParty: [] };

      // adjacentTo contains only project-local files (skott already resolves aliases)
      fileMap[rel].imports = (node.adjacentTo ?? []).filter((d: string) => fileMap[d]);
      fileMap[rel].thirdParty = node.body?.thirdPartyDependencies ?? [];
    }
  } else {
    // Fallback: regex import extraction
    await Promise.all(absFiles.map(async (abs, i) => {
      const rel = relFiles[i];
      try {
        const src = await fs.readFile(abs, 'utf-8');
        const raw = extractImportsRegex(src);
        fileMap[rel].imports = raw.filter(r => r.startsWith('.') || r.startsWith('src/'));
        fileMap[rel].thirdParty = raw.filter(r => !r.startsWith('.') && !r.startsWith('/') && !r.startsWith('src/'));
      } catch { /* skip */ }
    }));
  }

  // ── Build reverse-dep (importedBy) index ──────────────────────────────────
  for (const [rel, node] of Object.entries(fileMap)) {
    for (const dep of node.imports) {
      if (fileMap[dep]) {
        if (!fileMap[dep].importedBy.includes(rel)) {
          fileMap[dep].importedBy.push(rel);
        }
      }
    }
  }

  // ── Detect orphans ────────────────────────────────────────────────────────
  for (const node of Object.values(fileMap)) {
    node.isOrphan = node.importedBy.length === 0 && !isEntryPoint(node.id);
  }

  // ── Detect circular deps (DFS) ────────────────────────────────────────────
  const circularDeps: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (id: string, chain: string[]) => {
    if (recStack.has(id)) {
      const cycleStart = chain.indexOf(id);
      if (cycleStart !== -1) circularDeps.push(chain.slice(cycleStart));
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    recStack.add(id);
    for (const dep of fileMap[id]?.imports ?? []) {
      dfs(dep, [...chain, dep]);
    }
    recStack.delete(id);
  };
  for (const id of Object.keys(fileMap)) dfs(id, [id]);

  // Dedupe circular dep cycles (same cycle can be found from multiple start nodes)
  const cycleKeys = new Set<string>();
  const dedupedCircular = circularDeps.filter(cycle => {
    const key = [...cycle].sort().join('|');
    if (cycleKeys.has(key)) return false;
    cycleKeys.add(key);
    return true;
  });

  // ── Extract functions (parallelized, 20 concurrent) ───────────────────────
  const CONCURRENCY = 20;
  const fileEntries = Object.entries(fileMap);
  for (let i = 0; i < fileEntries.length; i += CONCURRENCY) {
    const batch = fileEntries.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ([rel]) => {
      const abs = path.join(projectPath, rel);
      fileMap[rel].functions = await extractFunctions(abs, rel);
    }));
  }

  return {
    projectPath,
    builtAt: Date.now(),
    files: fileMap,
    totalFiles: Object.keys(fileMap).length,
    orphanFiles: Object.values(fileMap).filter(n => n.isOrphan).map(n => n.id),
    circularDeps: dedupedCircular,
  };
}

/** Simple regex import extractor — fallback only. */
function extractImportsRegex(src: string): string[] {
  const results: string[] = [];
  const re = /(?:^|[\n;])(?:import|export)\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) results.push(m[1]);
  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class GraphEngine {
  /** Build (or return cached) full project graph. */
  static async buildGraph(projectPath: string): Promise<ProjectGraph> {
    return getCachedOrBuild(projectPath);
  }

  /** Invalidate cache for a project (call after file writes). */
  static invalidate(projectPath: string): void {
    cache.delete(projectPath);
  }

  /**
   * Blast-radius analysis for a single file.
   * Returns the set of files that would be affected if this file changes.
   */
  static async scoutImpact(projectPath: string, filePath: string): Promise<ImpactResult> {
    const graph = await getCachedOrBuild(projectPath);

    // Normalise to relative
    const rel = filePath.startsWith(projectPath)
      ? path.relative(projectPath, filePath)
      : filePath;

    const node = graph.files[rel];
    if (!node) {
      return {
        targetFile: rel,
        directDependents: [],
        transitiveDependents: [],
        directDependencies: [],
        orphanRisk: true,
        totalImpact: 0,
      };
    }

    // BFS up the importedBy chain for transitive impact — exclude self
    const visited = new Set<string>();
    const queue = [...node.importedBy];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === rel || visited.has(cur)) continue;
      visited.add(cur);
      const parent = graph.files[cur];
      if (parent) queue.push(...parent.importedBy);
    }

    return {
      targetFile: rel,
      directDependents: node.importedBy,
      transitiveDependents: [...visited],
      directDependencies: node.imports,
      orphanRisk: node.isOrphan,
      totalImpact: visited.size,
    };
  }

  /**
   * Find all call sites of a specific function across the project.
   * Returns every file+line where functionName() is called.
   */
  static async getFunctionCallers(
    projectPath: string,
    targetFnName: string
  ): Promise<Array<{ file: string; line: number; callerFn: string | null }>> {
    const { parse, Lang } = await import('@ast-grep/napi');
    const absFiles = await collectSourceFiles(projectPath);
    const callers: Array<{ file: string; line: number; callerFn: string | null }> = [];
    const seen = new Set<string>();

    await Promise.all(absFiles.map(async abs => {
      const rel = path.relative(projectPath, abs);
      try {
        const src = await fs.readFile(abs, 'utf-8');
        const isTsx = abs.endsWith('.tsx') || abs.endsWith('.jsx');
        const lang = isTsx ? Lang.Tsx : Lang.TypeScript;
        const sg = parse(lang, src);
        const root = sg.root();

        // Find all call_expression nodes where the callee matches targetFnName
        let callExprs: any[] = [];
        try { callExprs = root.findAll({ rule: { kind: 'call_expression' } }); }
        catch { return; }

        for (const ce of callExprs) {
          const fn = ce.field('function');
          if (!fn) continue;
          const txt = fn.text();
          // Match direct call `targetFnName(...)` or member call `*.targetFnName(...)`
          if (txt !== targetFnName && !txt.endsWith(`.${targetFnName}`)) continue;

          const line = ce.range().start.line + 1;
          const key = `${rel}:${line}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // Walk up to find which function/method contains this call
          let callerFn: string | null = null;
          let parent = ce.parent();
          while (parent) {
            const kind = parent.kind();
            if (kind === 'method_definition' || kind === 'function_declaration') {
              callerFn = parent.field('name')?.text() ?? null;
              break;
            }
            if (kind === 'variable_declarator') {
              // Only treat as a function if the value is an arrow/function expression
              const valKind = parent.field('value')?.kind() ?? '';
              if (valKind === 'arrow_function' || valKind === 'function' || valKind === 'function_expression') {
                callerFn = parent.field('name')?.text() ?? null;
                break;
              }
              // Otherwise it's just `const x = someCall()` — keep walking up
            }
            parent = parent.parent();
          }

          callers.push({ file: rel, line, callerFn });
        }
      } catch { /* skip unparseable files */ }
    }));

    return callers.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  }

  /**
   * Return a compact serialisable summary of the whole graph.
   */
  static async getGraphSummary(projectPath: string): Promise<{
    totalFiles: number;
    orphanFiles: string[];
    circularDeps: string[][];
    topDependents: Array<{ file: string; dependentCount: number }>;
    topImporters: Array<{ file: string; importCount: number }>;
  }> {
    const graph = await getCachedOrBuild(projectPath);

    const byDependents = Object.values(graph.files)
      .sort((a, b) => b.importedBy.length - a.importedBy.length)
      .slice(0, 10)
      .map(n => ({ file: n.id, dependentCount: n.importedBy.length }));

    const byImporters = Object.values(graph.files)
      .sort((a, b) => b.imports.length - a.imports.length)
      .slice(0, 10)
      .map(n => ({ file: n.id, importCount: n.imports.length }));

    return {
      totalFiles: graph.totalFiles,
      orphanFiles: graph.orphanFiles,
      circularDeps: graph.circularDeps,
      topDependents: byDependents,
      topImporters: byImporters,
    };
  }
}
