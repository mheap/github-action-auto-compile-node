# Auto Compile Node

This action will take any Node.js action, compile and package it in to a single
file so that it can be executed using the `node12` runtime in GitHub Actions.

It is intended to be triggered when a release is published, and will update the
tag of the release when it finishes running.

The action:

* Runs `npm install`
* Compiles the code using [ncc](https://github.com/zeit/ncc)
* Rewrites `action.yml`, setting the runtime to `node12` and the `main` entry to `index.dist.js`
* Commits these changes and updates the tag to point at the new commit

At this point, any consumers may point at the tag and their actions will run
much faster than pointing at `master`

# Usage

```yaml
name: Auto-Compile
on: 
  release:
    types: [published]
jobs:
  compile:
    runs-on: ubuntu-16.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Automatically build action
        uses: mheap/github-action-auto-compile-node@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

# Options

```yaml
- uses: mheap/github-action-auto-compile-node@master
  with:
    # Define a custom entrypoint for your action. Defaults to "index.js"
    main: lib/index.js
```
