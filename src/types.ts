export type Settings = {
	enableForAllFiles: boolean;
	enabledFiles: string[];
	disabledFiles: string[];
};

export enum FoldingRangeKind {
	Comment = 1,
	Imports = 2,
	Region = 3
}
export type FoldingRange = { start: number; end: number; kind?: FoldingRangeKind };
