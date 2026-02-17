import * as assert from "assert";
import * as vscode from "vscode";
import {
  takeWhile,
  buildSearchPattern,
  extractSuffix,
  filterSuffixes,
  rotateSuffixes,
  rotateSuffixesBackward,
  makeCreateItem,
  shouldResetBase,
  createAutocompleteState,
  resetAutocompleteState,
  resetSearchState,
  collectSearchSuffixes,
  applyAutocomplete,
} from "../lookup.js";

suite("takeWhile", () => {
  test("returns empty array for empty input", () => {
    assert.deepStrictEqual(takeWhile(() => true, []), []);
  });

  test("returns all elements when all match", () => {
    assert.deepStrictEqual(
      takeWhile((x: number) => x > 0, [1, 2, 3]),
      [1, 2, 3],
    );
  });

  test("returns matching prefix", () => {
    assert.deepStrictEqual(
      takeWhile((x: number) => x < 3, [1, 2, 3, 4]),
      [1, 2],
    );
  });

  test("returns empty when first element does not match", () => {
    assert.deepStrictEqual(
      takeWhile((x: number) => x > 10, [1, 2, 3]),
      [],
    );
  });
});

suite("buildSearchPattern", () => {
  test("returns glob-all for empty string", () => {
    assert.strictEqual(buildSearchPattern(""), "**/*");
  });

  test("appends wildcard for normal input", () => {
    assert.strictEqual(buildSearchPattern("src/app"), "src/app*");
  });

  test("appends wildcard for path with trailing slash", () => {
    assert.strictEqual(buildSearchPattern("src/"), "src/*");
  });
});

suite("extractSuffix", () => {
  test("extracts suffix after prefix", () => {
    assert.strictEqual(extractSuffix("src/app/main.ts", "src/app/"), "main");
  });

  test("extracts suffix without extension", () => {
    assert.strictEqual(extractSuffix("readme.md", ""), "readme");
  });

  test("extracts suffix for partial match", () => {
    assert.strictEqual(extractSuffix("src/components/Button.tsx", "src/"), "components/Button");
  });

  test("returns empty string for exact match up to dot", () => {
    assert.strictEqual(extractSuffix("file.ts", "file"), "");
  });
});

suite("rotateSuffixes", () => {
  test("returns empty for empty array", () => {
    assert.deepStrictEqual(rotateSuffixes([]), []);
  });

  test("returns same for single element", () => {
    assert.deepStrictEqual(rotateSuffixes(["a"]), ["a"]);
  });

  test("moves first element to end", () => {
    assert.deepStrictEqual(rotateSuffixes(["a", "b", "c"]), ["b", "c", "a"]);
  });
});

suite("rotateSuffixesBackward", () => {
  test("returns empty for empty array", () => {
    assert.deepStrictEqual(rotateSuffixesBackward([]), []);
  });

  test("returns same for single element", () => {
    assert.deepStrictEqual(rotateSuffixesBackward(["a"]), ["a"]);
  });

  test("moves last element to front", () => {
    assert.deepStrictEqual(
      rotateSuffixesBackward(["a", "b", "c"]),
      ["c", "a", "b"],
    );
  });
});

suite("filterSuffixes", () => {
  test("returns empty for empty suffixes", () => {
    assert.deepStrictEqual(filterSuffixes([], "co"), []);
  });

  test("returns empty when no matches", () => {
    assert.deepStrictEqual(filterSuffixes(["utils", "lib"], "co"), []);
  });

  test("returns only matching suffixes", () => {
    assert.deepStrictEqual(
      filterSuffixes(["components/Button", "config", "utils"], "co"),
      ["components/Button", "config"],
    );
  });

  test("returns all suffixes for empty prefix", () => {
    assert.deepStrictEqual(
      filterSuffixes(["components/Button", "config", "utils"], ""),
      ["components/Button", "config", "utils"],
    );
  });
});

suite("shouldResetBase", () => {
  test("returns true for empty string", () => {
    assert.strictEqual(shouldResetBase(""), true);
  });

  test("returns true for trailing slash", () => {
    assert.strictEqual(shouldResetBase("src/"), true);
  });

  test("returns true for trailing dot", () => {
    assert.strictEqual(shouldResetBase("file."), true);
  });

  test("returns false for normal path segment", () => {
    assert.strictEqual(shouldResetBase("src/app"), false);
  });

  test("returns false for filename without trailing dot", () => {
    assert.strictEqual(shouldResetBase("README"), false);
  });
});

suite("makeCreateItem", () => {
  test("returns item with correct shape", () => {
    const uri = vscode.Uri.parse("file:///test/path.ts");
    const item = makeCreateItem(uri);

    assert.strictEqual(item.label, "Create");
    assert.strictEqual(item.action, "create");
    assert.strictEqual(item.alwaysShow, true);
    assert.strictEqual(item.detail, "File does not exist. Create?");
    assert.strictEqual(item.uri, uri);
  });
});

