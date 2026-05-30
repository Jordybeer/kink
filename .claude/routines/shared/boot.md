# Boot Instructions

## Starting the dev server

1. Install dependencies if `node_modules` is missing:
   ```bash
   npm ci
   ```

2. Install Playwright browsers if not cached:
   ```bash
   npx playwright install chromium
   ```

3. Start the dev server in the background:
   ```bash
   npm run dev &
   ```

4. **Wait for ready** — poll until the server responds before opening any browser:
   ```bash
   for i in $(seq 1 30); do
     curl -sf http://localhost:3000 > /dev/null && echo "ready" && break
     sleep 1
   done
   ```
   If not ready after 30s, abort and report "Dev server failed to start".

5. Open Playwright against `http://localhost:3000`.

## Notes
- The app is purely client-side (no API routes that need env vars for basic UX testing).
- Each browser context should use `storageState: undefined` so localStorage starts clean unless a persona explicitly seeds it.
- For HiDPI fidelity, launch with `--device-scale-factor 2` or use Playwright's `iPhone 14` device preset for mobile tests.
