# filelookup

A VS Code extension that provides a quick-pick file navigator with segment-based autocomplete. Open a fuzzy file finder, tab-complete through path segments, and create new files on the fly.

Inspired by the lookup feature in [Dendron](https://wiki.dendron.so/), which is no longer maintained.

## Usage

Press `Ctrl+L` to open the lookup prompt. Start typing to filter files in your workspace. If no exact match exists, you can create the file directly from the prompt.

While the prompt is open, press `Tab` to autocomplete the next path segment and cycle forward through suggestions. Press `Shift+Tab` to cycle backward.

## Keybindings

| Keybinding  | Command               | When                      |
| ----------- | --------------------- | ------------------------- |
| `Ctrl+L`    | Open lookup prompt    | Always                    |
| `Tab`       | Autocomplete forward  | filelookup prompt is open |
| `Shift+Tab` | Autocomplete backward | filelookup prompt is open |

## Configuration

| Setting                 | Type       | Default      | Description                                               |
| ----------------------- | ---------- | ------------ | --------------------------------------------------------- |
| `filelookup.separators` | `string[]` | `[".", "/"]` | Characters treated as segment boundaries for autocomplete |

Separators determine where path segments begin and end. For example, with the default `[".", "/"]`, both `daily.2026.01.md` and `src/components/Button.tsx` are split at each `.` and `/` for tab-completion.

To use a different convention (e.g. hyphen-separated notes), configure:

```json
{
  "filelookup.separators": ["-", "."]
}
```
