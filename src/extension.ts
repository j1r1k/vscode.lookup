import { access, writeFile } from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import {
  type AutocompleteState,
  LookupQuickPickItem,
  applyAutocomplete,
  buildSearchPattern,
  collectSearchSuffixes,
  createAutocompleteState,
  makeCreateItem,
  resetAutocompleteState,
  resetSearchState,
} from "./lookup.js";

const ITEM_SEPARATOR: LookupQuickPickItem = {
  label: "Header",
  kind: vscode.QuickPickItemKind.Separator,
  alwaysShow: true,
};

export async function showPrompt(
  state: { quickPick: vscode.QuickPick<LookupQuickPickItem> | undefined } & AutocompleteState,
  workspaceRoot: string,
  initialValue: string | undefined,
): Promise<LookupQuickPickItem | undefined> {
  return new Promise((resolve) => {
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

    if (initialValue) {
      quickPick.value = initialValue;
    }
    quickPick.canSelectMany = false;

    const performSearch = async (value: string) => {
      resetSearchState(state, value);

      const pattern = buildSearchPattern(value);

      quickPick.busy = true;
      try {
        const uris = await vscode.workspace.findFiles(pattern, "**/.*", 100);

        const relativePaths = uris.map((uri) =>
          vscode.workspace.asRelativePath(uri),
        );
        collectSearchSuffixes(state, value, relativePaths);

        let exactMatch = false;

        const uriItems: LookupQuickPickItem[] = uris.map((uri, i) => {
          const relative = relativePaths[i];
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
    };

    quickPick.onDidChangeValue(async (value) => {
      if (state.isAutocompleting) {
        state.isAutocompleting = false;
        return;
      }
      await performSearch(value);
    });

    // Populate items for the initial value
    performSearch(quickPick.value);

    quickPick.onDidAccept(() => {
      if (quickPick.selectedItems.length > 0) {
        resolve(quickPick.selectedItems[0]);
      } else {
        resolve(
          makeCreateItem(
            vscode.Uri.parse(path.join(workspaceRoot, quickPick.value)),
          ),
        );
      }
      quickPick.hide();
    });

    quickPick.onDidHide(() => {
      vscode.commands.executeCommand(
        "setContext",
        "lookup.isQuickPickOpen",
        false,
      );
      quickPick.dispose();
      state.quickPick = undefined;
      resetAutocompleteState(state);
      resolve(undefined);
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  const state: {
    quickPick: vscode.QuickPick<LookupQuickPickItem> | undefined;
  } & AutocompleteState = {
    quickPick: undefined,
    ...createAutocompleteState(),
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

      resetAutocompleteState(state);

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

    const newValue = applyAutocomplete(state, activeQuickPick.value, "forward");
    if (newValue !== undefined) {
      state.isAutocompleting = true;
      activeQuickPick.value = newValue;
      state.isAutocompleting = false;
    }
  });

  vscode.commands.registerCommand("lookup.autocompleteBackwards", () => {
    const activeQuickPick = state.quickPick;
    if (!activeQuickPick) {
      return;
    }

    const newValue = applyAutocomplete(
      state,
      activeQuickPick.value,
      "backward",
    );
    if (newValue !== undefined) {
      state.isAutocompleting = true;
      activeQuickPick.value = newValue;
      state.isAutocompleting = false;
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
