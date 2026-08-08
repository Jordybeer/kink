import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

type DeferredCameraWindow = Window & {
  __resolveDeferredCamera?: () => void;
  __stoppedCameraTracks?: number;
};

async function installDeferredCamera(page: Page) {
  await page.addInitScript(() => {
    const cameraWindow = window as DeferredCameraWindow;
    cameraWindow.__stoppedCameraTracks = 0;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => new Promise<MediaStream>((resolve) => {
          cameraWindow.__resolveDeferredCamera = () => resolve({
            getTracks: () => [{
              stop: () => {
                cameraWindow.__stoppedCameraTracks = (cameraWindow.__stoppedCameraTracks ?? 0) + 1;
              },
            }],
          } as unknown as MediaStream);
        }),
      },
    });
  });
}

async function resolveCameraAfterClose(page: Page) {
  await page.evaluate(() => {
    (window as DeferredCameraWindow).__resolveDeferredCamera?.();
  });
  await expect.poll(() => page.evaluate(
    () => (window as DeferredCameraWindow).__stoppedCameraTracks ?? 0,
  )).toBe(1);
}

async function installPlaybackRejectingCamera(page: Page) {
  await page.addInitScript(() => {
    const cameraWindow = window as DeferredCameraWindow;
    cameraWindow.__stoppedCameraTracks = 0;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{
            stop: () => {
              cameraWindow.__stoppedCameraTracks = (cameraWindow.__stoppedCameraTracks ?? 0) + 1;
            },
          }],
        } as unknown as MediaStream),
      },
    });
    HTMLMediaElement.prototype.play = () => Promise.reject(new Error("playback blocked"));
  });
}

async function expectCameraStopped(page: Page) {
  await expect.poll(() => page.evaluate(
    () => (window as DeferredCameraWindow).__stoppedCameraTracks ?? 0,
  )).toBe(1);
}

test("stopt een profielcamera die pas na sluiten beschikbaar komt", async ({ page }) => {
  await installDeferredCamera(page);
  await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

  await page.getByRole("button", { name: "Scan het profiel van je partner" }).click();
  await expect(page.getByRole("dialog", { name: "QR-code scannen" })).toBeVisible();
  await page.getByRole("button", { name: "Annuleer" }).click();
  await expect(page.getByRole("dialog", { name: "QR-code scannen" })).toBeHidden();

  await resolveCameraAfterClose(page);
});

test("stopt een contractcamera die pas na sluiten beschikbaar komt", async ({ page }) => {
  await installDeferredCamera(page);
  await seedAndGo(page, "/contracts", [PROFILE_ALEX]);

  await page.getByRole("button", { name: "Contractverzoek scannen" }).click();
  await expect(page.getByRole("dialog", { name: "Contractcode scannen" })).toBeVisible();
  await page.getByRole("button", { name: "Annuleer" }).click();
  await expect(page.getByRole("dialog", { name: "Contractcode scannen" })).toBeHidden();

  await resolveCameraAfterClose(page);
});

test("stopt de profielcamera als video afspelen faalt", async ({ page }) => {
  await installPlaybackRejectingCamera(page);
  await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

  await page.getByRole("button", { name: "Scan het profiel van je partner" }).click();
  await expect(page.getByText("Camera kon niet worden gestart. Probeer opnieuw.")).toBeVisible();
  await expectCameraStopped(page);
});

test("stopt de contractcamera als video afspelen faalt", async ({ page }) => {
  await installPlaybackRejectingCamera(page);
  await seedAndGo(page, "/contracts", [PROFILE_ALEX]);

  await page.getByRole("button", { name: "Contractverzoek scannen" }).click();
  await expect(page.getByText("Camera kon niet worden gestart. Probeer opnieuw.")).toBeVisible();
  await expectCameraStopped(page);
});
