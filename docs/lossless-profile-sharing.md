# Lossless profile sharing v3

## Wire contract

v3 shares every field that is intentionally partner-facing:

- profile identity, role, experience and relationship status;
- status, desire, experience, comment, tags and curious flag;
- public custom kinks;
- BDSMtest URL and scores;
- FetLife username only after explicit opt-in.

The avatar, private note, local scene-use counters, imported/locked metadata and every
`privateResponse` are excluded. A private custom kink is excluded including its name.

## Transport

The compact JSON wire shape is compressed with the browser-native Deflate stream and
base64url encoded. Browsers without CompressionStream fall back to raw compact v3;
both representations decode losslessly.

The copied link carries one complete payload in the URL fragment (`#p3=`), so the
payload does not enter normal server query logs. Existing `?p=` v1/v2 links remain
readable.

## Multi-QR

A short payload uses one QR. Longer payloads are split into 680-character chunks.
Each QR carries transfer id, part number, total and whole-payload checksum. Parts may
arrive out of order; duplicates are ignored. Import begins only after every part is
present and the checksum matches.
