# Queen Bee: Security Audit Agent (Shield Mode)

## 1. Objective
Protect Natao's private infrastructure (Dassault, NVIDIA, Google) from accidental leakage into public repositories.

## 2. Shield Protocols
- **Pre-Commit Scan:** Every autonomous commit triggered by the Hive is first audited by the Security Agent.
- **Leak Detection:** Scans for high-entropy strings, known API key prefixes, and Dassault session tokens.
- **Auto-Block:** If a leak is detected, the commit is aborted, and an URGENT finding is deposited in the Triage Inbox.

## 3. Integration
The `SecurityAuditAgent` is called by the `HiveOrchestrator` before any `git push` operation.
