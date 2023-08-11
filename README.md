# action-vpat-publish

*Publish a VPAT report to the docs site*

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

      - name: Publish VPAT to docs site
        uses: dequelabs/action-vpat-publish@main
        with:
          docs-site-github-token: ${{ secrets.DOCS_SITE_GITHUB_TOKEN }}
          docs-site-repository: dequelabs/<docs-site-repo>
          product-id: my-product
          vpat-content: ${{ steps.convert.outputs.stringified-html }}
```

## Inputs

| Name | Description | Default |
| --- | --- | --- |
`docs-site-base-branch` | The base branch of the docs-site repository. | `master` |
`docs-site-github-token` | GitHub token to access the docs-site repository. |
`docs-site-repository` | GitHub repository containing the docs-site. |
`docs-site-vpat-directory` | Directory where the VPAT should be published in the docs-site repository. | `static/vpats`
`product-id` | Brief token that identifies your product. This should match the product ID used by the docs site. |

## Developer notes

* The compiled `dist/` directory is committed to the `main` branch by running `npm run build` locally and committing the changes. The pre-commit hook should do this for you.
