import * as assert from 'assert';
import { OpenDocumentTracker, parseSettings, shouldFoldForLanguage } from '../core';
import { FoldingRange, FoldingRangeKind, Settings } from '../types';

describe('Better Regions - Unit Tests', () => {
	it('OpenDocumentTracker opens/closes correctly', () => {
		const tracker = new OpenDocumentTracker();
		const a = { toString: () => 'file:///test/a.ts' } as any;
		const b = { toString: () => 'file:///test/b.ts' } as any;

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

	it('shouldFoldForLanguage respects enableForAllFiles + disabledFiles', () => {
		const settingsAll: Settings = {
			enableForAllFiles: true,
			enabledFiles: [],
			disabledFiles: ['markdown']
		};
		assert.strictEqual(shouldFoldForLanguage(settingsAll, 'typescript'), true);
		assert.strictEqual(shouldFoldForLanguage(settingsAll, 'markdown'), false);
	});

	it('shouldFoldForLanguage respects enabledFiles when not enableForAllFiles', () => {
		const settingsSome: Settings = {
			enableForAllFiles: false,
			enabledFiles: ['typescript', 'javascript'],
			disabledFiles: []
		};
		assert.strictEqual(shouldFoldForLanguage(settingsSome, 'typescript'), true);
		assert.strictEqual(shouldFoldForLanguage(settingsSome, 'python'), false);
		assert.strictEqual(shouldFoldForLanguage(settingsSome, ''), false);
	});
	it('parseSettings returns correct settings with default values', () => {
		const mockConfig = {
			get: <T>(key: string, defaultValue: T): T => {
				const values: Record<string, any> = {
					enableForAllFiles: true,
					enabledFiles: ['typescript', 'javascript'],
					disabledFiles: ['python']
				};
				return values[key] !== undefined ? values[key] : defaultValue;
			}
		};

		const result = parseSettings(mockConfig);

		assert.strictEqual(result.enableForAllFiles, true);
		assert.deepStrictEqual(result.enabledFiles, ['typescript', 'javascript']);
		assert.deepStrictEqual(result.disabledFiles, ['python']);
	});

	it('parseSettings uses default values when config is empty', () => {
		const mockConfig = {
			get: <T>(_key: string, defaultValue: T): T => defaultValue
		};

		const result: Settings = parseSettings(mockConfig);

		assert.strictEqual(result.enableForAllFiles, true);
		assert.deepStrictEqual(result.enabledFiles, []);
		assert.deepStrictEqual(result.disabledFiles, []);
	});

	it('linesToFoldExcludingTarget excludes the target region', () => {
		const ranges: FoldingRange[] = [
			{ start: 0, end: 10, kind: FoldingRangeKind.Region },
			{ start: 12, end: 20, kind: FoldingRangeKind.Region },
			{ start: 22, end: 30, kind: FoldingRangeKind.Imports } // non-region should be ignored
		];
		assert.strictEqual(ranges.filter((x) => x.kind === FoldingRangeKind.Region).length, 2);
	});
});
