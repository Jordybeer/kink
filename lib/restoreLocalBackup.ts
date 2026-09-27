import { sanitizeProfileHistory, mergeProfileHistory } from "@/lib/profileHistoryBackup";
import { sanitizeSceneBackup, mergeSceneBackup } from "@/lib/sceneBackup";
import { prepareBackupRestore } from "@/lib/backupRestore";
import { sanitizeIntimacyBackupEntries } from "@/lib/intimacyBackup";
import { useStore } from "@/lib/store";
import { useContractStore } from "@/lib/contractStore";
import { useIntimacyStore } from "@/lib/intimacyStore";

/** Both JSON and encrypted imports cross the same validation and ownership boundary. */
export async function restoreLocalBackup(raw: unknown, signal?: AbortSignal): Promise<string> {
  const prepared = await prepareBackupRestore(raw);
  const parsed = raw as Record<string, unknown>;
  const intimacyEntries = prepared.source === "backup"
    ? sanitizeIntimacyBackupEntries(parsed.intimacyEntries) : [];
  const scenes = prepared.source === "backup" ? await sanitizeSceneBackup(parsed.scenes) : [];
  const history = prepared.source === "backup" ? sanitizeProfileHistory(parsed.profileSnapshots) : [];
  if (!history.length && !scenes.length && !prepared.profiles.length && !prepared.contracts.length && !prepared.contractSeries.length && !intimacyEntries.length) {
    throw new Error("De backup bevat geen geldige profielen, contracten, scènes of intimiteitsmomenten om te herstellen.");
  }
  signal?.throwIfAborted();
  const knownContractIds = new Set(useStore.getState().contracts.map((contract) => contract.id));
  const contractsAdded = prepared.contracts.filter((contract) => !knownContractIds.has(contract.id)).length;
  let message: string;

  if (prepared.source === "backup") {
    const result = useStore.getState().restoreBackupProfiles(prepared.profiles, prepared.ownerKeys);
    if (prepared.contracts.length) useStore.getState().restoreContracts(prepared.contracts);
    const seriesResult = useContractStore.getState().restoreSeries(prepared.contractSeries);
    const intimacyResult = useIntimacyStore.getState().restoreEntries(intimacyEntries);

    const sceneResult = mergeSceneBackup(useStore.getState().scenes, scenes);
    if (sceneResult.added) useStore.setState({ scenes: sceneResult.scenes });

    const historyResult = mergeProfileHistory(useStore.getState().profileSnapshots, history);
    if (historyResult.added) useStore.setState({ profileSnapshots: historyResult.profileSnapshots });

    const profileChanges = result.added + result.updated;
    const keyChanges = result.ownerKeysAdded + result.ownerKeysUpdated;
    const seriesChanges = seriesResult.added + seriesResult.updated;
    const intimacyChanges = intimacyResult.added + intimacyResult.updated;

    if (historyResult.added === 0 && sceneResult.added === 0 && profileChanges === 0 && keyChanges === 0 && contractsAdded === 0 && seriesChanges === 0 && intimacyChanges === 0) {
      message = result.conflicts > 0
        ? `Backup gecontroleerd: niets overschreven; ${result.conflicts} bronconflict(en) veilig overgeslagen.`
        : "Backup gecontroleerd: de bestaande gegevens waren al even nieuw of nieuwer.";
    } else {
      message = `Backup hersteld: ${result.added} profiel(en) toegevoegd, ${result.updated} bijgewerkt, ${result.unchanged} ongewijzigd, ${result.conflicts} bronconflict(en) overgeslagen, ${keyChanges} eigendomssleutel(s), ${contractsAdded} oud(e) contract(en), ${seriesChanges} contractreeks(en) en ${intimacyChanges} intimiteitsmoment(en) toegevoegd of bijgewerkt; ${sceneResult.added} scène(s) en ${historyResult.added} profielmoment(en) toegevoegd. Bestaande scènes blijven behouden. Getekende PDF-documenten worden lokaal opnieuw opgebouwd uit de geverifieerde contractversie wanneer je ze opent.`;
    }
  } else {
    useStore.getState().importProfiles(prepared.profiles);
    if (prepared.contracts.length) useStore.getState().restoreContracts(prepared.contracts);
    message = `Import verwerkt: ${prepared.profiles.length} geldig(e) gedeeld(e) profiel(en) en ${contractsAdded} nieuw(e) contract(en).`;
  }

  if (prepared.source === "backup" && Array.isArray(parsed.scenes) && parsed.scenes.length > scenes.length) {
    message += ` ${parsed.scenes.length - scenes.length} scène(s) overgeslagen: ongeldig bewijs, beschadigde data of archieflimiet.`;
  }
  return message;
}
