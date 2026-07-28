# Lossless profile sharing v3

## Wire contract

v3 shares every field that is intentionally partner-facing:

- profile identity, immutable profile code, role, experience and relationship status;
- status, desire, experience, comment, tags and curious flag;
- public custom kinks;
- BDSMtest URL and scores;
- FetLife username only after explicit opt-in.

The profile code is a stable lineage and duplicate-detection marker, not cryptographic
proof of identity. The avatar, private note, local scene-use counters, imported/locked metadata and every
`privateResponse` are excluded. A private custom kink is excluded including its name.
The v3 codec has no private-response opt-in: this boundary is enforced in the serializer.

## Transport

The compact JSON wire shape is compressed with the browser-native Deflate stream and
base64url encoded. Browsers without CompressionStream fall back to raw compact v3;
both representations decode losslessly. Encoded input is capped before base64 decoding,
and Deflate output is read incrementally with a 4 MB hard ceiling before JSON parsing.

The copied link carries one complete payload in the URL fragment (`#p3=`), so the
payload does not enter normal server query logs. Existing `?p=` v1/v2 links remain
readable.

## Multi-QR

A short payload uses one QR. Longer payloads are split into 680-character chunks.
Each QR carries transfer id, part number, total and whole-payload checksum. Parts may
arrive out of order; duplicates are ignored. Import begins only after every part is
present and the checksum matches. The modal renders only the currently visible QR,
not the full set in memory. Profiles requiring more than 64 reliable QR parts keep
the complete lossless link but deliberately fall back to link sharing.
