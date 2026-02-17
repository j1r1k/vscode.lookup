import * as vscode from "vscode";

export type LookupQuickPickItem = {
  action?: "create" | "open";
  uri?: vscode.Uri;
} & vscode.QuickPickItem;

export const takeWhile = <A>(fn: (a: A) => boolean, arr: A[]): A[] => {
  if (arr.length === 0) {
    return [];
  }

  const [x, ...xs] = arr;
  if (fn(x)) {
    return [x, ...takeWhile(fn, xs)];
  } else {
    return [];
  }
};

export const buildSearchPattern = (value: string): string => {
  return value === "" ? "**/*" : `${value}*`;
};

export const extractSuffix = (relativePath: string, prefix: string, separators: string[]): string => {
  const remainder = relativePath.substring(prefix.length);
  let firstSep = -1;
  for (const sep of separators) {
    const idx = remainder.indexOf(sep);
    if (idx !== -1 && (firstSep === -1 || idx < firstSep)) {
      firstSep = idx;
    }
  }
  return firstSep === -1 ? remainder : remainder.substring(0, firstSep);
};

export const rotateSuffixes = (suffixes: string[]): string[] => {
  if (suffixes.length === 0) {
    return [];
  }
  return [...suffixes.slice(1), suffixes[0]];
};

export const rotateSuffixesBackward = (suffixes: string[]): string[] => {
  if (suffixes.length === 0) {
    return [];
  }
  return [suffixes[suffixes.length - 1], ...suffixes.slice(0, -1)];
};

export const filterSuffixes = (suffixes: string[], prefix: string): string[] => {
  return suffixes.filter(s => s.startsWith(prefix));
};

export const findBase = (value: string, separators: string[]): string => {
  let lastBoundary = -1;
  for (const sep of separators) {
    const idx = value.lastIndexOf(sep);
    if (idx > lastBoundary) {
      lastBoundary = idx;
    }
  }
  return lastBoundary === -1 ? "" : value.substring(0, lastBoundary + 1);
};

export const makeCreateItem = (uri: vscode.Uri): LookupQuickPickItem => {
  return {
    label: "Create",
    alwaysShow: true,
    detail: "File does not exist. Create?",
    action: "create",
    uri,
  };
};

export interface AutocompleteState {
  baseValue: string;
  suffixes: string[];
  typedPrefix: string | undefined;
  filteredSuffixes: string[];
  lastAutocompletedValue: string | undefined;
}

export const createAutocompleteState = (): AutocompleteState => ({
  baseValue: "",
  suffixes: [],
  typedPrefix: undefined,
  filteredSuffixes: [],
  lastAutocompletedValue: undefined,
});

export const resetAutocompleteState = (state: AutocompleteState): void => {
  state.baseValue = "";
  state.suffixes = [];
  state.typedPrefix = undefined;
  state.filteredSuffixes = [];
  state.lastAutocompletedValue = undefined;
};

export const resetSearchState = (
  state: AutocompleteState,
  value: string,
  separators: string[],
): void => {
  state.typedPrefix = undefined;
  state.filteredSuffixes = [];

  const base = findBase(value, separators);
  if (base !== state.baseValue) {
    state.suffixes = [];
    state.baseValue = base;
  }
};

export const collectSearchSuffixes = (
  state: AutocompleteState,
  value: string,
  relativePaths: string[],
  separators: string[],
): void => {
  if (value.startsWith(state.baseValue)) {
    const existingSuffixes = new Set(state.suffixes);
    for (const relative of relativePaths) {
      const suffix = extractSuffix(relative, state.baseValue, separators);
      if (!existingSuffixes.has(suffix)) {
        state.suffixes = [...state.suffixes, suffix];
        existingSuffixes.add(suffix);
      }
    }
  }
};

export const applyAutocomplete = (
  state: AutocompleteState,
  currentValue: string,
  direction: "forward" | "backward",
): string | undefined => {
  if (state.typedPrefix === undefined) {
    state.typedPrefix = currentValue.substring(state.baseValue.length);
    state.filteredSuffixes = filterSuffixes(state.suffixes, state.typedPrefix);
  }

  if (state.filteredSuffixes.length === 0) {
    return undefined;
  }

  if (direction === "backward") {
    state.filteredSuffixes = rotateSuffixesBackward(state.filteredSuffixes);
  }

  const newValue = state.baseValue + state.filteredSuffixes[0];

  if (direction === "forward") {
    state.filteredSuffixes = rotateSuffixes(state.filteredSuffixes);
  }

  return newValue;
};
