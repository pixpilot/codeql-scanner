# �️ CodeQL Scanner Action

A comprehensive GitHub Action that performs CodeQL security analysis on your repository and automatically creates GitHub issues for each security finding with intelligent deduplication.

> ⚠️ **Security Notice**
>
> For most repositories, you should strongly consider using GitHub's official code security tools (such as CodeQL and Dependabot), which are free for public repositories. [Learn more](https://github.com/features/security).

## 🚀 How It Works

1. **🔧 Setup**: Automatically installs and configures CodeQL CLI
2. **📂 File Filtering**: Applies configurable include/exclude patterns to source files
3. **🗄️ Database Creation**: Builds CodeQL analysis database from filtered code
4. **🔍 Analysis**: Runs CodeQL security and quality queries
5. **📋 Issue Creation**: Creates individual GitHub issues for each finding
6. **🔄 Deduplication**: Prevents duplicate issues using intelligent fingerprinting
7. **🏷️ Organization**: Labels all issues with `codeql-finding` for easy management

## 🧰 Features

- 🎯 **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C#, C++, Go
- � **Auto-Installation**: Downloads and configures CodeQL CLI automatically if needed
- 📂 **Smart File Filtering**: Include/exclude files using powerful glob patterns
- ⚙️ **Configurable Analysis**: Support for CodeQL configuration files and QLS profiles
- 🛡️ **Comprehensive Scanning**: Runs security and quality analysis queries
- 📋 **Automated Issues**: Creates detailed GitHub issues for each finding
- 🔄 **Intelligent Deduplication**: Prevents duplicate issues using content fingerprinting
- 🏷️ **Smart Organization**: Auto-labels issues with `codeql-finding` tag
- 📊 **SARIF Integration**: Full SARIF format support for detailed result reporting
- 🔒 **Enterprise Ready**: Works with GitHub Enterprise and custom CodeQL configurations

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
        uses: pixpilot/codeql-scanner@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          languages: javascript
          config-file: .github/codeql/codeql-config.yml
          debug: true
```

## 🔧 Configuration

### Basic Configuration

The action accepts configuration through input parameters or a configuration file.

**Example configuration file** (.github/codeql/codeql-config.yml):

- Configure query filters to exclude notes and include security tags
- Specify paths to include and exclude from analysis
- Define custom query sets for analysis

### Advanced Usage with Matrix Strategy

For multi-language repositories, use a matrix strategy in your workflow file to analyze multiple languages.

### Supported Languages

| Language   | CodeQL Identifier |
| ---------- | ----------------- |
| JavaScript | javascript        |
| TypeScript | javascript        |
| Python     | python            |
| Java       | java              |
| C#         | csharp            |
| C/C++      | cpp               |
| Go         | go                |

## ⚙️ Inputs

| Input         | Description                               | Required | Default                |
| ------------- | ----------------------------------------- | -------- | ---------------------- |
| `languages`   | Comma-separated list of languages to scan | No       | `javascript`           |
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
