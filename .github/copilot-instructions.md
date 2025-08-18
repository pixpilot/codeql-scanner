# Copilot Instructions

## Testing

This project uses vitest for testing.

- **Mocking:** Always use 'vi.mocked' mocking when mocking in tests.

# File Naming Conventions

## JavaScript/TypeScript

- **File Naming:** Use kebab-case for almost all files, including those whose main export is a PascalCase class.
  - Example: `my-module.ts`, `helper-functions.js`, `data-handler.js`

- **Config files:** Use kebab-case unless the framework or library has a different standard—follow the convention for that tool.
  - Example: `tsconfig.json`, `rollup.config.js`
