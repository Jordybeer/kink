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
    assertCurrent(token) {
      if (generation !== token) throw new ImportOperationCancelledError();
    },
  };
}
