
import { Octokit } from '@octokit/rest';

export function createGitHubClient(accessToken: string) {
    return new Octokit({ auth: accessToken });
}

// List repositories
export async function listRepos(octokit: Octokit) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
    });
    return data;
}

// Clone a repo (get contents of root)
export async function getRepoContents(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string = ''
) {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
    });
    return data;
}

// Create a branch
export async function createBranch(
    octokit: Octokit,
    owner: string,
    repo: string,
    branchName: string,
    fromBranch: string = 'main'
) {
    // Get SHA of source branch
    const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
    });

    // Create new branch
    await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
    });
}

// Create a commit
export async function createCommit(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: Array<{ path: string; content: string }>
) {
    // Get current commit SHA
    const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
    });

    // Create blobs for each file
    const blobs = await Promise.all(
        files.map(file =>
            octokit.git.createBlob({
                owner,
                repo,
                content: Buffer.from(file.content).toString('base64'),
                encoding: 'base64',
            })
        )
    );

    // Get base tree
    const { data: baseCommit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: ref.object.sha,
    });

    // Create tree
    const { data: tree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseCommit.tree.sha,
        tree: files.map((file, i) => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobs[i].data.sha,
        })),
    });

    // Create commit
    const { data: commit } = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.sha,
        parents: [ref.object.sha],
    });

    // Update branch reference
    await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.sha,
    });

    return commit;
}

// Create a Pull Request
export async function createPullRequest(
    octokit: Octokit,
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
) {
    const { data } = await octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
    });
    return data;
}
