import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Expected source not found in ${path}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected source is not unique in ${path}`);
  }
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceOnce(
  "app/page.tsx",
  `  const isSwitchImport = importTransfer?.length === 2
    && !!importTransfer[0].switchShareProof
    && importTransfer.every((candidate) =>
      candidate.switchShareProof?.groupId === importTransfer[0].switchShareProof?.groupId);
`,
  `  const isSwitchImport = importTransfer?.length === 2
    && !!importTransfer[0].switchShareProof
    && !!importTransfer[0].personGroupId
    && importTransfer.every((candidate) =>
      candidate.personGroupId === importTransfer[0].personGroupId);
`,
);

replaceOnce(
  "directie.md",
  "Een Switch blijft intern twee onafhankelijke answer maps houden, maar is extern één identiteit. Delen/exporteren bundelt daarom het Dominant- en Submissive-perspectief in één overdracht. De koppeling wordt door beide bestaande profieleigendomssleutels ondertekend; twee losse geldige profielen mogen nooit achteraf als één Switch kunnen worden samengeplakt. Import herstelt de twee perspectieven als één lokaal gegroepeerde persoon zonder antwoorden tussen de kanten te kopiëren.\n",
  "Een Switch blijft intern twee onafhankelijke answer maps houden, maar is extern één identiteit. Delen/exporteren bundelt daarom het Dominant- en Submissive-perspectief in één overdracht. De koppeling wordt door beide bestaande profieleigendomssleutels ondertekend; twee losse geldige profielen mogen nooit achteraf als één Switch kunnen worden samengeplakt. De interne `personGroupId` reist niet mee. Import leidt een eigen lokale group-ID af uit de bevestigde profiel-ID's en sleutels, en herstelt daarmee de twee perspectieven als één lokaal gegroepeerde persoon zonder antwoorden tussen de kanten te kopiëren.\n",
);

for (const path of ["app/page.tsx", "lib/profileSwitchShare.ts", "lib/switchProfileProof.ts", "types/index.ts"]) {
  const source = fs.readFileSync(path, "utf8");
  if (/switchShareProof\?\.groupId|switchShareProof\.groupId|proof\.groupId/.test(source)) {
    throw new Error(`External Switch groupId reference remains in ${path}`);
  }
}

console.log("Local Switch group boundary patch applied cleanly.");
