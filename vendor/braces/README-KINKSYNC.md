# KinkSync braces security backport

This directory is a repository-local security backport for CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm.

- Upstream base: `micromatch/braces` 3.0.3.
- Guard source reviewed for this backport: `dieub/braces-depth-guard` commit `d18b560e57b7fcdab654ede063898ef11d89e334`.
- The guard is based on the upstream depth-guard work for micromatch/braces#72.
- Local package version: `3.0.4+kinksync.0`. This is not an upstream braces release.
- Scope: bounded parser and recursive AST traversal depth, including cyclic parent-chain protection.
- No install, prepare, postinstall, network, or publish scripts are included.
- Remove this vendored package once an official compatible upstream release contains an equivalent fix and the unchanged audit gate passes with it.

The original MIT license is preserved in `LICENSE`.