suite("createAutocompleteState", () => {
  test("returns correct initial values", () => {
    const state = createAutocompleteState();

    assert.strictEqual(state.baseValue, undefined);
    assert.deepStrictEqual(state.suffixes, []);
    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
    assert.strictEqual(state.isAutocompleting, false);
  });
});

suite("resetAutocompleteState", () => {
  test("resets dirty state back to defaults", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];
    state.typedPrefix = "a";
    state.filteredSuffixes = ["app"];
    state.isAutocompleting = true;

    resetAutocompleteState(state);

    assert.strictEqual(state.baseValue, undefined);
    assert.deepStrictEqual(state.suffixes, []);
    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
    assert.strictEqual(state.isAutocompleting, false);
  });
});

suite("resetSearchState", () => {
  test("resets typedPrefix and filteredSuffixes", () => {
    const state = createAutocompleteState();
    state.typedPrefix = "app";
    state.filteredSuffixes = ["app/main"];

    resetSearchState(state, "src/app");

    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
  });

  test("resets base on empty string", () => {
    const state = createAutocompleteState();
    state.baseValue = "old/";
    state.suffixes = ["leftover"];

    resetSearchState(state, "");

    assert.strictEqual(state.baseValue, "");
    assert.deepStrictEqual(state.suffixes, []);
  });

  test("resets base on trailing slash", () => {
    const state = createAutocompleteState();
    state.suffixes = ["old"];

    resetSearchState(state, "src/");

    assert.strictEqual(state.baseValue, "src/");
    assert.deepStrictEqual(state.suffixes, []);
  });

  test("resets base on trailing dot", () => {
    const state = createAutocompleteState();

    resetSearchState(state, "file.");

    assert.strictEqual(state.baseValue, "file.");
    assert.deepStrictEqual(state.suffixes, []);
  });

  test("preserves base and suffixes on non-boundary value", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];

    resetSearchState(state, "src/app");

    assert.strictEqual(state.baseValue, "src/");
    assert.deepStrictEqual(state.suffixes, ["app", "lib"]);
  });
});

suite("collectSearchSuffixes", () => {
  test("collects unique suffixes when baseValue matches", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = [];

    collectSearchSuffixes(state, "src/", [
      "src/app.ts",
      "src/app.test.ts",
      "src/lib.ts",
    ]);

    assert.deepStrictEqual(state.suffixes, ["app", "lib"]);
  });

  test("skips collection when baseValue does not match", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["existing"];

    collectSearchSuffixes(state, "lib/", ["lib/utils.ts"]);

    assert.deepStrictEqual(state.suffixes, ["existing"]);
  });

  test("appends to existing suffixes without duplicates", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app"];

    collectSearchSuffixes(state, "src/", [
      "src/app.ts",
      "src/lib.ts",
    ]);

    assert.deepStrictEqual(state.suffixes, ["app", "lib"]);
  });

  test("does nothing when relativePaths is empty", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app"];

    collectSearchSuffixes(state, "src/", []);

    assert.deepStrictEqual(state.suffixes, ["app"]);
  });
});

suite("applyAutocomplete", () => {
  test("returns undefined when no suffixes available", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = [];

    const result = applyAutocomplete(state, "src/", "forward");

    assert.strictEqual(result, undefined);
  });

  test("captures typedPrefix on first call", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "api", "lib"];

    applyAutocomplete(state, "src/a", "forward");

    assert.strictEqual(state.typedPrefix, "a");
  });

  test("filters by typed prefix", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "api", "lib"];

    const result = applyAutocomplete(state, "src/a", "forward");

    assert.strictEqual(result, "src/app");
  });

  test("cycles forward through suffixes", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib", "utils"];

    const r1 = applyAutocomplete(state, "src/", "forward");
    assert.strictEqual(r1, "src/app");

    const r2 = applyAutocomplete(state, "src/app", "forward");
    assert.strictEqual(r2, "src/lib");

    const r3 = applyAutocomplete(state, "src/lib", "forward");
    assert.strictEqual(r3, "src/utils");
  });

  test("cycles backward through suffixes", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib", "utils"];

    const r1 = applyAutocomplete(state, "src/", "backward");
    assert.strictEqual(r1, "src/utils");

    const r2 = applyAutocomplete(state, "src/utils", "backward");
    assert.strictEqual(r2, "src/lib");
  });

  test("wraps around on repeated forward cycling", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];

    const r1 = applyAutocomplete(state, "src/", "forward");
    assert.strictEqual(r1, "src/app");

    const r2 = applyAutocomplete(state, "src/app", "forward");
    assert.strictEqual(r2, "src/lib");

    const r3 = applyAutocomplete(state, "src/lib", "forward");
    assert.strictEqual(r3, "src/app");
  });

  test("returns undefined when no suffixes match typed prefix", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];

    const result = applyAutocomplete(state, "src/z", "forward");

    assert.strictEqual(result, undefined);
  });
});
