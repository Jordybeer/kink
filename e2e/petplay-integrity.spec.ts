import { expect, test } from "@playwright/test";
import {
  buildStore,
  CONTRACT_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedAndGo,
} from "./fixtures";

const CONTRACT_URL = "/contract?a=pw-alex-001&b=pw-sam-002";

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
    const seeded = {
      ...baseStore,
      state: {
        ...baseStore.state,
        appLockEnabled: true,
        appLockPin: "e2e-pin-hash",
        biometricEnabled: true,
        biometricCredentialId: "e2e-credential",
      },
    };

    await page.goto("/");
    await page.evaluate(async (store) => {
      localStorage.setItem("kink-profiles", JSON.stringify(store));
      localStorage.setItem("kink-contract-series", JSON.stringify({
        state: { series: [], migratedLegacySnapshotIds: ["legacy"] },
        version: 1,
      }));
      sessionStorage.setItem("app_unlocked", "1");

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
    }, seeded);
    await page.reload();
    await page.waitForLoadState("networkidle");

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
