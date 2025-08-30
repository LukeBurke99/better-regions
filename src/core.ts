// Core utilities that do not import 'vscode' so they can be unit tested with mocha

import { Settings } from './types.js';

const IGNORED_FILES = [
	'chat-editing-text-model:',
	'vscode-chat-code-block:',
	'chat-editing-snapshot-text-model:',
	'output:'
];

/**
 * Tracks open documents by their URIs.
 */
export class OpenDocumentTracker {
	private open: Set<string> = new Set<string>();

	public constructor(initialUris: readonly string[] = []) {
		initialUris.forEach((u) => {
			if (!this.#checkIgnored(u)) this.open.add(u);
		});
	}

	public isOpen(uri: string): boolean {
		return this.open.has(uri);
	}

	public markOpened(key: string): boolean {
		if (this.#checkIgnored(key)) return false; // don't add the ignored files to the tracker
		if (this.open.has(key)) return false; // already open

		this.open.add(key);
		return true; // newly opened
	}

	public markClosed(key: string): void {
		this.open.delete(key);
	}

	#checkIgnored(key: string): boolean {
		return IGNORED_FILES.some((ignored) => key.startsWith(ignored));
	}
}

/**
 * Determines if folding is enabled for a specific language.
 * @param settings The extension settings
 * @param languageId The language ID to check
 * @returns True if folding is enabled for the language, false otherwise
 */
export function shouldFoldForLanguage(settings: Settings, languageId: string): boolean {
	const id = (languageId || '').toLowerCase();
	if (settings.enableForAllFiles)
		return !settings.disabledFiles.map((s) => s.toLowerCase()).includes(id);

	return settings.enabledFiles.map((s) => s.toLowerCase()).includes(id);
}

/**
 * Parses the extension settings from the configuration.
 * @param config The configuration object
 * @returns The parsed settings
 */
export function parseSettings(config: { get<T>(key: string, defaultValue: T): T }): Settings {
	return {
		enableForAllFiles: config.get<boolean>('enableForAllFiles', true),
		enabledFiles: config.get<string[]>('enabledFiles', []),
		disabledFiles: config.get<string[]>('disabledFiles', [])
	};
}
