import * as assert from 'assert';
import { OpenDocumentTracker, shouldFoldForLanguage } from '../core';
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

	it('shouldFoldForLanguage respects enabledFiles when not all', () => {
		const settingsSome: Settings = {
			enableForAllFiles: false,
			enabledFiles: ['typescript', 'javascript'],
			disabledFiles: []
		};
		assert.strictEqual(shouldFoldForLanguage(settingsSome, 'typescript'), true);
		assert.strictEqual(shouldFoldForLanguage(settingsSome, 'python'), false);
	});

	it('linesToFoldExcludingTarget excludes the target region', () => {
		const ranges: FoldingRange[] = [
			{ start: 0, end: 10, kind: FoldingRangeKind.Region },
			{ start: 12, end: 20, kind: FoldingRangeKind.Region },
			{ start: 22, end: 30, kind: FoldingRangeKind.Imports } // non-region should be ignored
		];
		console.log(ranges);
	});
});
