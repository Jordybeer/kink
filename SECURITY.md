# Security Policy

## Supported Versions

KinkSync is currently in pre-launch development.

- Before public launch, the current `dev` release candidate is the supported version.
- After public launch, the current `main` release and the next version under active development on `dev` are supported.
- Older branches, releases, and individual historical commits are not supported.

## Reporting a Vulnerability

Do not disclose vulnerability details in a public issue, discussion, pull request, or other public channel.

When GitHub's private vulnerability reporting is available for this repository, use **Security → Advisories → Report a vulnerability**.

If no private reporting option is available, open a minimal public issue titled **Security contact requested** without vulnerability details. The repository owner can then arrange a private communication channel.

Use synthetic data when demonstrating a problem. Never submit real KinkSync profiles, backups, QR payloads, private keys, intimate notes, consent information, or other personally identifiable or sensitive information.

We aim to acknowledge security reports within three business days on a best-effort basis. This is a target, not a guaranteed service-level agreement.

## System and Scope

KinkSync is a mobile-first, local-first Next.js PWA/browser application. It intentionally has no application account backend or server-side profile synchronization. Sensitive application state and ownership keys are stored in the user's browser. The application origin serves the application code and static/runtime assets.

Security-sensitive scope includes:

- profiles and private responses;
- profile ownership and identity proofs;
- profile sharing and comparison;
- consent, scenes, and contracts;
- backup export and restore;
- QR, link, paste, query-string, and other import flows;
- local persistence and offline/PWA behaviour;
- app-lock routing and session gating;
- camera and scanner lifecycle.

## Threat Model and Trust Boundaries

QR payloads, shared links, pasted data, imports, contract envelopes, backups, query parameters, and restored browser data must be treated as attacker-controlled until they have been validated.

A valid cryptographic signature is not by itself proof of identity when both the claimed identity and the verification key originate from the same untrusted envelope. Identity-sensitive operations must be anchored to locally trusted identity or ownership state.

Cryptographic, validation, and parsing failures must fail closed where continuing could expose private data, grant ownership, authorize consent, or replace trusted state.

## Security Invariants

The following properties must hold:

1. A `privateResponse` must not leave its owner through partner-facing UI, inference, scene suggestions, contracts, PDFs, signed/shared content, or equivalent derived output.
2. When app-lock is enabled, sensitive routes must remain gated until the current application session is unlocked.
3. A profile must not become owned or editable without the corresponding local private ownership proof. Shared/imported profiles remain non-owning unless ownership is cryptographically established.
4. Contract participant identity must be anchored to locally trusted identity information rather than an identity/key pair supplied solely by an untrusted envelope.
5. Historical consent or contract snapshots alone must not authorize a new action that requires current consent.
6. Untrusted imports must be size-bounded, structurally validated, and cryptographically verified where applicable before they mutate trusted application state.
7. Background warm-up or prefetch behaviour must not disclose stable local profile, scene, contract, or equivalent identifiers to the application origin.
8. Camera tracks must stop when scanning closes or fails and when a late or stale camera request resolves after the scanner is no longer active.
9. Tampered or cryptographically invalid backup or contract data must not silently replace locally trusted state.

## Reportable Findings and Severity Context

Examples of reportable security issues include:

- disclosure or reliable inference of private responses, consent information, or other sensitive local data;
- bypass of the app-lock boundary for sensitive application routes;
- profile ownership or identity forgery;
- contract or consent authorization bypass;
- cryptographic verification that accepts an attacker-controlled trust anchor;
- malicious import or restore data that can overwrite trusted state without the required validation;
- unbounded processing of attacker-controlled payloads that creates a realistic denial-of-service condition on target mobile devices;
- unintended disclosure of stable local identifiers to the application origin;
- camera capture remaining active after the scanner should have released it.

Impact, reachability, required user interaction, and realistic exposure on KinkSync's supported browser/PWA environments should be considered when assigning severity.

## Out of Scope, Exclusions, and Accepted Risk

KinkSync's app-lock is an application-level privacy gate. It is not encryption at rest and is not intended to protect against an attacker who already controls the user's operating system, unlocked browser profile, developer tools, or underlying browser storage.

Encrypted backup support does not imply that ordinary browser-local application state is encrypted at rest.

Pure visual, wording, layout, or accessibility defects are not security findings unless they break a security or consent property, cause sensitive disclosure, or create a meaningful security boundary failure.

An upstream dependency advisory without a reachable KinkSync security impact is assessed case by case rather than automatically treated as a product vulnerability.

These limitations do not exempt import handling, privacy, consent, identity, ownership, or local-data boundaries from security review.
