# Multi-Model Auth Gateway (Codex Clone)

## Goal
A unified login interface where Natao can authenticate once and access all configured models (Claude, Gemini, Kimi, etc.) via the same interface.

## Features
1. **Dynamic Provider Discovery:** Read available providers and profiles from `clawdbot.json`.
2. **OAuth & Token Persistence:** Leverage Clawdbot's existing Auth Plugin architecture to manage session tokens.
3. **Session Interoperability:** Ensure that a session started in the Dashboard can be transferred to a sub-agent or vice-versa.
4. **Token Cost Monitoring:** Real-time credit/token usage display for each authenticated provider (NVIDIA, Google, etc.).

## Components to Build
- `ModelSelector`: A UI component to switch between active model backends.
- `AuthCard`: Displays connection status for each provider (Green = Connected, Red = Expired).
- `ProxyBridge`: A lightweight Node.js proxy that routes Dashboard requests to the correct LLM backend based on the selected profile.

## 🏠 Hybrid & Corporate Model Integration
The gateway will support:
1. **Local Models (Offline):** Integration via **Ollama** or **vLLM** (running on local machine or VPS). Use 'OpenAI-compatible' provider configuration.
2. **Corporate/Private APIs:** Dynamic headers support for custom enterprise authentication (Azure, AWS Bedrock, etc.).
3. **Bring-Your-Own-Endpoint:** A 'Custom Provider' card where Natao can paste a URL and an API key to instantly onboard a private model.
