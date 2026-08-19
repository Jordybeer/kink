import { pbkdf2Sync } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  buildStore,
  CONTRACT_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedAndGo,
} from "./fixtures";

const CONTRACT_URL = "/contract?a=pw-alex-001&b=pw-sam-002";
const PIN_ITERATIONS = 310_000;

function storedPinHash(pin: string): string {
  const salt = Buffer.from("kinksync-petplay-wipe-pin");
  const bits = pbkdf2Sync(pin, salt, PIN_ITERATIONS, 32, "sha256");
  return `pbkdf2:${salt.toString("base64")}:${bits.toString("base64")}`;
}

test.describe("Contractintegriteit", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndGo(page, CONTRACT_URL, [PROFILE_ALEX, PROFILE_SAM]);
  });

  test("maakt handgeschreven handtekeningen verplicht en biedt geen losse PDF-bypass meer", async ({ page }) => {
    await expect(page.getByText("Handgeschreven handtekeningen", { exact: true })).toBeVisible();
    await expect(page.getByText(/optioneel voor PDF/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Opslaan als PDF/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Contract bewaren of digitaal bevestigen" }).click();
    await expect(page.getByText(/Beide handgeschreven handtekeningen zijn verplicht/i)).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Contract opslaan en ondertekenen" })).toHaveCount(0);
  });

  test("contractgeschiedenis gebruikt één chronologische geschiedenis in plaats van twee tabs", async ({ page }) => {
    const seriesId = `legacy-series:${CONTRACT_ALEX_SAM.id}`;
    await seedAndGo(
      page,
      `/contracts/${encodeURIComponent(seriesId)}/history`,
      [PROFILE_ALEX, PROFILE_SAM],
      { contracts: [CONTRACT_ALEX_SAM] },
    );

    await expect(page.getByText("Contractgeschiedenis", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Historische versie bekijken" })).toBeVisible();
  });
});

test.describe("Alle lokale data verwijderen", () => {
  test("wist ook actieve PIN-state, contractstore, sessie en PDF-artifacts", async ({ page }) => {
    const baseStore = buildStore([PROFILE_ALEX]);
    const coreStore = JSON.stringify({
      ...baseStore,
      state: {
        ...baseStore.state,
        appLockEnabled: true,
        appLockPin: storedPinHash("1234"),
      },
    });
    const contractStore = JSON.stringify({
      state: { series: [], migratedLegacySnapshotIds: ["legacy"] },
      version: 1,
    });

    // Seed before the first application script runs, just like the dedicated
    // app-lock E2E. Writing a persist store after hydration lets the already
    // mounted Zustand state win a race on reload and can reopen onboarding.
    await page.addInitScript(
      ({ core, contracts }: { core: string; contracts: string }) => {
        localStorage.setItem("kink-profiles", core);
        localStorage.setItem("kink-contract-series", contracts);
      },
      { core: coreStore, contracts: contractStore },
    );

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "KinkSync ontgrendelen" })).toBeVisible();
    for (const digit of ["1", "2", "3", "4"]) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "KinkSync ontgrendelen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Instellingen openen" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("app_unlocked"))).toBe("1");

    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("kinksync-contract-artifacts", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("pdfs")) {
            request.result.createObjectStore("pdfs", { keyPath: "key" });
          }
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("pdfs", "readwrite");
          transaction.objectStore("pdfs").put({
            key: "series:version",
            seriesId: "series",
            versionId: "version",
            contentHash: "content",
            pdfHash: "hash",
            filename: "contract.pdf",
            createdAt: Date.now(),
            bytes: new Uint8Array([1, 2, 3]).buffer,
          });
          transaction.oncomplete = () => { db.close(); resolve(); };
          transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
      });
    });

    await page.getByRole("button", { name: "Instellingen openen" }).click();
    await page.getByRole("button", { name: /Alle data verwijderen/ }).click();
    await page.getByLabel("Typ wis alles om te bevestigen").fill("wis alles");
    await Promise.all([
      page.waitForLoadState("domcontentloaded"),
      page.getByRole("button", { name: "Vernietig voor altijd" }).click(),
    ]);

    const remaining = await page.evaluate(async () => {
      const artifactCount = await new Promise<number>((resolve) => {
        const request = indexedDB.open("kinksync-contract-artifacts", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("pdfs")) {
            request.result.createObjectStore("pdfs", { keyPath: "key" });
          }
        };
        request.onerror = () => resolve(-1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("pdfs", "readonly");
          const count = transaction.objectStore("pdfs").count();
          count.onsuccess = () => { db.close(); resolve(count.result); };
          count.onerror = () => { db.close(); resolve(-1); };
        };
      });
      return {
        core: localStorage.getItem("kink-profiles"),
        contracts: localStorage.getItem("kink-contract-series"),
        unlocked: sessionStorage.getItem("app_unlocked"),
        artifactCount,
      };
    });

    expect(remaining.core).toBeNull();
    expect(remaining.contracts).toBeNull();
    expect(remaining.unlocked).toBeNull();
    expect(remaining.artifactCount).toBe(0);
  });
});
