# Ideas & parked features

## Live sessie — gepauzeerd

WebRTC peer-to-peer live kink matching. Code exists at `app/session/page.tsx` and `lib/webrtc.ts` but is hidden from the UI.

**Why parked:** truly serverless P2P requires exchanging SDP offers (~2KB) between devices. QR codes can't hold that. The relay workaround (Vercel KV, 120s TTL) works technically but breaks the privacy promise — even though kink data never touches it, the SDP contains IP addresses.

**Options worth revisiting:**

### Option A — Local network only (no relay)
Use the [`experimental` `getDisplayMedia` + `RTCDataChannel` over LAN trick]: skip ICE entirely with `iceTransportPolicy: "all"` and show a short manually-typed code (6 chars) that encodes *just* the local IP + port. Works only on same WiFi but is fully offline. Feasible if you're okay with a "same WiFi required" UX constraint.

### Option B — NFC tap
Web NFC API (`NDEFReader`) is available on Android Chrome. One device writes the SDP offer to an NFC record, other device taps and reads it. Zero server, zero QR. Fallback to manual for iOS. Worth trying once the Web NFC API matures.

### Option C — Self-hosted signaling on kinksync.be
A single ~30-line WebSocket server (Cloudflare Worker with Durable Objects, or a $5/mo VPS) that acts as a proper signaling relay. Honest in the UI: "verbinding via kinksync.be relay, kinkdata P2P". No privacy issue since you own the server. Clean.

### Option D — Compress SDP and use QR after all
A data-only WebRTC SDP without waiting for all ICE candidates (trickle ICE, send offer before ICE gathering) drops from ~2KB to ~500-700 chars. Add LZ-string compression (~40% smaller). After base64 that's ~600 chars — borderline scannable at 240px with L error correction. Fragile but no server.

### Option E — Bluetooth / WebBluetooth
Not viable today. Web Bluetooth doesn't support advertising/peripheral mode in browsers.

---

## Other ideas

### Kink discovery mode
A tinder-style swipe UI where you rate kinks one by one instead of via the list. Builds the same profile data but feels more playful for first-time users.

### Anonymous munch mode
Generate a temporary session at a munch: everyone adds their kinks anonymously, app shows group-level heatmap (what % of the room is into X). No profiles saved, clears on close.

### Kink compatibility score
A single 0–100 score derived from the overlap between two profiles. Could show a breakdown: % hard matches, % one-sided, % conflicts. Useful summary for the compare page header.

### Profile export / backup
Export full profile (including notes and desires) as an encrypted JSON file. Import on another device. Gives users peace of mind about localStorage loss.

### Relationship timeline / scene log
The scene log already exists (`/scene`). A timeline view grouped by month showing intensity trends over time could be interesting.

### Safeword card widget
A lockscreen-style widget or PWA shortcut showing just the safeword(s) from the active contract — one tap access in the moment.
