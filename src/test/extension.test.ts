import * as assert from "assert";
import {
  linesToFoldExcludingTarget,
  OpenDocumentTracker,
  shouldFoldForLanguage,
} from "../core";

describe("Better Regions - Unit Tests", () => {
  it("OpenDocumentTracker opens/closes correctly", () => {
    const tracker = new OpenDocumentTracker();
    const a = { toString: () => "file:///test/a.ts" } as any;
    const b = { toString: () => "file:///test/b.ts" } as any;

    // First open returns true
    assert.strictEqual(tracker.markOpened(a), true);
    // Second open is false
    assert.strictEqual(tracker.markOpened(a), false);
    // Close then open again -> true
    tracker.markClosed(a);
    assert.strictEqual(tracker.markOpened(a), true);
    // Separate document unaffected
    assert.strictEqual(tracker.markOpened(b), true);
    assert.strictEqual(tracker.isOpen(b), true);
  });

  it("shouldFoldForLanguage respects enableForAllFiles + disabledFiles", () => {
    const settingsAll = {
      enableForAllFiles: true,
      enabledFiles: [],
      disabledFiles: ["markdown"],
    };
    assert.strictEqual(
      shouldFoldForLanguage(settingsAll as any, "typescript"),
      true
    );
    assert.strictEqual(
      shouldFoldForLanguage(settingsAll as any, "markdown"),
      false
    );
  });

  it("shouldFoldForLanguage respects enabledFiles when not all", () => {
    const settingsSome = {
      enableForAllFiles: false,
      enabledFiles: ["typescript", "javascript"],
      disabledFiles: [],
    };
    assert.strictEqual(
      shouldFoldForLanguage(settingsSome as any, "typescript"),
      true
    );
    assert.strictEqual(
      shouldFoldForLanguage(settingsSome as any, "python"),
      false
    );
  });

  it("linesToFoldExcludingTarget excludes the target region", () => {
    const ranges = [
      { start: 0, end: 10, kind: "region" },
      { start: 12, end: 20, kind: "region" },
      { start: 22, end: 30, kind: "imports" }, // non-region should be ignored
    ];
    // target inside first region -> should only fold second region start
    const lines = linesToFoldExcludingTarget(ranges as any, 5);
    assert.deepStrictEqual(lines, [12]);
  });
});
