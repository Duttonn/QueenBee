# 🧠 MEMORY STRATEGY AUDIT (CORTEX BEE)

## 1. 🕵️ Executive Summary: OpenClaw Analysis
OpenClaw implements a highly sophisticated **Hybrid Memory Architecture**. It does not choose between Markdown and Vector DB; it uses **Markdown as the Canonical Source** and **SQLite/Vector as the Retrieval Index**.

### Key Findings from OpenClaw Source:
- **Canonical Source**: `MEMORY.md` (Long-term) and `memory/YYYY-MM-DD.md` (Daily/Short-term).
- **Indexing Engine**: `sqlite-vec` for vector similarity + FTS5 for BM25 (keyword search).
- **Memory Flush**: A "silent turn" triggers when context is 80% full, forcing the agent to write durable notes to disk before they are lost to context compaction.
- **Provider Agnostic**: Supports Gemini, OpenAI, and local embeddings (Gemma).

---

## 2. ⚖️ Verdict: Vector DB vs. Markdown for Code
The Medium article's approach (Pure RAG/Vector) is powerful for "Knowledge Bases" but risky for "Active Engineering".

| Feature | Smart Markdown (Current) | Vector Brain (Article) | **Queen Bee Recommendation** |
| :--- | :--- | :--- | :--- |
| **Precision** | 100% (Deterministic) | ~80% (Probabilistic) | **Hybrid System** |
| **Auditability** | Easy (Human readable) | Hard (Black box index) | **Markdown Source of Truth** |
| **Scalability** | Low (Context explosion) | Infinite | **Vector-Indexed Markdown** |
| **Consistency** | High | Low (Hallucinations) | **Strict Sectioning** |

**Conclusion**: For coding, we cannot rely solely on Vector search. An agent needs to *know* the global rules (System 1) while being able to *search* for historical snippets (System 2).

---

## 3. 🏗️ Recommendation: OPTION C (The Hybrid Hive)

I recommend a **Layered Memory Strategy** that balances isolation and collaboration.

### Layer 1: Working Memory (The Thread)
- **Scope**: Current conversation.
- **Persistence**: Session logs.
- **Isolation**: Strict. Agent B cannot see Agent A's chat.

### Layer 2: Shared Project memory (The Cortex)
- **File**: `MEMORY.md` (Structured Markdown).
- **Content**: Tech stack, Archi decisions, Active blockers.
- **Mechanism**: Auto-injected (Top 50 lines) + `write_memory` tool.

### Layer 3: Archival Memory (The Library)
- **File**: `ARCHIVE.md` + Vector Index (`sqlite-vec`).
- **Content**: Old thread summaries, legacy docs, research findings.
- **Mechanism**: Tool-based search only (`search_memory`).

---

## 4. 🛠️ Implementation Plan (GSD_TASKS)

### Phase 1: Structure & Tooling (Immediate)
- [x] Implement `write_memory` tool (Appends to `MEMORY.md`).
- [ ] Implement `read_memory` tool (Section-aware reading).
- [ ] Define `MEMORY.md` structure: `# Architecture`, `# Conventions`, `# Findings`.

### Phase 2: Vector Indexing (Mid-term)
- [ ] Integrate `sqlite-vec` into `proxy-bridge`.
- [ ] Create an background worker to embed `MEMORY.md` and `ARCHIVE.md`.
- [ ] Add `search_memory(query)` tool for semantic retrieval.

### Phase 3: The "Memory Flush" (Advanced)
- [ ] Implement a context monitor that warns the agent when the session is too long and suggests "archiving" findings to memory.

---

## 5. ☣️ Risk Assessment: Context Pollution
**Scenario**: Agent A (Header) and Agent B (Footer).
- **Risk**: Low if `MEMORY.md` is used for *decisions* and not *logs*.
- **Mitigation**: Instruct agents to only write "Permanent Project Facts" to `MEMORY.md`. Casual updates stay in the Thread.
