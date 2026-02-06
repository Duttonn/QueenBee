# Codex "Universal Auth" Component Research

## Core Observation
Clawdbot uses a modular `applyAuthChoice` system. The logic is split between:
1. **API Key Providers:** Handled via `auth-choice.apply.api-providers.js` and `auth-choice.api-key.js`.
2. **OAuth Providers:** Uses `createVpsAwareOAuthHandlers` and `oauth-flow.js` (essential for your VPS setup).
3. **Local/Plugin Providers:** Handled via `auth-choice.apply.plugin-provider.js`.

## Code Integration Plan for Codex Clone

### 1. The Adapter Pattern
We will use a central `ModelProviderAdapter` that mimics Clawdbot's `provider-dispatcher.js`.

### 2. Multi-Auth Support
- **Cloud Models:** Header-based switching (already in `chat.ts`).
- **Local (Ollama/LM Studio):** Direct endpoint configuration.
- **Enterprise (Dassault):** We'll implement a custom adapter that uses your `continue` or `codex-cli` credentials found at `~/.codex/auth.json` (detected in `applyAuthChoiceOpenAI`).

### 3. VPS-Aware Auth
The `createVpsAwareOAuthHandlers` logic is what we'll clone for the UI. It allows:
- Generating the URL.
- Detection of remote environment.
- Prompting for the manual paste of the redirect URL.

## Implementation Status
- [x] Initial ProxyBridge router.
- [ ] Implement `CredentialStore.ts` (Mirroring Clawdbot's `auth-profiles.js`).
- [ ] Add `VPS-Auth-Flow` to the Global Orchestrator UI.
