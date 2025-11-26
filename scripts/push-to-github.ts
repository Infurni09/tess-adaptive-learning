// GitHub Integration - Push to Repository
import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function main() {
  try {
    console.log('Connecting to GitHub...');
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user info
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    const repoName = 'tess-adaptive-learning';
    const repoDescription = 'TESS - Targeted Educational Support System. An adaptive learning platform for DECA/FBLA business education competitions.';
    
    // Check if repo already exists
    let repoExists = false;
    try {
      await octokit.repos.get({
        owner: user.login,
        repo: repoName,
      });
      repoExists = true;
      console.log(`Repository ${repoName} already exists.`);
    } catch (e: any) {
      if (e.status !== 404) {
        throw e;
      }
    }
    
    // Create repo if it doesn't exist
    if (!repoExists) {
      console.log(`Creating repository: ${repoName}...`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: repoDescription,
        private: false,
        auto_init: false,
      });
      console.log(`Repository created: https://github.com/${user.login}/${repoName}`);
    }
    
    console.log('\n===========================================');
    console.log('Repository is ready!');
    console.log(`URL: https://github.com/${user.login}/${repoName}`);
    console.log('\nTo push your code, run these commands:');
    console.log('-------------------------------------------');
    console.log(`git remote add github https://github.com/${user.login}/${repoName}.git`);
    console.log('git push github main');
    console.log('===========================================\n');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
