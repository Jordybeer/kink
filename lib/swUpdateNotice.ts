// The safeword for the update channel.
//
// A courtesy notification must never hold the install hostage. Without granted
// permission `registration.showNotification()` rejects with a TypeError, and a
// rejected promise handed to `install`'s `waitUntil()` fails the whole
// installation — the fresh worker is discarded and never reaches `waiting`.
// The cruel part: the first install is exempt (no active worker to notify), so
// it only bites on *updates*. Every user who never granted notifications would
// stay collared to the build they installed first, and UpdateBanner would never
// get to whisper "Nieuwe versie beschikbaar".
//
// So the announcement only goes out when consent is already on the record.

export type NotificationConsent = NotificationPermission | undefined;

/**
 * Whether the freshly installed worker may announce itself with a system
 * notification.
 *
 * @param hasActiveWorker — false on the very first install: nobody to tell yet.
 * @param permission — `Notification.permission`, or undefined where the API is absent.
 */
export function shouldAnnounceUpdate(
  hasActiveWorker: boolean,
  permission: NotificationConsent,
): boolean {
  return hasActiveWorker && permission === "granted";
}
