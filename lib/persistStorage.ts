import type { StateStorage } from "zustand/middleware";

/**
 * Het veiligheidswoord voor de opslag.
 *
 * Zustand's persist schrijft bij elke `set()` naar localStorage en vangt daarbij
 * niets af (`zustand/middleware`: `setItem` staat kaal in de setter-keten). Zit
 * de opslag vol, dan vliegt `QuotaExceededError` dwars door de store-actie en de
 * React-eventhandler heen. Het scherm klopt nog, want de waarde staat in het
 * geheugen, maar na een herlaad is hij weg. Stil dataverlies, precies wat deze
 * app nooit mag doen.
 *
 * Deze wrapper vangt die worp op. Hij herstelt niets en gooit niets weg — een
 * mislukte `setItem` laat de vorige goede staat gewoon staan, en het geheugen
 * blijft autoritair. Wat hij wél doet is één keer roepen, zodat de gebruiker het
 * hoort in plaats van het later te ontdekken.
 */

export const STORAGE_FULL_EVENT = "ks:storage-full";

/** Chrome, Firefox en Safari noemen hetzelfde probleem elk net anders. */
export function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as DOMException).code;
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

function announceStorageFull(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
}

/**
 * Bouwt een StateStorage rond een backing store. De backing store is
 * injecteerbaar zodat een test een volle kluis kan naspelen zonder een echte
 * browser vol te schrijven.
 */
export function createQuotaSafeStorage(
  getBacking: () => Storage | undefined = () =>
    typeof window === "undefined" ? undefined : window.localStorage,
  onQuotaExceeded: () => void = announceStorageFull,
): StateStorage {
  return {
    getItem(name) {
      try {
        return getBacking()?.getItem(name) ?? null;
      } catch {
        // Een onleesbare kluis is geen reden om de app te laten vallen; de store
        // start dan gewoon leeg op.
        return null;
      }
    },

    setItem(name, value) {
      try {
        getBacking()?.setItem(name, value);
      } catch (err) {
        if (isQuotaError(err)) {
          onQuotaExceeded();
          return;
        }
        // Private mode, uitgeschakelde opslag of een andere weigering: ook dan
        // mag de schrijfactie de lopende interactie niet omgooien.
        onQuotaExceeded();
      }
    },

    removeItem(name) {
      try {
        getBacking()?.removeItem(name);
      } catch {
        // Niets te doen; wat er niet uit kan, blijft staan.
      }
    },
  };
}
