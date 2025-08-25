// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  linesToFoldExcludingTarget,
  OpenDocumentTracker,
  shouldFoldForLanguage,
  type Settings,
} from "./core";

function getSettings(): Settings {
  const cfg = vscode.workspace.getConfiguration("betterRegions");
  return {
    enableForAllFiles: cfg.get<boolean>("enableForAllFiles", true),
    enabledFiles: cfg.get<string[]>("enabledFiles", []),
    disabledFiles: cfg.get<string[]>("disabledFiles", []),
  };
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Track which documents are currently open so we only auto-fold on first open
  const existingDocs = vscode.workspace.textDocuments.map((d) =>
    d.uri.toString()
  );
  const tracker = new OpenDocumentTracker(existingDocs);

  async function maybeAutoFold(editor: vscode.TextEditor | undefined) {
    if (!editor) {
      return;
    }
    const doc = editor.document;
    // Skip non-file backed docs except untitled
    if (doc.isUntitled === false && doc.uri.scheme !== "file") {
      return;
    }
    // Only run on first time a doc becomes active after being closed
    const isNewlyOpened = tracker.markOpened(doc.uri);
    if (!isNewlyOpened) {
      return;
    }

    const settings = getSettings();
    if (!shouldFoldForLanguage(settings, doc.languageId)) {
      return;
    }

    // Defer folding a bit to allow Search/Go To to set the selection.
    let finished = false;
    const uriKey = doc.uri.toString();

    const cleanup = (listener?: vscode.Disposable, timer?: NodeJS.Timeout) => {
      if (listener) {
        listener.dispose();
      }
      if (timer) {
        clearTimeout(timer);
      }
    };

    const doFold = async (targetLine: number | undefined) => {
      if (finished) {
        return;
      }
      const active = vscode.window.activeTextEditor;
      if (!active || active.document.uri.toString() !== uriKey) {
        finished = true;
        return;
      }
      try {
        if (typeof targetLine === "number" && targetLine > 0) {
          const ranges = (await vscode.commands.executeCommand(
            "vscode.executeFoldingRangeProvider",
            active.document.uri
          )) as
            | Array<{ start: number; end: number; kind?: string }>
            | undefined;
          const lines = linesToFoldExcludingTarget(ranges ?? [], targetLine);
          if (lines.length > 0) {
            await vscode.commands.executeCommand("editor.fold", {
              selectionLines: lines,
            });
          }
          // If no ranges, skip folding to keep target visible
        } else {
          await vscode.commands.executeCommand("editor.foldAllMarkerRegions");
        }
      } catch (err) {
        console.debug("better-regions: folding skipped due to error", err);
      } finally {
        finished = true;
      }
    };

    // One-shot selection listener for the active editor
    const selectionListener = vscode.window.onDidChangeTextEditorSelection(
      (e) => {
        if (finished) {
          return;
        }
        if (e.textEditor.document.uri.toString() !== uriKey) {
          return;
        }
        const line = e.selections?.[0]?.active?.line ?? 0;
        cleanup(selectionListener, timeout);
        void doFold(line);
      }
    );

    // Fallback if no selection change happens shortly
    const timeout = setTimeout(() => {
      cleanup(selectionListener, timeout);
      void doFold(undefined);
    }, 450);
  }

  // Initial active editor
  void maybeAutoFold(vscode.window.activeTextEditor);

  // When the active editor changes, check if we should fold
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => void maybeAutoFold(e))
  );

  // When a document is fully closed, allow folding again next time it's opened
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      tracker.markClosed(doc.uri)
    )
  );
}

// Exports for unit testing
export {
  linesToFoldExcludingTarget,
  OpenDocumentTracker,
  shouldFoldForLanguage,
};

// This method is called when your extension is deactivated
export function deactivate() {}
