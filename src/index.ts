import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'

main().catch((err: Error) => {
  core.setFailed(err.message)
})

/**
 * Submit VPAT content to the docs site as a pull request.
 */

async function main() {
  const baseBranch = getRequiredInput('docs-site-base-branch')
  const docsSiteToken = getRequiredInput('docs-site-github-token')
  const [owner, repo] = getRequiredInput('docs-site-repository').split('/')
  const targetDirectory = getRequiredInput('docs-site-vpat-directory')
  const productId = getRequiredInput('product-id')
  const vpatContent = getRequiredInput('vpat-content')

  const headBranch = `publish-vpat-${productId}`
  const targetVpatPath = `${targetDirectory}/${productId}.html`
  
  const octokit = getOctokit(docsSiteToken)
  
  // Ensure head branch exists
  await prepareHeadBranch(headBranch)

  // Create/update VPAT file
  const fileSha = await getFileSha()
  await commitFileContent(fileSha)

  // Create pull request
  await createPullRequest()

  /**
   * Make sure the head branch exists. Create it if necessary.
   * 
   * @param branch Name of the head branch to check for.
   * @returns SHA of the head branch.
   */

  async function prepareHeadBranch(branch = headBranch): Promise<string> {
    try {
      core.info(`Checking for branch: ${branch}`)
      const response = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      })
      core.info(`Branch exists: ${branch}`)
      core.info(`SHA: ${response.data.object.sha}`)
      return response.data.object.sha
    } catch (err) {
      core.info(`Branch does not exist: ${branch}`)
      core.info(`Creating branch: ${branch}`)
      try {
        const response = await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: context.sha,
        })
        core.info(`Branch created: ${branch}`)
        core.info(`SHA: ${response.data.object.sha}`)
        return response.data.object.sha
      } catch (err) {
        throw err
      }
    }
  }

  /**
   * Get the SHA of the VPAT report file in the head branch.
   * 
   * @returns SHA of the file, if it exists.
   */

  async function getFileSha(): Promise<string | undefined> {
    try {
      core.info(`Checking for file: ${targetVpatPath}`)
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: targetVpatPath,
        ref: headBranch,
      })
      core.info(`File exists: ${targetVpatPath}`)
      // @ts-ignore
      core.info(`SHA: ${response.data.sha}`)
      // @ts-ignore
      return response.data.sha
    } catch (err) {
      core.info(`Branch does not exist: ${headBranch}`)
      return undefined
    }
  }

  /**
   * Commit the VPAT report to the head branch.
   * Update the file if it already exists, otherwise create it.
   * 
   * If the file already exists, the SHA is required to perform the API request.
   * 
   * @param sha SHA of the file, if it exists.
   */

  async function commitFileContent(sha?: string) {
    try {
      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: targetVpatPath,
        branch: headBranch,
        sha,
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
  }

  /**
   * Create a pull request merging the head branch into the base branch.
   */

  async function createPullRequest() {
    try {
      const pullRequestResponse = await octokit.rest.pulls.create({
        owner,
        repo,
        title: `Update VPAT for ${productId}`,
        head: headBranch,
        base: baseBranch,
        body: `This PR updates the VPAT for ${productId}.`,
      })
      core.info(`Created pull request ${pullRequestResponse.data.number}`)
    } catch (err) {
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
