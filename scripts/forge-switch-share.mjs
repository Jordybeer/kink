import fs from "node:fs";

function replaceOnce(path, before, after) {
  const current = fs.readFileSync(path, "utf8");
  const first = current.indexOf(before);
  if (first < 0) throw new Error(`Missing expected source in ${path}: ${before.slice(0, 80)}`);
  if (current.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected unique source in ${path}: ${before.slice(0, 80)}`);
  }
  fs.writeFileSync(path, current.slice(0, first) + after + current.slice(first + before.length));
}

function replaceAllChecked(path, before, after, expectedCount) {
  const current = fs.readFileSync(path, "utf8");
  const count = current.split(before).length - 1;
  if (count !== expectedCount) throw new Error(`Expected ${expectedCount} matches in ${path}, found ${count}: ${before}`);
  fs.writeFileSync(path, current.split(before).join(after));
}

replaceOnce(
  "types/index.ts",
  'export type ProfilePerspective = "dominant" | "submissive";\n',
  `export type ProfilePerspective = "dominant" | "submissive";\n\nexport interface SwitchShareMemberProof {\n  profileId: string;\n  keyId: string;\n  proofHash: string;\n}\n\nexport interface SwitchShareProof {\n  schema: 1;\n  algorithm: "ECDSA-P256-SHA256";\n  groupId: string;\n  name: string;\n  dominant: SwitchShareMemberProof;\n  submissive: SwitchShareMemberProof;\n  dominantSignature: string;\n  submissiveSignature: string;\n}\n`,
);

replaceOnce(
  "types/index.ts",
  '  /** Primary perspective represented by this answer set. */\n  perspective?: ProfilePerspective;\n',
  '  /** Primary perspective represented by this answer set. */\n  perspective?: ProfilePerspective;\n  /** Verified proof that two shared perspective records belong to one Switch identity. */\n  switchShareProof?: SwitchShareProof;\n',
);

replaceOnce(
  "lib/sanitizeProfile.ts",
  'import { stripDeprecatedDirectionalEntries } from "@/lib/directionality";\n',
  'import { stripDeprecatedDirectionalEntries } from "@/lib/directionality";\nimport { sanitizeSwitchShareProof } from "@/lib/switchProfileProof";\n',
);

replaceOnce(
  "lib/sanitizeProfile.ts",
  '  const consentProof = sanitizeProfileConsentProof(r.consentProof);\n  if (consentProof) profile.consentProof = consentProof;\n\n  const isOwnBackupProfile = profile.origin === "own" && profile.isImported !== true;\n',
  '  const consentProof = sanitizeProfileConsentProof(r.consentProof);\n  if (consentProof) profile.consentProof = consentProof;\n  const switchShareProof = sanitizeSwitchShareProof(r.switchShareProof);\n  if (switchShareProof) profile.switchShareProof = switchShareProof;\n\n  const isOwnBackupProfile = profile.origin === "own" && profile.isImported !== true;\n',
);

replaceOnce(
  "lib/backupRestore.ts",
  '} from "@/lib/consentProof";\n',
  '} from "@/lib/consentProof";\nimport { relinkVerifiedSwitchProfiles } from "@/lib/switchProfileProof";\n',
);

replaceOnce(
  "lib/backupRestore.ts",
  '  const sanitizedProfiles = parsed.profiles\n    .map((profile) => sanitizeProfileFull(profile))\n    .filter((profile): profile is Profile => profile !== null);\n',
  '  const rawSanitizedProfiles = parsed.profiles\n    .map((profile) => sanitizeProfileFull(profile))\n    .filter((profile): profile is Profile => profile !== null);\n  const sanitizedProfiles = await relinkVerifiedSwitchProfiles(rawSanitizedProfiles);\n',
);

replaceOnce(
  "lib/parseSharePaste.ts",
  '  if (input.startsWith("3d.") || input.startsWith("3r.") || input.startsWith("4r.")) {\n',
  '  if (input.startsWith("3d.") || input.startsWith("3r.") || input.startsWith("4r.") || input.startsWith("5r.")) {\n',
);

replaceOnce(
  "components/QRModal.tsx",
  'import { encodeProfileShareTransport } from "@/lib/profileShareV3";\n',
  'import { encodeProfileShareTransport, type ProfileShareTransport } from "@/lib/profileShareV3";\nimport { encodeSwitchProfileShareTransport, getSwitchProfilePair } from "@/lib/profileSwitchShare";\n',
);

replaceOnce(
  "components/QRModal.tsx",
  '  const sealProfileConsent = useStore((state) => state.sealProfileConsent);\n',
  '  const sealProfileConsent = useStore((state) => state.sealProfileConsent);\n  const profiles = useStore((state) => state.profiles);\n',
);

replaceOnce(
  "components/QRModal.tsx",
  `  const ownsProfile = !!profile && profile.origin !== "shared" && profile.isImported !== true;\n  const canShareAvatar = ownsProfile && !!profile?.avatarDataUrl;\n  const preferenceKey = profile\n    ? \`${'${profile.id}'}:${'${profile.avatarDataUrl ? "avatar" : "none"}'}:${'${ownsProfile ? "own" : "shared"}'}\`\n    : null;\n`,
  `  const switchPair = profile ? getSwitchProfilePair(profile, profiles) : null;\n  const shareMembers = switchPair ?? (profile ? [profile] : []);\n  const ownsProfile = shareMembers.length > 0\n    && shareMembers.every((member) => member.origin !== "shared" && member.isImported !== true);\n  const avatarSource = ownsProfile ? shareMembers.find((member) => !!member.avatarDataUrl) : undefined;\n  const canShareAvatar = !!avatarSource;\n  const switchVersionKey = switchPair\n    ? switchPair.map((member) => \`${'${member.id}'}:${'${member.updatedAt}'}:${'${member.avatarDataUrl ? "avatar" : "none"}'}\`).join("|")\n    : "single";\n  const preferenceKey = profile\n    ? \`${'${profile.id}'}:${'${profile.avatarDataUrl ? "avatar" : "none"}'}:${'${ownsProfile ? "own" : "shared"}'}:${'${switchVersionKey}'}\`\n    : null;\n`,
);

replaceOnce(
  "components/QRModal.tsx",
  `        const ready = profile.origin === "shared" || profile.isImported\n          ? profile\n          : await sealProfileConsent(profile.id);\n        if (!ready) throw new Error("Profiel kon niet worden bevestigd");\n\n        const avatarOwnerKey = includeAvatar\n          ? useStore.getState().profileOwnerKeys.find((key) => key.profileId === ready.id)\n          : undefined;\n        const transport = await encodeProfileShareTransport(ready, { includeFetLife, includeAvatar, avatarOwnerKey });\n        let share = buildProfileQrBundleSet(\n          window.location.origin,\n          transport.profilePayload,\n          transport.encoded,\n          transport.avatarPayload,\n        );\n        let linkOnly = false;\n\n        if (transport.avatarPayload && share.qrTooLarge) {\n          const profileOnly = buildProfileQrBundleSet(\n            window.location.origin,\n            transport.profilePayload,\n            transport.profilePayload,\n          );\n          if (!profileOnly.qrTooLarge) {\n            share = { ...profileOnly, shareUrl: share.shareUrl };\n            linkOnly = true;\n          }\n        }\n\n        if (cancelled) return;\n        setPreparedProfile(ready);\n        setAvatarSkipped(includeAvatar && !!ready.avatarDataUrl && !transport.avatarPayload);\n        setAvatarLinkOnly(linkOnly);\n`,
  `        let ready: Profile;\n        let transport: ProfileShareTransport;\n        let sharedAvatar = false;\n\n        if (switchPair) {\n          const readyMembers: Profile[] = [];\n          for (const member of switchPair) {\n            const sealed = member.origin === "shared" || member.isImported\n              ? member\n              : await sealProfileConsent(member.id);\n            if (!sealed) throw new Error("Switch-profiel kon niet volledig worden bevestigd");\n            readyMembers.push(sealed);\n          }\n          const [readyDominant, readySubmissive] = readyMembers as [Profile, Profile];\n          const avatarMember = includeAvatar\n            ? readyMembers.find((member) => !!member.avatarDataUrl)\n            : undefined;\n          const switchTransport = await encodeSwitchProfileShareTransport(\n            readyDominant,\n            readySubmissive,\n            {\n              includeFetLife,\n              includeAvatar,\n              avatarProfileId: avatarMember?.id,\n              ownerKeys: useStore.getState().profileOwnerKeys,\n              linkProof: ownsProfile\n                ? undefined\n                : readyDominant.switchShareProof ?? readySubmissive.switchShareProof,\n            },\n          );\n          ready = readyMembers.find((member) => member.id === profile.id) ?? readyDominant;\n          transport = switchTransport;\n          sharedAvatar = switchTransport.avatarEmbedded;\n        } else {\n          ready = profile.origin === "shared" || profile.isImported\n            ? profile\n            : await sealProfileConsent(profile.id);\n          if (!ready) throw new Error("Profiel kon niet worden bevestigd");\n          const avatarOwnerKey = includeAvatar\n            ? useStore.getState().profileOwnerKeys.find((key) => key.profileId === ready.id)\n            : undefined;\n          transport = await encodeProfileShareTransport(ready, {\n            includeFetLife,\n            includeAvatar,\n            avatarOwnerKey,\n          });\n          sharedAvatar = !!transport.avatarPayload;\n        }\n\n        let share = buildProfileQrBundleSet(\n          window.location.origin,\n          transport.profilePayload,\n          transport.encoded,\n          transport.avatarPayload,\n        );\n        let linkOnly = false;\n\n        if (transport.avatarPayload && share.qrTooLarge) {\n          const profileOnly = buildProfileQrBundleSet(\n            window.location.origin,\n            transport.profilePayload,\n            transport.profilePayload,\n          );\n          if (!profileOnly.qrTooLarge) {\n            share = { ...profileOnly, shareUrl: share.shareUrl };\n            linkOnly = true;\n          }\n        }\n\n        if (cancelled) return;\n        setPreparedProfile(ready);\n        setAvatarSkipped(includeAvatar && canShareAvatar && !sharedAvatar);\n        setAvatarLinkOnly(linkOnly);\n`,
);

replaceOnce(
  "components/QRModal.tsx",
  '  const avatarIncluded = !!preparedProfile?.avatarDataUrl && includeAvatar && !avatarSkipped;\n',
  '  const avatarIncluded = canShareAvatar && includeAvatar && !avatarSkipped;\n',
);

replaceOnce(
  "components/QRModal.tsx",
  '{readableAlias && <p className="text-xs mt-1" style={{ color: "var(--yes)" }}>Bron bevestigd · {readableAlias}</p>}\n',
  '{readableAlias && <p className="text-xs mt-1" style={{ color: "var(--yes)" }}>{switchPair ? "Switch-koppeling bevestigd" : `Bron bevestigd · ${readableAlias}`}</p>}\n',
);

replaceOnce(
  "components/QRModal.tsx",
  '          Deelt alle niet-verborgen profielgegevens zonder dataverlies. Deze profielversie wordt door jouw eigendomssleutel bevestigd.\n',
  '          {switchPair ? "Deelt beide Switch-perspectieven samen, met aparte antwoorden en zonder verborgen reacties." : "Deelt alle niet-verborgen profielgegevens zonder dataverlies. Deze profielversie wordt door jouw eigendomssleutel bevestigd."}\n',
);

replaceOnce(
  "components/QRModal.tsx",
  '{avatarInQrSequence && <p className="text-xs text-center mb-1" style={{ color: "var(--yes)" }}>De profielfoto volgt na het profiel en is met dezelfde eigendomssleutel bevestigd.</p>}\n',
  '{avatarInQrSequence && <p className="text-xs text-center mb-1" style={{ color: "var(--yes)" }}>{switchPair ? "De profielfoto reist mee in dezelfde bevestigde Switch-overdracht." : "De profielfoto volgt na het profiel en is met dezelfde eigendomssleutel bevestigd."}</p>}\n',
);

replaceOnce(
  "app/page.tsx",
  'import { decodeSharedProfile } from "@/lib/profileShareV3";\n',
  'import { decodeSharedProfileTransfer } from "@/lib/profileSwitchShare";\n',
);

replaceOnce(
  "app/page.tsx",
  `  const [importPreview, setImportPreview] = useState<Profile | null>(null);\n  const [importDone, setImportDone] = useState(false);\n  const importIdentity = importPreview ? classifyProfileImport(profiles, importPreview) : null;\n`,
  `  const [importTransfer, setImportTransfer] = useState<Profile[] | null>(null);\n  const [importDone, setImportDone] = useState(false);\n  const importPreview = importTransfer?.[0] ?? null;\n  const importIdentities = importTransfer?.map((candidate) => classifyProfileImport(profiles, candidate)) ?? [];\n  const importIdentity = (() => {\n    const sourceConflict = importIdentities.find((identity) => identity.kind === "source-conflict");\n    if (sourceConflict) return sourceConflict;\n    if (importIdentities.length > 0 && importIdentities.every((identity) => identity.kind === "same-code")) {\n      return importIdentities[0];\n    }\n    return importIdentities.find((identity) => identity.kind === "signed-update")\n      ?? importIdentities.find((identity) => identity.kind === "same-name-role")\n      ?? importIdentities.find((identity) => identity.kind === "new")\n      ?? null;\n  })();\n  const isSwitchImport = importTransfer?.length === 2\n    && !!importTransfer[0].switchShareProof\n    && importTransfer.every((candidate) =>\n      candidate.switchShareProof?.groupId === importTransfer[0].switchShareProof?.groupId);\n`,
);

replaceOnce(
  "app/page.tsx",
  `        const decoded = await decodeSharedProfile(parsed.encoded);\n        if (!cancelled) setImportPreview(decoded);\n`,
  `        const decoded = await decodeSharedProfileTransfer(parsed.encoded);\n        if (!cancelled) setImportTransfer(decoded.profiles);\n`,
);

replaceOnce(
  "app/page.tsx",
  '              setImportPreview(await decodeSharedProfile(payload));\n',
  '              setImportTransfer((await decodeSharedProfileTransfer(payload)).profiles);\n',
);

replaceAllChecked("app/page.tsx", "setImportPreview(null)", "setImportTransfer(null)", 5);

replaceOnce(
  "app/page.tsx",
  '        title="Profiel importeren?"\n',
  '        title={isSwitchImport ? "Switch-profiel importeren?" : "Profiel importeren?"}\n',
);

replaceOnce(
  "app/page.tsx",
  '                  {importPreview.role}\n',
  '                  {isSwitchImport ? "Switch" : importPreview.role}\n',
);

replaceOnce(
  "app/page.tsx",
  '                {Object.values(importPreview.entries).filter((entry) => entry.status).length} kinks beoordeeld\n',
  '                {(importTransfer ?? [importPreview]).reduce((total, candidate) => total + Object.values(candidate.entries).filter((entry) => entry.status).length, 0)} kinks beoordeeld{isSwitchImport ? " · 2 perspectieven" : ""}\n',
);

replaceOnce(
  "app/page.tsx",
  '                {importPreview.consentProof ? "Bron bevestigd" : "Niet ondertekend"} · {profileConsentAlias(importPreview)}\n',
  '                {isSwitchImport ? "Switch-koppeling bevestigd" : `${importPreview.consentProof ? "Bron bevestigd" : "Niet ondertekend"} · ${profileConsentAlias(importPreview)}`}\n',
);

replaceOnce(
  "app/page.tsx",
  '              Profiel geïmporteerd\n',
  '              {isSwitchImport ? "Switch-profiel geïmporteerd" : "Profiel geïmporteerd"}\n',
);

replaceOnce(
  "app/page.tsx",
  `              onClick={() => {\n                if (!importPreview) return;\n                importProfiles([{\n                  ...importPreview,\n                  verificationCode: getProfileVerificationCode(importPreview),\n                  isImported: true,\n                  origin: "shared",\n                  lockedAt: Date.now(),\n                }]);\n                setImportDone(true);\n`,
  `              onClick={() => {\n                if (!importTransfer?.length) return;\n                importProfiles(importTransfer.map((candidate) => ({\n                  ...candidate,\n                  verificationCode: getProfileVerificationCode(candidate),\n                  isImported: true,\n                  origin: "shared" as const,\n                  lockedAt: Date.now(),\n                })));\n                setImportDone(true);\n`,
);

replaceOnce(
  "app/page.tsx",
  `              {importIdentity?.kind === "signed-update"\n                ? "Bevestigde update importeren"\n                : importIdentity?.kind === "same-name-role"\n                  ? "Importeer als apart profiel"\n                  : "Importeer profiel"}\n`,
  `              {isSwitchImport\n                ? importIdentity?.kind === "signed-update"\n                  ? "Bevestigde Switch-update importeren"\n                  : "Importeer Switch-profiel"\n                : importIdentity?.kind === "signed-update"\n                  ? "Bevestigde update importeren"\n                  : importIdentity?.kind === "same-name-role"\n                    ? "Importeer als apart profiel"\n                    : "Importeer profiel"}\n`,
);

replaceOnce(
  "directie.md",
  'Nog niet automatisch uitgerold naar andere kinks: iedere volgende directionele kandidaat vereist dezelfde item-per-item audit.\n',
  `Nog niet automatisch uitgerold naar andere kinks: iedere volgende directionele kandidaat vereist dezelfde item-per-item audit.\n\n### Switch delen\n\nEen Switch blijft intern twee onafhankelijke answer maps houden, maar is extern één identiteit. Delen/exporteren bundelt daarom het Dominant- en Submissive-perspectief in één overdracht. De koppeling wordt door beide bestaande profieleigendomssleutels ondertekend; twee losse geldige profielen mogen nooit achteraf als één Switch kunnen worden samengeplakt. Import herstelt de twee perspectieven als één lokaal gegroepeerde persoon zonder antwoorden tussen de kanten te kopiëren.\n`,
);

for (const path of [
  "types/index.ts",
  "lib/sanitizeProfile.ts",
  "lib/backupRestore.ts",
  "lib/parseSharePaste.ts",
  "components/QRModal.tsx",
  "app/page.tsx",
  "directie.md",
]) {
  const content = fs.readFileSync(path, "utf8");
  if (content.includes("setImportPreview")) throw new Error(`Stale import preview setter in ${path}`);
}

console.log("Switch share forge applied cleanly.");
