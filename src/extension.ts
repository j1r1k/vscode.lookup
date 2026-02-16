import { access, writeFile } from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import {
  LookupQuickPickItem,
  buildSearchPattern,
  extractSuffix,
  makeCreateItem,
  rotateSuffixes,
  rotateSuffixesBackward,
} from "./lookup.js";

const ITEM_SEPARATOR: LookupQuickPickItem = {
  label: "Header",
  kind: vscode.QuickPickItemKind.Separator,
  alwaysShow: true,
};

export async function showPrompt(
  state: {
    quickPick: vscode.QuickPick<LookupQuickPickItem> | undefined;
    baseValue: string | undefined;
    activeValue: string | undefined;
    suffixes: string[];
  },
  workspaceRoot: string,
  initialValue: string | undefined,
): Promise<LookupQuickPickItem | undefined> {
  return new Promise((resolve, reject) => {
    state.quickPick = vscode.window.createQuickPick();
    const quickPick = state.quickPick;

    quickPick.matchOnDescription = false;
    quickPick.matchOnDetail = false;
    vscode.commands.executeCommand(
      "setContext",
      "lookup.isQuickPickOpen",
      true,
    );

    quickPick.value = "";
    quickPick.show();

    // 2. Clear it when it closes
    if (initialValue) {
      quickPick.value = initialValue;
    }
    quickPick.canSelectMany = false;

    // quickPick.onDidChangeActive((items) => {
    //   const firstItem = quickPick.items[0];

    //   if (!firstItem) {
    //     return;
    //   }
    //   const activeItem = items[0];
    //   if (!activeItem) {
    //     return;
    //   }

    //   if (
    //     activeItem.label !== state.activeValue &&
    //     activeItem.label !== firstItem.label
    //   ) {
    //     quickPick.value = activeItem.label;
    //     state.activeValue = quickPick.value;
    //   }
    // });

    quickPick.onDidChangeValue(async (value) => {
      // if (!value) {
      //   quickPick.items = [];
      //   return;
      // }

      if (value.endsWith("/") || value.endsWith(".")) {
        state.suffixes = [];
        state.baseValue = value;
      }

      // Use a glob pattern for prefix matching
      // Example: "src/app" becomes "**/src/app*"

      const pattern = buildSearchPattern(value);

      quickPick.busy = true; // Show loading indicator
      try {
        const uris = await vscode.workspace.findFiles(pattern, "**/.*", 100);

        const suffixes = new Set();
        var exactMatch = false;

        const uriItems: LookupQuickPickItem[] = uris.map((uri) => {
          const relative = vscode.workspace.asRelativePath(uri);

          const suffix = extractSuffix(relative, value);

          if (state.baseValue === value && !suffixes.has(suffix)) {
            state.suffixes = [...state.suffixes, suffix];
            suffixes.add(suffix);
          }

          const relativePath = path.parse(relative);
          const rootDir = relativePath.dir.split(path.sep)?.[0];

          if (relative === value) {
            exactMatch = true;
          }

          return {
            label: relative,
            description: `(${rootDir})`,
            action: "open",
            uri,
          };
        });

        quickPick.items = exactMatch
          ? uriItems
          : [
              makeCreateItem(vscode.Uri.parse(path.join(workspaceRoot, value))),
              ITEM_SEPARATOR,
              ...uriItems,
            ];
      } catch (err) {
        console.error(err);
      } finally {
        quickPick.busy = false;
      }
    });

    quickPick.onDidAccept(() => {
      quickPick.hide();

      if (quickPick.selectedItems.length > 0) {
        const selectedItem = quickPick.selectedItems[0];

        resolve(selectedItem);
      } else {
        resolve(
          makeCreateItem(
            vscode.Uri.parse(path.join(workspaceRoot, quickPick.value)),
          ),
        );
      }
    });

    quickPick.onDidHide(() => {
      vscode.commands.executeCommand(
        "setContext",
        "lookup.isQuickPickOpen",
        false,
      );
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  const state: {
    quickPick: vscode.QuickPick<LookupQuickPickItem> | undefined;
    baseValue: string | undefined;
    activeValue: string | undefined;
    suffixes: string[];
  } = {
    quickPick: undefined,
    baseValue: undefined,
    activeValue: undefined,
    suffixes: [],
  };

  const disposable = vscode.commands.registerCommand(
    "lookup.showPrompt",
    async () => {
      const activeEditor = vscode.window.activeTextEditor;

      if (!vscode.workspace.workspaceFolders) {
        return Promise.reject("No workspace folders defined");
      }
      const workspaceFolder = activeEditor
        ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
        : vscode.workspace.workspaceFolders[0];

      if (!workspaceFolder) {
        return Promise.reject("No workspace folder found");
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;

      const currentFileUri = activeEditor
        ? vscode.workspace.asRelativePath(activeEditor.document.uri)
        : undefined;

      state.baseValue = undefined;
      state.activeValue = undefined;
      state.suffixes = [];

      const lookupResult = await showPrompt(
        state,
        workspaceRoot,
        currentFileUri,
      );

      if (!lookupResult) {
        return;
      }

      // const targetUri = path.join(workspaceRoot, lookupResult);

      const targetUri = lookupResult.uri;

      if (targetUri) {
        return access(targetUri.path)
          .then(() => {
            return true;
          })
          .catch(async () => {
            await writeFile(targetUri.path, "");
            return false;
          })
          .then(async (fileAlreadyExists) => {
            const doc = await vscode.workspace.openTextDocument(targetUri);
            const editor = await vscode.window.showTextDocument(doc);
          });
      }
    },
  );

  context.subscriptions.push(disposable);

  vscode.commands.registerCommand("lookup.autocomplete", () => {
    const activeQuickPick = state.quickPick;
    if (!activeQuickPick) {
      return;
    }

    if (state.suffixes.length === 0) {
      return;
    }

    activeQuickPick.value = state.baseValue + state.suffixes[0];
    state.suffixes = rotateSuffixes(state.suffixes);
  });

  vscode.commands.registerCommand("lookup.autocompleteBackwards", () => {
    const activeQuickPick = state.quickPick;
    if (!activeQuickPick) {
      return;
    }

    if (state.suffixes.length === 0) {
      return;
    }

    state.suffixes = rotateSuffixesBackward(state.suffixes);
    activeQuickPick.value = state.baseValue + state.suffixes[0];
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
