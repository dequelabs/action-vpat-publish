# action-vpat-publish

*GitHub Action that publishes a VPAT report to a target repository*

## Example workflow

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'vpats/*'

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout my product repo
        uses: actions/checkout@v3

      - name: Convert most recent VPAT to HTML
        uses: dequelabs/action-vpat-to-html@main
        id: convert
        with:
          product-name: 'My Product'
          vpat-location: vpats

      - name: Publish VPAT to target repository
        uses: dequelabs/action-vpat-publish@main
        with:
          target-repo-github-token: ${{ secrets.TARGET_REPO_GITHUB_TOKEN }}
          target-repo: <org-name>/<repo-name> # Update to your target repo
          product-id: my-product
          vpat-content: ${{ steps.convert.outputs.stringified-html }}
```

## Inputs

| Name | Description | Default |
| --- | --- | --- |
`target-repo-base-branch` | The base branch of the target repository. | `master` |
`target-repo-github-token` | GitHub token to access the target repository. |
`target-repo` | The GitHub repository to which the VPAT should be published. |
`target-repo-vpat-directory` | Directory where the VPAT should be published in the target repository. | `static/vpats`
`product-id` | Brief token that identifies your product. If publishing to the docs site, this should match the product ID used there. |
`vpat-content` | The VPAT content to publish. |

## Developer notes

* The compiled `dist/` directory is committed to the `main` branch by running `yarn build` locally and committing the changes. The pre-commit hook should do this for you.
