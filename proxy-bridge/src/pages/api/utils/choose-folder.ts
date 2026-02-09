import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only support macOS for now as per user OS
  if (os.platform() !== 'darwin') {
    return res.status(400).json({ error: 'Native picker only supported on macOS' });
  }

  try {
    // AppleScript to open a folder picker
    const { stdout, stderr } = await execAsync("osascript -e 'POSIX path of (choose folder)'");
    
    if (stderr) {
      console.error('[ChooseFolder] AppleScript Error:', stderr);
      return res.status(500).json({ error: 'Failed to open picker' });
    }

    const chosenPath = stdout.trim();
    if (!chosenPath) {
      return res.status(200).json({ canceled: true });
    }

    return res.status(200).json({ path: chosenPath });
  } catch (error: any) {
    // If user cancels, osascript might return error
    if (error.message?.includes('User canceled')) {
      return res.status(200).json({ canceled: true });
    }
    console.error('[ChooseFolder] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
