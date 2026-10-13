export class ImportOperationCancelledError extends Error {
  constructor() {
    super("Profile import operation was cancelled");
    this.name = "ImportOperationCancelledError";
  }
}

export interface ImportOperationGuard {
  begin(): number;
  invalidate(): void;
  isCurrent(token: number): boolean;
  assertCurrent(token: number): void;
  applyIfCurrent(token: number, apply: () => void): boolean;
}

export function createImportOperationGuard(): ImportOperationGuard {
  let generation = 0;
  return {
    begin() {
      generation += 1;
      return generation;
    },
    invalidate() {
      generation += 1;
    },
    isCurrent(token) {
      return generation === token;
    },
    applyIfCurrent(token, apply) {
      if (generation !== token) return false;
      apply();
      // Acceptance is the decision before the callback. Replacing a candidate
      // may invalidate this token without invalidating its scanner dismissal.
      return true;
    },
    assertCurrent(token) {
      if (generation !== token) throw new ImportOperationCancelledError();
    },
  };
}
