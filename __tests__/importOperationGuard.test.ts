import { describe, expect, it } from "vitest";
import {
  createImportOperationGuard,
  ImportOperationCancelledError,
} from "@/lib/importOperationGuard";

describe("profile import operation guard", () => {
  it("invalidates an in-flight operation when the import is closed or changed", () => {
    const guard = createImportOperationGuard();
    const token = guard.begin();
    expect(guard.isCurrent(token)).toBe(true);

    guard.invalidate();

    expect(guard.isCurrent(token)).toBe(false);
    expect(() => guard.assertCurrent(token)).toThrow(ImportOperationCancelledError);
  });

  it("lets only the newest confirmation generation reach a write", () => {
    const guard = createImportOperationGuard();
    const stale = guard.begin();
    const current = guard.begin();

    expect(() => guard.assertCurrent(stale)).toThrow(ImportOperationCancelledError);
    expect(() => guard.assertCurrent(current)).not.toThrow();
  });

  it("blocks a stale write after an awaited verification finishes", async () => {
    const guard = createImportOperationGuard();
    const token = guard.begin();
    let releaseVerification!: () => void;
    const verification = new Promise<void>((resolve) => {
      releaseVerification = resolve;
    });
    let writes = 0;

    const operation = (async () => {
      await verification;
      guard.assertCurrent(token);
      writes += 1;
    })();

    guard.invalidate();
    releaseVerification();

    await expect(operation).rejects.toBeInstanceOf(ImportOperationCancelledError);
    expect(writes).toBe(0);
  });

  it("reports acceptance even when receiving a candidate invalidates its decode generation", () => {
    const guard = createImportOperationGuard();
    const token = guard.begin();
    let previewOpened = false;
    let scannerOpen = true;
    const accepted = guard.applyIfCurrent(token, () => {
      guard.invalidate(); // replacing the preview starts a new candidate generation
      previewOpened = true;
    });
    if (accepted) scannerOpen = false;

    expect(previewOpened).toBe(true);
    expect(scannerOpen).toBe(false);
  });

  it("does not apply a decoded candidate after cancellation or a newer candidate", () => {
    const guard = createImportOperationGuard();
    const stale = guard.begin();
    guard.begin();
    let writes = 0;
    expect(guard.applyIfCurrent(stale, () => { writes += 1; })).toBe(false);
    expect(writes).toBe(0);
  });
});
