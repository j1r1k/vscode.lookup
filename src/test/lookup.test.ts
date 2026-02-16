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
