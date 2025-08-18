# 💡 Perform CodeQL Analysis

A github action that runs CodeQL analysis on your repository and automatically creates GitHub issues for each security finding.

> ⚠️ **Security Notice**
>
> For most repositories, you should strongly consider using GitHub's official code security tools (such as CodeQL and Dependabot), which are free for public repositories. [Learn more](https://github.com/features/security).

## 🚀 Workflow Overview

- Runs CodeQL analysis on a repository
- Scans for security and quality issues
- Automatically creates a GitHub issue for each new finding
- Attaches the specific SARIF finding data to each issue
- Is reusable and can be called from other workflows

## 🧰 Features

- 🔍 **File Filtering**: Include/exclude files using glob patterns
- 🛡️ **CodeQL Analysis**: Runs CodeQL security analysis
- 📋 **Issue Creation**: Creates a GitHub issue for each finding
- 🔄 **Deduplication**: Prevents duplicate issues using fingerprinting
- 🏷️ **Smart Labeling**: Labels issues with `codeql-finding`

## 📝 Usage

```yaml
name: CodeQL Security Scan

permissions:
  security-events: write
  actions: read
  contents: read
  issues: write

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 1 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run CodeQL Analysis and Create Issues
        uses: pixpilot/github/actions/codeql-scanner@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          languages: javascript
          config-file: .github/codeql/codeql-configuration.yml
          debug: true
```

## ⚙️ Inputs

| Input         | Description                               | Required | Default                |
| ------------- | ----------------------------------------- | -------- | ---------------------- |
| `languages`   | Comma-separated list of languages to scan | No       | javascript,python      |
| `source-root` | Path of the root source code directory    | No       | -                      |
| `ram`         | Memory in MB for CodeQL extractors        | No       | -                      |
| `threads`     | Number of threads for CodeQL extractors   | No       | -                      |
| `debug`       | Enable debugging mode                     | No       | `false`                |
| `config`      | Configuration as YAML string              | No       | -                      |
| `config-file` | Path to CodeQL configuration file         | No       | -                      |
| `qls-profile` | CodeQL QLS profile                        | No       | `security-and-quality` |
| `token`       | GitHub token for creating issues          | Yes      | -                      |

## 🛠️ Development

To modify this action:

1. Edit `src/index.ts`
2. Run `npm run build` to create the bundled `dist/index.js` using esbuild
3. Commit both the source and dist files

## 🏗️ Building

```bash
npm install
npm run build
```

## ⚠️ Disclaimer

This workflow is a community-developed tool and is not affiliated with, endorsed by, or officially supported by GitHub or the CodeQL team. It is provided as-is for public use. This workflow should not be considered an official GitHub or CodeQL product. Use at your own discretion.

## 📄 License

MIT License - see the action.yml file for details.
