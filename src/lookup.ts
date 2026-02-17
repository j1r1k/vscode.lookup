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

export const extractSuffix = (relativePath: string, prefix: string): string => {
  return relativePath.substring(prefix.length).split(".", 1)[0];
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

export const shouldResetBase = (value: string): boolean => {
  return value === "" || value.endsWith("/") || value.endsWith(".");
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
