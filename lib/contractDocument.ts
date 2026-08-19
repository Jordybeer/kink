import { buildContractPdf, type Signals } from "@/lib/contractPdf";
import {
  contractVersionById,
  type ContractSeries,
  type ContractVersion,
} from "@/lib/contractLifecycle";
import {
  getContractPdfArtifact,
  putContractPdfArtifact,
  type ContractPdfArtifact,
} from "@/lib/contractArtifacts";
import {
  handwrittenSignatureToPngDataUrl,
  handwrittenSignaturesFromContent,
} from "@/lib/contractHandwriting";

function pdfSignals(signals: { green: string; amber: string; red: string; black: string }): Signals {
  return { green: signals.green, yellow: signals.amber, red: signals.red, black: signals.black };
}

function formattedContractDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function signedVersionForDocument(series: ContractSeries, versionId: string): ContractVersion {
  const version = contractVersionById(series, versionId);
  if (!version?.content || version.state !== "signed" || version.signatures.length !== 2 || version.legacySnapshotId) {
    throw new Error("Alleen een volledig getekende contractversie kan als document worden bewaard");
  }
  if (!handwrittenSignaturesFromContent(version.content)) {
    throw new Error("Deze contractversie bevat geen twee handgeschreven handtekeningen");
  }
  return version;
}

export async function ensureContractPdfArtifact(
  series: ContractSeries,
  versionId: string,
): Promise<ContractPdfArtifact> {
  const version = signedVersionForDocument(series, versionId);
  const existing = await getContractPdfArtifact(series.id, version.id);
  if (existing?.contentHash === version.contentHash) return existing;

  const content = version.content!;
  const handwriting = handwrittenSignaturesFromContent(content)!;
  const { doc, filename } = await buildContractPdf({
    profileA: { name: content.profileA.profileName, role: content.profileA.role },
    profileB: { name: content.profileB.profileName, role: content.profileB.role },
    preamble: content.preamble,
    today: formattedContractDate(content.createdAt),
    signalsA: pdfSignals(content.signalsA),
    signalsB: pdfSignals(content.signalsB),
    aftercareA: [...content.aftercareA],
    aftercareB: [...content.aftercareB],
    sharedAll: content.shared.map((item) => ({ ...item })),
    softLimits: content.softLimits.map((item) => ({ ...item })),
    hardLimitDetails: content.hardLimitDetails.map((item) => ({ ...item })),
    discuss: content.discuss.map((item) => ({ ...item })),
    sigDataA: handwrittenSignatureToPngDataUrl(handwriting.profileA),
    sigDataB: handwrittenSignatureToPngDataUrl(handwriting.profileB),
    sigLabelA: content.realNameA
      ? `${content.realNameA} (${content.profileA.profileName})`
      : content.profileA.profileName,
    sigLabelB: content.realNameB
      ? `${content.realNameB} (${content.profileB.profileName})`
      : content.profileB.profileName,
  });
  const bytes = doc.output("arraybuffer");
  return putContractPdfArtifact({
    seriesId: series.id,
    versionId: version.id,
    contentHash: version.contentHash,
    filename,
    bytes,
    createdAt: Math.max(version.updatedAt, ...version.signatures.map((proof) => proof.signedAt)),
  });
}

export async function artifactForContractVersion(
  series: ContractSeries,
  versionId: string,
): Promise<ContractPdfArtifact | null> {
  const version = contractVersionById(series, versionId);
  if (!version) return null;
  const existing = await getContractPdfArtifact(series.id, versionId);
  if (existing?.contentHash === version.contentHash) return existing;
  if (!version.content || version.state !== "signed" || version.legacySnapshotId
    || version.signatures.length !== 2 || !handwrittenSignaturesFromContent(version.content)) return null;
  try {
    return await ensureContractPdfArtifact(series, versionId);
  } catch {
    return null;
  }
}
