// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'node:path';
import * as vscode from 'vscode';
import { OpenDocumentTracker, shouldFoldForLanguage } from './core.js';
import { getSettings } from './settings.js';
import { FoldingRange, FoldingRangeKind } from './types.js';

let output: vscode.OutputChannel | undefined;

const ts = (): string => new Date().toISOString();
const log = (message: string): void => {
	if (!output) return;
	output.appendLine(`${ts()} ${message}`);
};

// Get the file URI from a tab if it’s a real file-backed text tab
function getFileUriFromTab(tab: vscode.Tab): vscode.Uri | undefined {
	const input = tab.input;
	if (input instanceof vscode.TabInputText)
		return input.uri.scheme === 'file' ? input.uri : undefined;

	return undefined;
}

// eslint-disable-next-line @typescript-eslint/require-await
async function maybeAutoFold(
	tracker: OpenDocumentTracker,
	editor: vscode.TextEditor | undefined
): Promise<void> {
	if (!editor) return;

	const doc = editor.document;
	// Skip non-file backed docs except untitled
	if (doc.isUntitled || doc.uri.scheme !== 'file') return;

	// Only run on first time a doc becomes active after being closed
	const filePath = doc.uri.fsPath;
	const isNewlyOpened = tracker.markOpened(filePath);
	if (!isNewlyOpened) return;

	// Start a new section in the output for this file
	if (output) {
		const fileLabel = path.basename(doc.fileName);
		output.appendLine(`\n--- ${fileLabel} (${doc.languageId || 'unknown'}) ---`);
	}
	log(`File opened: ${filePath}`);
	log(`Lines of code: ${String(doc.lineCount)}`);

	const settings = getSettings();
	if (!shouldFoldForLanguage(settings, doc.languageId)) {
		log(
			`Skipping auto-fold: language '${doc.languageId}' disabled by settings (enableForAllFiles=${String(settings.enableForAllFiles)})`
		);
		return;
	}

	// Defer folding a bit to allow Search/Go To to set the selection.
	let finished = false;

	const cleanup = (listener?: vscode.Disposable, timer?: NodeJS.Timeout): void => {
		if (listener) listener.dispose();

		if (timer) clearTimeout(timer);
	};

	const doFold = async (targetLine: number | undefined): Promise<void> => {
		if (finished) return;

		const active = vscode.window.activeTextEditor;
		if (!active || active.document.uri.fsPath !== filePath) {
			finished = true;
			return;
		}
		try {
			// Determine the effective target line from selection if not provided
			const line = typeof targetLine === 'number' ? targetLine : active.selection.active.line;
			const character = active.selection.active.character;
			log(
				`Cursor position read: line ${String(line + 1)}, character ${String(character + 1)}`
			);
			// Ask for folding ranges and decide if caret is inside any region
			let ranges: FoldingRange[] = await vscode.commands.executeCommand(
				'vscode.executeFoldingRangeProvider',
				active.document.uri
			);
			ranges = ranges.filter((r) => r.kind === FoldingRangeKind.Region);
			log(`Number of regions read: ${String(ranges.length)}`);

			// There are no regions that need to be folded so we do nothing
			if (ranges.length === 0) {
				log('No marker regions found. No folding performed.');
				return;
			}

			// Check if the line number is not valid or is less than or equal to 0. Fold all marker regions if so
			if (typeof line !== 'number' || line <= 0) {
				log('Action: close all regions (no valid caret line)');
				log(`Intended to close ${String(ranges.length)} regions; kept open 0`);
				await vscode.commands.executeCommand('editor.foldAllMarkerRegions');
				return;
			}

			// Check if the current line is within a region.
			if (ranges.some((r) => line >= r.start && line <= r.end)) {
				// Fold other regions, keep the one containing the caret open
				const lines = ranges
					.filter((r) => !(line >= r.start && line <= r.end))
					.map((r) => r.start + 1);

				const kept = ranges.find((r) => line >= r.start && line <= r.end);
				log('Action: close other regions; keep caret region open');
				if (kept)
					log(
						`Keeping 1 region open because caret is inside it (start=${String(kept.start + 1)}, end=${String(kept.end + 1)})`
					);
				else log('Keeping 1 region open (caret region detection returned no match)');
				log(`Intended to close ${String(lines.length)} regions; kept open 1`);

				// eslint-disable-next-line @typescript-eslint/prefer-for-of
				for (let i = 0; i < lines.length; i++) {
					await vscode.commands.executeCommand('editor.unfold', {
						selectionLines: [lines[i]]
					});
					await vscode.commands.executeCommand('editor.fold', {
						selectionLines: [lines[i]]
					});
				}
				return;
			}

			// Not inside a region: fold all marker regions
			log('Action: close all regions (caret not inside any region)');
			log(`Intended to close ${String(ranges.length)} regions; kept open 0`);
			await vscode.commands.executeCommand('editor.foldAllMarkerRegions');
		} catch (err) {
			log(`Error while folding: ${String(err)}`);
		} finally {
			finished = true;
		}
	};

	// One-shot selection listener for the active editor
	const selectionListener = vscode.window.onDidChangeTextEditorSelection((e) => {
		if (finished) return;

		if (e.textEditor.document.uri.fsPath !== filePath) return;

		const pos = e.selections[0].active;
		log(
			`Selection changed: line ${String(pos.line + 1)}, character ${String(pos.character + 1)}`
		);
		const line = pos.line;
		cleanup(selectionListener, timeout);
		void doFold(line);
	});

	// Fallback if no selection change happens shortly
	const timeout = setTimeout(() => {
		cleanup(selectionListener, timeout);
		void doFold(undefined);
	}, 450);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
	// Track which documents are currently open so we only auto-fold on first open
	const existingDocs = vscode.workspace.textDocuments.map((d) => d.uri.fsPath);
	const tracker = new OpenDocumentTracker(existingDocs);

	// Create output channel for logging
	output = vscode.window.createOutputChannel('Better Regions');
	context.subscriptions.push(output);
	log('Extension activated');

	// Initial active editor
	void maybeAutoFold(tracker, vscode.window.activeTextEditor);

	// When the active editor changes, check if we should fold
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((e) => void maybeAutoFold(tracker, e))
	);

	// Mark closed when a file tab actually closes (primary signal)
	context.subscriptions.push(
		vscode.window.tabGroups.onDidChangeTabs((e) => {
			for (const tab of e.closed) {
				const uri = getFileUriFromTab(tab);
				if (!uri) continue;

				// Only mark closed if no other tab still has this resource open
				const key = uri.fsPath;
				const stillOpenSomewhere = vscode.window.tabGroups.all.some((g) =>
					g.tabs.some((t) => {
						const u = getFileUriFromTab(t);
						return u ? u.fsPath === key : false;
					})
				);
				if (!stillOpenSomewhere) {
					tracker.markClosed(key);
					log(`File closed (tab): ${uri.fsPath}`);
				}
			}
		})
	);

	// When a document is fully closed, allow folding again next time it's opened
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => {
			if (doc.isUntitled || doc.uri.scheme !== 'file') return;
			const filePath = doc.uri.fsPath;

			tracker.markClosed(filePath);
			log(`File closed: ${filePath}`);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
	log('Extension deactivated');
}
