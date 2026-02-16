import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  test("Extension activates successfully", async () => {
    const extension = vscode.extensions.getExtension("marsi-dev.lookup");
    assert.ok(extension, "Extension should be found");
    await extension!.activate();
    assert.strictEqual(extension!.isActive, true);
  });

  test("lookup.showPrompt command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("lookup.showPrompt"),
      "lookup.showPrompt should be registered",
    );
  });

  test("lookup.autocomplete command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("lookup.autocomplete"),
      "lookup.autocomplete should be registered",
    );
  });

  test("lookup.autocompleteBackwards command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("lookup.autocompleteBackwards"),
      "lookup.autocompleteBackwards should be registered",
    );
  });
});
