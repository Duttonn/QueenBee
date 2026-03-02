import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * GET /api/utils/choose-folder
 *
 * Opens the native OS folder picker on the server machine (works when the
 * proxy-bridge is running locally) and returns the chosen path.
 *
 * Platform support:
 *   macOS   — osascript AppleScript
 *   Windows — PowerShell Shell.Application BrowseForFolder
 *   Linux   — zenity (GNOME), kdialog (KDE), or dialog (TTY fallback)
 *
 * Response:
 *   { path: string }         — user picked a folder
 *   { canceled: true }       — user dismissed the dialog
 *   { error: string }        — picker not available or failed
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const platform = os.platform();

  try {
    let chosenPath: string | null = null;

    if (platform === 'darwin') {
      // macOS: use AppleScript
      const { stdout, stderr } = await execAsync(
        "osascript -e 'POSIX path of (choose folder with prompt \"Select project folder\")'",
        { timeout: 60_000 }
      );
      if (stderr?.trim()) {
        console.warn('[ChooseFolder] osascript stderr:', stderr.trim());
      }
      chosenPath = stdout.trim() || null;

    } else if (platform === 'win32') {
      // Windows: use PowerShell COM Shell.Application
      const ps =
        `Add-Type -AssemblyName System.Windows.Forms; ` +
        `$d = New-Object System.Windows.Forms.FolderBrowserDialog; ` +
        `$d.Description = 'Select project folder'; ` +
        `$d.ShowNewFolderButton = $true; ` +
        `if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }`;

      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${ps}"`,
        { timeout: 60_000 }
      );
      chosenPath = stdout.trim() || null;

    } else {
      // Linux: try zenity → kdialog → fallback error
      const hasZenity = await commandExists('zenity');
      const hasKdialog = await commandExists('kdialog');

      if (hasZenity) {
        const { stdout } = await execAsync(
          'zenity --file-selection --directory --title="Select project folder"',
          { timeout: 60_000 }
        );
        chosenPath = stdout.trim() || null;
      } else if (hasKdialog) {
        const { stdout } = await execAsync(
          'kdialog --getexistingdirectory "$HOME" --title "Select project folder"',
          { timeout: 60_000 }
        );
        chosenPath = stdout.trim() || null;
      } else {
        return res.status(400).json({
          error: 'No GUI folder picker available. Install zenity (GNOME) or kdialog (KDE), or enter the path manually.'
        });
      }
    }

    if (!chosenPath) {
      return res.status(200).json({ canceled: true });
    }

    // Strip trailing slash for consistency (except root "/")
    const normalized = chosenPath.length > 1 ? chosenPath.replace(/\/$/, '') : chosenPath;
    return res.status(200).json({ path: normalized });

  } catch (err: any) {
    // User canceled: osascript exits with code 1 + "User canceled" message
    //                zenity exits with code 1 (no output) on cancel
    //                PowerShell returns empty string on cancel (handled above)
    const msg: string = err?.message || '';
    if (
      msg.includes('User canceled') ||
      msg.includes('user cancelled') ||
      (err?.code === 1 && !msg.includes('not found'))
    ) {
      return res.status(200).json({ canceled: true });
    }

    console.error('[ChooseFolder] Error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${cmd}`, { timeout: 2_000 });
    return true;
  } catch {
    return false;
  }
}
