import type { Profile, SceneRecord } from "@/types";

export function sceneForConsentExport(scene: SceneRecord): SceneRecord {
  const agreement = scene.consentAgreement;
  if (!agreement) return scene;

  return {
    ...scene,
    title: agreement.title,
    profileAId: agreement.profileAId,
    profileBId: agreement.profileBId,
    plannedDate: agreement.plannedDate,
    plannedTime: agreement.plannedTime,
    safeword: agreement.safeword,
    items: agreement.items.map((item) => ({
      ...item,
      ...(item.tags ? { tags: [...item.tags] } : {}),
    })),
  };
}

export async function exportConsentBoundScenePdf(
  scene: SceneRecord,
  opts?: { profileA?: Profile; profileB?: Profile },
): Promise<void> {
  const { exportScenePdf } = await import("@/lib/scenePdf");
  await exportScenePdf(sceneForConsentExport(scene), opts);
}
