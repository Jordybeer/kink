import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, seedAndGo } from "./fixtures";

type DeferredCameraWindow = Window & {
  __activeCameraTracks?: number;
  __playRejectCalls?: number;
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
    cameraWindow.__activeCameraTracks = 0;
    cameraWindow.__playRejectCalls = 0;
    cameraWindow.__stoppedCameraTracks = 0;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => {
          const stream = new MediaStream();
          let stopped = false;
          cameraWindow.__activeCameraTracks = (cameraWindow.__activeCameraTracks ?? 0) + 1;
          Object.defineProperty(stream, "getTracks", { value: () => [{
            stop: () => {
              if (stopped) return;
              stopped = true;
              cameraWindow.__activeCameraTracks = Math.max(0, (cameraWindow.__activeCameraTracks ?? 0) - 1);
              cameraWindow.__stoppedCameraTracks = (cameraWindow.__stoppedCameraTracks ?? 0) + 1;
            },
          }] });
          return Promise.resolve(stream);
        },
      },
    });
    HTMLMediaElement.prototype.play = () => {
      cameraWindow.__playRejectCalls = (cameraWindow.__playRejectCalls ?? 0) + 1;
      return Promise.reject(new Error("playback blocked"));
    };
  });
}

async function expectRejectedPlaybackStoppedCamera(page: Page) {
  await expect.poll(() => page.evaluate(
    () => (window as DeferredCameraWindow).__playRejectCalls ?? 0,
  )).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(
    () => (window as DeferredCameraWindow).__stoppedCameraTracks ?? 0,
  )).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(
    () => (window as DeferredCameraWindow).__activeCameraTracks ?? 0,
  )).toBe(0);
}

test("stopt een profielcamera die pas na sluiten beschikbaar komt", async ({ page }) => {
  await installDeferredCamera(page);
  await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

  await page.getByRole("button", { name: /^Scan partnerprofiel\b/ }).click();
  await expect(page.getByRole("dialog", { name: "QR-code scannen" })).toBeVisible();
  await page.getByRole("button", { name: "Annuleer" }).click();
  await expect(page.getByRole("dialog", { name: "QR-code scannen" })).toBeHidden();

  await resolveCameraAfterClose(page);
});

test("stopt een contractcamera die pas na sluiten beschikbaar komt", async ({ page }) => {
  await installDeferredCamera(page);
  await seedAndGo(page, "/contracts", [PROFILE_ALEX]);

  await page.getByRole("button", { name: "Contract van partner scannen" }).click();
  await expect(page.getByRole("dialog", { name: "Contract van partner scannen" })).toBeVisible();
  await page.getByRole("button", { name: "Annuleer" }).click();
  await expect(page.getByRole("dialog", { name: "Contract van partner scannen" })).toBeHidden();

  await resolveCameraAfterClose(page);
});

test("stopt de profielcamera als video afspelen faalt", async ({ page }) => {
  await installPlaybackRejectingCamera(page);
  await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: true });

  await page.getByRole("button", { name: /^Scan partnerprofiel\b/ }).click();
  await expectRejectedPlaybackStoppedCamera(page);
});

test("stopt de contractcamera als video afspelen faalt", async ({ page }) => {
  await installPlaybackRejectingCamera(page);
  await seedAndGo(page, "/contracts", [PROFILE_ALEX]);

  await page.getByRole("button", { name: "Contract van partner scannen" }).click();
  await expectRejectedPlaybackStoppedCamera(page);
});
