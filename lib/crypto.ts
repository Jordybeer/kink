const ITERATIONS = 310_000;

function b64(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer)));
}

function unb64(s: string): ArrayBuffer {
  const u8 = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

async function deriveKey(password: string, salt: ArrayBuffer, usage: KeyUsage[]): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

export interface EncryptedBackup {
  encrypted: true;
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function encryptBackup(plaintext: string, password: string): Promise<EncryptedBackup> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16)).buffer.slice(0) as ArrayBuffer;
  const ivBuf = crypto.getRandomValues(new Uint8Array(12)).buffer.slice(0) as ArrayBuffer;
  const key = await deriveKey(password, saltBuf, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuf }, key, new TextEncoder().encode(plaintext));
  return { encrypted: true, salt: b64(saltBuf), iv: b64(ivBuf), ciphertext: b64(ciphertext) };
}

export async function decryptBackup(backup: EncryptedBackup, password: string): Promise<string> {
  const key = await deriveKey(password, unb64(backup.salt), ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(backup.iv) }, key, unb64(backup.ciphertext));
  return new TextDecoder().decode(plain);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const raw = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    raw,
    256
  );
  return `pbkdf2:${b64(salt)}:${b64(bits)}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  // Legacy: 64-char hex SHA-256 (no salt)
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hex === stored;
  }
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const salt = unb64(parts[1]);
  const expected = new Uint8Array(unb64(parts[2]));
  const raw = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    raw,
    256
  ));
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}
