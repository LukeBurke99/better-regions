import * as vscode from 'vscode';
import { Settings } from './types';

/**
 * Read the settings for this extension and set default values
 */
export function getSettings(): Settings {
	const cfg = vscode.workspace.getConfiguration('betterRegions');
	return {
		enableForAllFiles: cfg.get<boolean>('enableForAllFiles', true),
		enabledFiles: cfg.get<string[]>('enabledFiles', []),
		disabledFiles: cfg.get<string[]>('disabledFiles', [])
	};
}
