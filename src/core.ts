// Core utilities that do not import 'vscode' so they can be unit tested with mocha

export type Settings = {
  enableForAllFiles: boolean;
  enabledFiles: string[];
  disabledFiles: string[];
};

export type FoldingRangeLite = { start: number; end: number; kind?: string };

export class OpenDocumentTracker {
  private open = new Set<string>();

  constructor(initialUris: readonly string[] = []) {
    initialUris.forEach((u) => this.open.add(u));
  }

  isOpen(uri: { toString(): string }): boolean {
    return this.open.has(uri.toString());
  }

  markOpened(uri: { toString(): string }): boolean {
    const key = uri.toString();
    if (this.open.has(key)) {
      return false; // already open
    }
    this.open.add(key);
    return true; // newly opened
  }

  markClosed(uri: { toString(): string }): void {
    this.open.delete(uri.toString());
  }
}

export function shouldFoldForLanguage(
  settings: Settings,
  languageId: string
): boolean {
  const id = (languageId || "").toLowerCase();
  if (settings.enableForAllFiles) {
    return (
      settings.disabledFiles.map((s) => s.toLowerCase()).indexOf(id) === -1
    );
  }
  return settings.enabledFiles.map((s) => s.toLowerCase()).indexOf(id) !== -1;
}

export function linesToFoldExcludingTarget(
  ranges: FoldingRangeLite[],
  targetLine: number | undefined
): number[] {
  if (!ranges || ranges.length === 0) {
    return [];
  }
  const isRegion = (r: FoldingRangeLite) =>
    !r.kind || r.kind.toString().toLowerCase().includes("region");
  const regionRanges = ranges.filter(isRegion);
  if (targetLine === undefined || targetLine === 0) {
    return regionRanges.map((r) => r.start);
  }
  return regionRanges
    .filter((r) => !(targetLine >= r.start && targetLine <= r.end))
    .map((r) => r.start);
}
