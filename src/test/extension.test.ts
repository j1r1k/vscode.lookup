import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  test("Extension activates successfully", async () => {
    const extension = vscode.extensions.getExtension("marsi-dev.filelookup");
    assert.ok(extension, "Extension should be found");
    await extension!.activate();
    assert.strictEqual(extension!.isActive, true);
  });

  test("filelookup.showPrompt command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("filelookup.showPrompt"),
      "filelookup.showPrompt should be registered",
    );
  });

  test("filelookup.autocomplete command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("filelookup.autocomplete"),
      "filelookup.autocomplete should be registered",
    );
  });

  test("filelookup.autocompleteBackwards command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("filelookup.autocompleteBackwards"),
      "filelookup.autocompleteBackwards should be registered",
    );
  });
});
