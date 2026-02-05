import { Socket } from 'socket.io';
import { exec } from 'child_process';

/**
 * IDESyncHook: Synchronizes the agent's context with your local IDE (VSCode/Xcode).
 * Allows 'Auto Context' where the agent knows which file you are currently editing.
 */
export class IDESyncHook {
  private socket: Socket;
  private currentFile: string | null = null;
  private isPolling: boolean = false;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupListeners();
    this.startPolling();
  }

  private setupListeners() {
    /**
     * Event from the Mac Electron App (Accessibility API) 
     * or a VSCode Extension telling us the focused file.
     */
    this.socket.on('IDE_FOCUS_CHANGE', (data: { filePath: string, line?: number }) => {
      this.handleFocusChange(data.filePath, data.line);
    });
  }

  private handleFocusChange(filePath: string, line?: number) {
    if (this.currentFile === filePath) return;
    
    console.log(`[IDESync] Focus shifted to: ${filePath}`);
    this.currentFile = filePath;
    
    // Broadcast to the project's agentic loop
    this.socket.emit('UI_UPDATE', {
      action: 'UPDATE_AUTO_CONTEXT',
      payload: { filePath, line }
    });
  }

  private startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;

    // Detect if we are on Darwin (macOS) before polling
    if (process.platform !== 'darwin') {
      console.log('[IDESync] Non-macOS platform detected. Native accessibility polling disabled.');
      return;
    }

    console.log('[IDESync] Starting macOS accessibility polling...');
    setInterval(() => {
      this.detectActiveFile();
    }, 3000); // Check every 3 seconds
  }

  private detectActiveFile() {
    // AppleScript that tries to get the path from Xcode or window name from Code
    // We use a simplified script to avoid complex escaping issues in exec
    const script = `
      if application "Xcode" is running then
        tell application "Xcode"
          try
            set xPath to path of source document 1 of window 1
            return "XCODE:" & xPath
          end try
        end tell
      end if
      
      if application "Visual Studio Code" is running then
        tell application "System Events"
          try
            set winName to name of window 1 of process "Code"
            return "VSCODE:" & winName
          end try
        end tell
      end if
      
      return "IDLE"
    `;

    // Clean up the script for shell execution
    const singleLineScript = script.replace(/\n/g, ' ').replace(/"/g, '\\"');

    exec(`osascript -e "${singleLineScript}"`, (error, stdout) => {
      if (error) return;
      
      const output = stdout.trim();
      if (output === 'IDLE' || !output) return;

      if (output.startsWith('XCODE:')) {
        const filePath = output.substring(6);
        this.handleFocusChange(filePath);
      } else if (output.startsWith('VSCODE:')) {
        const windowName = output.substring(7);
        // VSCode window names are typically "file.ts — project"
        // We can't get full path easily without extension, but we send the name
        // which helps identifying the active file
        this.handleFocusChange(windowName);
      }
    });
  }

  getCurrentContext() {
    return this.currentFile;
  }
}
