/**
 * Hoe lang de PIN is. Eén cijfer, op één plek.
 *
 * Dit bestond niet, en dat kostte bijna een release. `PinFlowSheet` liet vier
 * tot acht cijfers instellen ("Minimaal 4 cijfers", `maxLength={8}`), terwijl
 * `AppLock` vier bolletjes tekende, het vijfde cijfer weigerde en al na vier
 * cijfers ging verifiëren. Wie de uitnodiging van dat woord "minimaal" aannam
 * en er vijf koos, kwam er nooit meer in: geen vergeten-PIN-pad, biometrie
 * optioneel, en de enige uitweg was browseropslag wissen. Dat wist ook de
 * profielen, de contracten en de eigendomssleutels, en die laatste zijn niet
 * opnieuw te maken.
 *
 * Twee schermen die hetzelfde getal apart bijhielden, liepen uit elkaar. Nu
 * lezen ze allebei hier.
 */
export const APP_LOCK_PIN_LENGTH = 4;

/** Voldoet deze invoer aan wat het slot straks accepteert? */
export function isValidAppLockPin(pin: string): boolean {
  return new RegExp(`^\\d{${APP_LOCK_PIN_LENGTH}}$`).test(pin);
}
