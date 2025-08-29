import * as vscode from 'vscode';
import { parseSettings } from './core.js';
import { Settings } from './types.js';

/**
 * Read the settings for this extension and set default values
 */
export function getSettings(): Settings {
	const cfg = vscode.workspace.getConfiguration('betterRegions');
	return parseSettings(cfg);
}
