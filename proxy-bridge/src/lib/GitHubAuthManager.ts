import { execSync } from 'child_process';

/**
 * GitHubAuthManager: Handles environment-aware authentication.
 */
export class GitHubAuthManager {
  
  async initiateLogin(isRemote: boolean) {
    if (isRemote) {
      console.log('[Auth] Remote environment detected. Starting Device Flow...');
      // Triggers the copy-paste code flow
      return {
        type: 'DEVICE_FLOW',
        instructions: 'Run "gh auth login" on the VPS or follow the URL below.',
        url: 'https://github.com/login/device'
      };
    } else {
      console.log('[Auth] Native environment detected. Starting standard OAuth...');
      return {
        type: 'OAUTH_FLOW',
        url: 'https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID'
      };
    }
  }
}
