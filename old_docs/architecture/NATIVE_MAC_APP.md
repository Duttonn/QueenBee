# Queen Bee: Native macOS Integration (Electron)

## 1. The Strategy
To achieve the true "Apple Aesthetic" and system-level features mentioned in the OpenAI specs (like Seatbelt sandboxing and global hotkeys), we are wrapping the React dashboard in an **Electron** shell.

## 2. Native Capabilities
- **Title Bar:** Using `hiddenInset` to blend the UI with the macOS system chrome.
- **Auto Context:** Access to the macOS Accessibility API to detect which file is open in Xcode/VSCode on your Mac.
- **Global Hotkeys:** Cmd+K (Queen Bee) and Cmd+J (Terminal) work even when the app is in the background.
- **Push-to-Talk:** System-level microphone access for Whisper transcription.

## 3. Architecture Change
- **Backend:** The ProxyBridge remains on the VPS (Linux) for high-performance agent execution.
- **Frontend:** The Mac App (Electron) connects to the VPS via secure WebSockets.
- **Hybrid Sandbox:** Local execution uses macOS Seatbelt (`sandbox-exec`), while remote execution uses the Linux GSD Sandbox.

## 4. Build Process
Run `npm run electron:build` to generate the `.dmg` for your Mac.
