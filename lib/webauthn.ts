function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function unb64url(s: string): ArrayBuffer {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const u8 = Uint8Array.from(atob(b), c => c.charCodeAt(0));
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    typeof (window as Window & { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === "function";
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  try {
    return await (window as Window & { PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean> } }).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "KinkSync", id: window.location.hostname },
      user: { id: userId, name: "kinksync-user", displayName: "KinkSync" },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!credential) throw new Error("Registratie geannuleerd");
  return b64url(credential.rawId);
}

export async function verifyBiometric(credentialIdB64: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: unb64url(credentialIdB64), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!assertion) return false;
    return b64url(assertion.rawId) === credentialIdB64;
  } catch {
    return false;
  }
}
