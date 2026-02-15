# Worktree Analysis Report

## Overview
This document tracks the analysis of each worktree in `/Users/ndn18/PersonalProjects/QueenBee/worktrees` to identify which ones contain unique features not yet merged into main.

## Main Branch Status
- Current commit: `afccf30 no dock icon for server`
- Total TypeScript files in proxy-bridge/src: 172 files
- Key modules: AgentSession.ts, AutonomousRunner.ts, ToolExecutor.ts, EventLoopManager.ts, etc.

---

## ANALYSIS COMPLETE

### WORKTREES TO DELETE (Fully Merged into Main)

| Worktree | Last Commit | Status |
|----------|-------------|--------|
| finish-backend-tasks | 51b9dda | ✅ MERGED |
| s-03-soudure | 2aa0773 | ✅ MERGED |
| s-08-soudure | 60f0957 | ✅ MERGED |
| s-03-soudure-v2 | 2aa0773 | ✅ MERGED |
| webapp | 755a701 | ✅ MERGED |
| test-branch | d6896c2 | ✅ MERGED |
| fix-card-parsing | 745f2e4 | ✅ MERGED |
| worker-feat-01-1770762225563 | 24fa294 | ✅ MERGED |
| worker-feat-02-1770762227866 | 24fa294 | ✅ MERGED |
| worker-logic-bee-* (all) | 24fa294 | ✅ MERGED |
| worker-ui-bee-* (all) | 24fa294 | ✅ MERGED |
| worker-req-* (all) | 24fa294 | ✅ MERGED |

---

### WORKTREES NEEDING MERGE (Not in Main)

#### Phase Worktrees (p1-xx, p2-xx, p3-xx, p4-xx)

| Worktree | Commit | Feature | Priority |
|----------|--------|---------|----------|
| p1-01 | 3526144 | S-07: ToolExecutor error propagation to UI | HIGH |
| p1-02 | 98584c9 | Memory Flush / Session Summary | HIGH |
| p1-03 | d2b3d23 | Diff Viewer with split-pane view | HIGH |
| p1-05 | d884269 | SSE streaming integration | MEDIUM |
| p1-01-v2 | 626a4d7 | Optimized Streaming UI | MEDIUM |
| p1-02-soudure | f8f50a4 | Memory Flush variant | MEDIUM |
| p2-01 | 97029b9 | NativeService fallbacks, Tool Approval | HIGH |
| p2-02 | 6fa826b | RepoClonerService with branch support | HIGH |
| p2-03 | cadc76b | CloudFSManager jailed workspaces | HIGH |
| p3-01 | 1948c99 | Recursive ProjectTaskManager | HIGH |
| p4-09 | b4231db | API endpoint port 3001 | LOW |

#### Session Worktrees (s-xx)

| Worktree | Commit | Feature | Priority |
|----------|--------|---------|----------|
| s-01 | 93f7ad3 | chatStream() AsyncGenerator | HIGH |
| s-02 | 1cbd116 | GSD v3 rewrite | MEDIUM |
| s-03 | 2a4025b | SSE streaming reconnection | MEDIUM |
| s-04 | ea93f34 | API_BASE port 3000 unification | MEDIUM |
| s-05 | bec4243 | Secure ToolExecutor | HIGH |
| (server-side) s-06 | b4e845b | Paths.ts migration | HIGH |
| s-07 | baf9dfc | ToolExecutor error propagation | HIGH |
| s-08-v2 | a308b8e | FileWatcher loop repair | HIGH |
| s-09 | 4901185 | Prevent duplicate projects | LOW |
| s-10 | 39d6efc | Gemini model enforcement | LOW |

#### Soudure Worktrees (Integration Fixes)

| Worktree | Commit | Feature | Priority |
|----------|--------|---------|----------|
| s-02-soudure | 6c5fbab | SSE streaming /api/chat | HIGH |
| s-04-soudure | 0c45f8b | API_BASE port 3000 | MEDIUM |
| s-05-soudure | 951385f | ToolExecutor server-side only | HIGH |
| s-06-soudure | 7fde15f | Hardcoded path removal | HIGH |
| s-02-soudure-v2 | 6c5fbab | SSE streaming (v2) | HIGH |
| s-04-v2 | 3a49a23 | GSD normalization | LOW |
| s-05-soudure-02 | 398f65e | ToolExecutor security | HIGH |
| s-06-soudure-v2 | ff14cd0 | Paths.ts v2 | HIGH |
| s-07-soudure | 01d975f | Gemini model enforcement | LOW |

#### Project/Feature Worktrees

| Worktree | Commit | Feature | Priority |
|----------|--------|---------|----------|
| cloud-migration | 3538ff4 | Cloud SaaS, server-side cloning | HIGH |
| fix-gemini-discovery | bda4af3 | Dynamic model discovery | HIGH |

#### Note: Users/ndn18 is NOT a worktree (empty directory)

---

## Summary

### Worktrees to DELETE (Already Merged): 14
- finish-backend-tasks, s-03-soudure, s-08-soudure, s-03-soudure-v2, s-07-soudure, webapp, test-branch, fix-card-parsing, and all worker-* worktrees

### Worktrees to MERGE: 27+
- See tables above for detailed list

### Priority Recommendations

**HIGH PRIORITY (Core Features):**
1. p1-02 (Memory Flush) - Important session management
2. p2-02 (RepoClonerService) - Core cloning functionality  
3. p2-03 (CloudFSManager) - Security/isolation
4. p3-01 (ProjectTaskManager) - Core task management
5. s-01 (chatStream) - Streaming infrastructure
6. s-05, s-05-soudure (ToolExecutor security) - Critical
7. cloud-migration - Cloud features
8. fix-gemini-discovery - Model discovery
9. s-06, s-06-soudure (Paths.ts) - Path consistency
10. s-07 (error propagation) - UX/error handling

**MEDIUM PRIORITY:**
- p1-01, p1-03, p1-05 (UI/streaming)
- s-02, s-03, s-04 (various integrations)

**LOW PRIORITY:**
- s-09, s-10, p4-09 (minor fixes)
- v2 variants (may be duplicates)

