# Compare v2 implementation

Implementation notes for the semantic compare redesign. This branch keeps comparison deterministic, local-first, privacy-first, and based only on explicit visible profile data.

The implementation separates visible input, pair resolution, facts, aggregation, evidence counts, deterministic reason codes, and presentation.
