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
const DESTROY_SEED_QUERY = "e2eDestroySeed=1";

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

    // Seed before the first application script runs, but only for the initial
    // test URL. DestroyAll reloads the document; by removing this query flag
    // before destruction, the init script cannot repopulate the cleared stores.
    await page.addInitScript(
      ({ core, contracts, seedQuery }: { core: string; contracts: string; seedQuery: string }) => {
        if (!location.search.includes(seedQuery)) return;
        localStorage.setItem("kink-profiles", core);
        localStorage.setItem("kink-contract-series", contracts);
      },
      { core: coreStore, contracts: contractStore, seedQuery: DESTROY_SEED_QUERY },
    );

    await page.goto(`/?${DESTROY_SEED_QUERY}`);
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

    // Keep the current document untouched, but make the destroy-triggered
    // reload land on the ordinary Home URL where the seed script is inert.
    await page.evaluate(() => history.replaceState(null, "", "/"));

    await page.getByRole("button", { name: "Instellingen openen" }).click();
    await page.getByRole("button", { name: /Alle data verwijderen/ }).click();
    await page.getByLabel("Typ wis alles om te bevestigen").fill("wis alles");
    await page.getByRole("button", { name: "Vernietig voor altijd" }).click();

    // The product intentionally reloads after a successful wipe. Waiting on
    // the new onboarding dialog synchronizes with that future navigation rather
    // than accidentally observing the already-loaded pre-destroy document.
    await expect(page.getByRole("dialog", { name: "Welkom bij KinkSync" })).toBeVisible();

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
