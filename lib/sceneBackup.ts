import type { SceneItem, SceneRecord } from "@/types";
import { verifySceneConsentRecord } from "@/lib/sceneConsentVerification";

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const optionalText = (value: unknown) => value === undefined || typeof value === "string";

function validItem(value: unknown): value is SceneItem {
  return record(value)
    && [value.id, value.name, value.duration, value.note].every((part) => typeof part === "string")
    && ["zacht", "midden", "intens"].includes(String(value.intensity))
    && typeof value.fromKink === "boolean" && optionalText(value.kinkId)
    && (value.tags === undefined || (Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string")));
}

/** Validate the archive before it can reach Scene or its consent UI. Never strip invalid proof and call it unsigned. */
export async function sanitizeSceneBackup(value: unknown): Promise<SceneRecord[]> {
  if (!Array.isArray(value)) return [];
  const scenes: SceneRecord[] = [];
  for (const raw of value.slice(0, 50)) {
    if (!record(raw)
      || ![raw.id, raw.title, raw.profileAId, raw.profileBId, raw.profileAName, raw.profileBName].every((part) => typeof part === "string")
      || !raw.id || !finite(raw.createdAt) || !finite(raw.updatedAt)
      || !["draft", "planned", "completed"].includes(String(raw.status))
      || ![raw.plannedDate, raw.plannedTime, raw.safeword].every(optionalText)
      || !Array.isArray(raw.items) || !raw.items.every(validItem)) continue;
    if (raw.aftercare !== undefined && (!record(raw.aftercare)
      || !["green", "amber", "red"].includes(String(raw.aftercare.trafficLight))
      || typeof raw.aftercare.wentWell !== "string" || typeof raw.aftercare.remember !== "string"
      || !finite(raw.aftercare.completedAt))) continue;

    const scene = structuredClone(raw) as unknown as SceneRecord;
    if ([raw.consentSnapshots, raw.consentAgreement, raw.consentLedger, raw.consentLockedAt].some((part) => part !== undefined)) {
      if (!finite(raw.consentLockedAt) || !Array.isArray(raw.consentLedger)
        || !raw.consentLedger.every((event) => record(event)
          && ["locked", "changed", "withdrawn"].includes(String(event.type))
          && typeof event.id === "string" && finite(event.createdAt) && optionalText(event.note))) continue;
      try {
        if ((await verifySceneConsentRecord(scene)).status !== "valid") continue;
      } catch {
        continue;
      }
    }
    scenes.push(scene);
  }
  return scenes;
}

/** A backup cannot roll back an existing scene or a later withdrawal. */
export function mergeSceneBackup(current: SceneRecord[], incoming: SceneRecord[]) {
  const merged = new Map(current.map((scene) => [scene.id, scene]));
  let added = 0;
  for (const scene of incoming) {
    if (merged.has(scene.id) || merged.size >= 50) continue;
    merged.set(scene.id, scene);
    added += 1;
  }
  return { scenes: [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt), added };
}
