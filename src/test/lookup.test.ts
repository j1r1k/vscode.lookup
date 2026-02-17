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
  findBase,
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

suite("findBase", () => {
  test("returns empty string for empty input", () => {
    assert.strictEqual(findBase(""), "");
  });

  test("returns empty string for value without boundary", () => {
    assert.strictEqual(findBase("dai"), "");
  });

  test("returns up to trailing dot", () => {
    assert.strictEqual(findBase("daily."), "daily.");
  });

  test("returns up to last dot for mid-segment value", () => {
    assert.strictEqual(findBase("daily.2026"), "daily.");
  });

  test("returns up to last dot for multi-segment value", () => {
    assert.strictEqual(findBase("daily.2026."), "daily.2026.");
  });

  test("returns up to trailing slash", () => {
    assert.strictEqual(findBase("src/"), "src/");
  });

  test("returns up to last slash for mid-segment value", () => {
    assert.strictEqual(findBase("src/app"), "src/");
  });

  test("picks later boundary when mixed separators", () => {
    assert.strictEqual(findBase("src/file.ts"), "src/file.");
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

    assert.strictEqual(state.baseValue, "");
    assert.deepStrictEqual(state.suffixes, []);
    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
    assert.strictEqual(state.lastAutocompletedValue, undefined);
  });
});

suite("resetAutocompleteState", () => {
  test("resets dirty state back to defaults", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];
    state.typedPrefix = "a";
    state.filteredSuffixes = ["app"];
    state.lastAutocompletedValue = "src/app";

    resetAutocompleteState(state);

    assert.strictEqual(state.baseValue, "");
    assert.deepStrictEqual(state.suffixes, []);
    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
    assert.strictEqual(state.lastAutocompletedValue, undefined);
  });
});

suite("resetSearchState", () => {
  test("resets typedPrefix and filteredSuffixes", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.typedPrefix = "app";
    state.filteredSuffixes = ["app/main"];

    resetSearchState(state, "src/app");

    assert.strictEqual(state.typedPrefix, undefined);
    assert.deepStrictEqual(state.filteredSuffixes, []);
  });

  test("resets base on empty string when base was empty", () => {
    const state = createAutocompleteState();
    state.baseValue = "";
    state.suffixes = ["leftover"];

    resetSearchState(state, "");

    // findBase("") === "" === state.baseValue, so no base reset
    assert.strictEqual(state.baseValue, "");
    assert.deepStrictEqual(state.suffixes, ["leftover"]);
  });

  test("resets base when backspacing past boundary", () => {
    const state = createAutocompleteState();
    state.baseValue = "daily.";
    state.suffixes = ["2026"];

    resetSearchState(state, "dai");

    // findBase("dai") === "" !== "daily.", so base resets
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

  test("preserves base and suffixes when base unchanged", () => {
    const state = createAutocompleteState();
    state.baseValue = "src/";
    state.suffixes = ["app", "lib"];

    resetSearchState(state, "src/app");

    // findBase("src/app") === "src/" === state.baseValue
    assert.strictEqual(state.baseValue, "src/");
    assert.deepStrictEqual(state.suffixes, ["app", "lib"]);
  });
});

suite("collectSearchSuffixes", () => {
  test("collects unique suffixes when value equals baseValue", () => {
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

  test("collects suffixes when value starts with baseValue", () => {
    const state = createAutocompleteState();
    state.baseValue = "";
    state.suffixes = [];

    collectSearchSuffixes(state, "dai", [
      "daily.2026.01.md",
      "daily.2026.02.md",
    ]);

    assert.deepStrictEqual(state.suffixes, ["daily"]);
  });

  test("skips collection when value does not start with baseValue", () => {
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

suite("cycling integration", () => {
  test("backspace past boundary resets base and collects new suffixes", () => {
    const state = createAutocompleteState();

    // User types "daily." → base becomes "daily."
    resetSearchState(state, "daily.");
    collectSearchSuffixes(state, "daily.", [
      "daily.2026.01.md",
      "daily.2026.02.md",
    ]);
    assert.strictEqual(state.baseValue, "daily.");
    assert.deepStrictEqual(state.suffixes, ["2026"]);

    // User backspaces to "dai" → base resets to ""
    resetSearchState(state, "dai");
    assert.strictEqual(state.baseValue, "");
    assert.deepStrictEqual(state.suffixes, []);

    // Search for "dai*" collects suffixes relative to base ""
    collectSearchSuffixes(state, "dai", [
      "daily.2026.01.md",
      "daily.2026.02.md",
    ]);
    assert.deepStrictEqual(state.suffixes, ["daily"]);

    // Tab completes to "daily"
    const result = applyAutocomplete(state, "dai", "forward");
    assert.strictEqual(result, "daily");
  });

  test("tab cycling preserves state across multiple completions", () => {
    const state = createAutocompleteState();

    // Simulate search at "src/"
    resetSearchState(state, "src/");
    collectSearchSuffixes(state, "src/", [
      "src/app.ts",
      "src/lib.ts",
      "src/utils.ts",
    ]);

    // First tab → "src/app"
    const r1 = applyAutocomplete(state, "src/", "forward");
    assert.strictEqual(r1, "src/app");

    // Second tab → "src/lib" (cycling continues, no resetSearchState called)
    const r2 = applyAutocomplete(state, "src/app", "forward");
    assert.strictEqual(r2, "src/lib");

    // Third tab → "src/utils"
    const r3 = applyAutocomplete(state, "src/lib", "forward");
    assert.strictEqual(r3, "src/utils");

    // Wraps around
    const r4 = applyAutocomplete(state, "src/utils", "forward");
    assert.strictEqual(r4, "src/app");
  });
});
