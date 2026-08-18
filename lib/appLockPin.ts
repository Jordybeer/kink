/**
 * Nieuwe app-lock-PINs zijn exact vier cijfers.
 *
 * Oudere builds lieten bij het instellen vier tot acht cijfers toe, terwijl het
 * lockscreen er maar vier kon invoeren. Nieuwe PINs blijven daarom strak op vier
 * staan, maar het ontgrendelscherm mag bestaande hashes nog tot acht cijfers
 * proberen zodat een gebruiker niet permanent buiten zijn eigen lokale data
 * blijft staan.
 */
export const APP_LOCK_PIN_LENGTH = 4;
export const LEGACY_APP_LOCK_PIN_MAX_LENGTH = 8;

/**
 * Normaliseer eerst en begrens daarna. Een browser kan `maxLength` al toepassen
 * vóór `onChange`; bij een paste als `12-34` zou eerst afkappen dus `123`
 * opleveren in plaats van `1234`.
 */
export function normalizeAppLockPinInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, APP_LOCK_PIN_LENGTH);
}

/** Voldoet deze invoer aan het formaat voor een nieuw ingestelde PIN? */
export function isValidAppLockPin(pin: string): boolean {
  return pin.length === APP_LOCK_PIN_LENGTH && /^\d+$/.test(pin);
}
