import * as core from '@actions/core'
import { getOctokit } from '@actions/github'

main().catch((err: Error) => {
  core.setFailed(err.message)
})

/**
 * Submit VPAT content to the target repo as a pull request.
 */

async function main() {
  const baseBranch = getRequiredInput('target-repo-base-branch')
  const targetRepoToken = getRequiredInput('target-repo-github-token')
  const [owner, repo] = getRequiredInput('target-repo').split('/')
  const targetDirectory = getRequiredInput('target-repo-vpat-directory')
  const productId = getRequiredInput('product-id')
  const vpatContent = getRequiredInput('vpat-content')

  const headBranch = `publish-vpat-${productId}`
  const targetVpatPath = `${targetDirectory}/${productId}.html`
  
  const octokit = getOctokit(targetRepoToken)

  /**
   * Get the SHA of the base branch.
   */

  core.info(`Getting SHA for base branch "${baseBranch}"...`)
  let baseBranchSha: string
  try {
    const response = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    })
    core.info(`Base branch "${baseBranch}" exists with SHA ${response.data.object.sha}`)
    baseBranchSha = response.data.object.sha
  } catch (err) {
    throw err
  }
  
  /**
   * Make sure the head branch exists. Create it if necessary.
   */

  core.info(`Checking for head branch "${headBranch}"...`)
  try {
    const response = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${headBranch}`,
    })
    core.info(`Branch "${headBranch}" exists with SHA ${response.data.object.sha}`)
  } catch (err) {
    core.info(`Branch "${headBranch}" does not exist. Creating it...`)
    try {
      const response = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${headBranch}`,
        sha: baseBranchSha,
      })
      core.info(`Branch "${headBranch}" created with SHA ${response.data.object.sha}`)
    } catch (err) {
      throw err
    }
  }

  /**
   * The SHA of the VPAT file, if it exists.
   * 
   * If the file already exists on the head branch, its SHA is required to perform the API request that updates the file.
   */
  
  core.info(`Checking for file "${targetVpatPath}"...`)
  let fileSha: string | undefined
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: targetVpatPath,
      ref: headBranch,
    })
    // @ts-ignore
    core.info(`File "${targetVpatPath}" exists with SHA ${response.data.sha}`)
    // @ts-ignore
    fileSha = response.data.sha
  } catch (err) {
    core.info(`File "${targetVpatPath}" does not exist`)
  }
  
  /**
   * Commit the VPAT report to the head branch.
   * 
   * Update the file if it already exists, otherwise create it.
   */

  if (fileSha === undefined) {
    core.info(`Creating file "${targetVpatPath}" on branch "${headBranch}"`)
  } else {
    core.info(`Updating file "${targetVpatPath}" on branch "${headBranch}"`)
  }
  try {
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: targetVpatPath,
      branch: headBranch,
      sha: fileSha,
      message: `chore: update vpat for ${productId}`,
      content: Buffer.from(vpatContent).toString('base64'),
      committer: {
        name: 'deque-docs',
        email: 'deque-docs@github.com',
      },
    })
    core.info(`Created commit ${response.data.commit.sha}`)
  } catch (err) {
    throw err
  }

  /**
   * Create a pull request to merge the head branch into the base branch.
   * 
   * Will skip if a pull request already exists.
   */

  core.info(`Creating pull request to merge "${headBranch}" into "${baseBranch}"...`)
  try {
    const pullRequestResponse = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `Update VPAT for ${productId}`,
      head: headBranch,
      base: baseBranch,
      body: `This PR updates the VPAT for ${productId}.`,
    })
    core.info(`Created pull request #${pullRequestResponse.data.number}`)
  } catch (err) {
    console.log(err)
    if ((err as Error).message === `A pull request already exists for ${owner}:${headBranch}.`) {
      core.info(`Pull request already exists. Skipping.`)
    } else {
      throw err
    }
  }
}

/**
 * Get the value of a required input.
 * 
 * @param name Name of input to get.
 * @returns Value of input.
 */

function getRequiredInput(name: string): string {
  const value = core.getInput(name, { required: true })
  if (value === '') {
    throw new Error(`Input ${name} is required`)
  }
  return value
}
