# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A VS Code extension called "lookup" that provides a quick-pick file navigator (inspired by Dendron's lookup). Users press `Ctrl+L` to open a fuzzy file finder that supports tab-completion through path segments and can create new files if they don't exist.

## Commands

- `npm run compile` — Build TypeScript to `out/`
- `npm run watch` — Build in watch mode
- `npm run lint` — Run ESLint on `src/`
- `npm run test` — Run tests (compiles first via `pretest`)
- `npm run vscode:package` — Package into `dist/filelookup.vsix`
- `npm run vscode:deploy:local` — Package and install locally in VS Code

## Architecture

Single-file extension (`src/extension.ts`) with all logic in one module:

- **`activate()`** — Registers three commands: `filelookup.showPrompt`, `filelookup.autocomplete`, `filelookup.autocompleteBackwards`. Maintains shared mutable `state` object across commands.
- **`showPrompt()`** — Creates a `vscode.QuickPick` that uses `vscode.workspace.findFiles()` for glob-based matching as the user types. Tracks path suffixes for tab-completion cycling. Returns the selected item (open existing or create new file).
- **Autocomplete commands** — Cycle through collected suffixes (forward/backward) by mutating `state.suffixes` and updating `quickPick.value`. Only active when context key `filelookup.isQuickPickOpen` is true.
- **`LookupQuickPickItem`** — Extended QuickPickItem with `action` ("create" | "open") and `uri` fields.

The extension entry point is `out/extension.js`. Tests use `@vscode/test-cli` with Mocha and run against `out/test/**/*.test.js`.
