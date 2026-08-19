const DB_NAME = "kinksync-contract-artifacts";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

export interface ContractPdfArtifact {
  key: string;
  seriesId: string;
  versionId: string;
  contentHash: string;
  pdfHash: string;
  filename: string;
  createdAt: number;
  bytes: ArrayBuffer;
}

export interface SerializedContractPdfArtifact {
  seriesId: string;
  versionId: string;
  contentHash: string;
  pdfHash: string;
  filename: string;
  createdAt: number;
  bytes: string;
}

function artifactKey(seriesId: string, versionId: string): string {
  return `${seriesId}:${versionId}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256Base64Url(bytes: ArrayBuffer): Promise<string> {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Lokale documentopslag is niet beschikbaar"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokale documentopslag kon niet worden geopend"));
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    run(store, resolve, reject);
  });
}

export async function putContractPdfArtifact(input: {
  seriesId: string;
  versionId: string;
  contentHash: string;
  filename: string;
  bytes: ArrayBuffer;
  createdAt?: number;
}): Promise<ContractPdfArtifact> {
  const bytes = input.bytes.slice(0);
  const artifact: ContractPdfArtifact = {
    key: artifactKey(input.seriesId, input.versionId),
    seriesId: input.seriesId,
    versionId: input.versionId,
    contentHash: input.contentHash,
    pdfHash: await sha256Base64Url(bytes),
    filename: input.filename,
    createdAt: input.createdAt ?? Date.now(),
    bytes,
  };
  await transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(artifact);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  return artifact;
}

export async function getContractPdfArtifact(
  seriesId: string,
  versionId: string,
): Promise<ContractPdfArtifact | null> {
  const artifact = await transact<ContractPdfArtifact | null>("readonly", (store, resolve, reject) => {
    const request = store.get(artifactKey(seriesId, versionId));
    request.onsuccess = () => resolve((request.result as ContractPdfArtifact | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  if (!artifact) return null;
  if (artifact.pdfHash !== await sha256Base64Url(artifact.bytes)) return null;
  return artifact;
}

export async function deleteAllContractArtifacts(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    });
  } catch {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }
}

export async function exportContractPdfArtifacts(): Promise<SerializedContractPdfArtifact[]> {
  if (typeof indexedDB === "undefined") return [];
  let artifacts: ContractPdfArtifact[];
  try {
    artifacts = await transact<ContractPdfArtifact[]>("readonly", (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as ContractPdfArtifact[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
  const result: SerializedContractPdfArtifact[] = [];
  for (const artifact of artifacts) {
    if (artifact.pdfHash !== await sha256Base64Url(artifact.bytes)) continue;
    result.push({
      seriesId: artifact.seriesId,
      versionId: artifact.versionId,
      contentHash: artifact.contentHash,
      pdfHash: artifact.pdfHash,
      filename: artifact.filename,
      createdAt: artifact.createdAt,
      bytes: bytesToBase64Url(new Uint8Array(artifact.bytes)),
    });
  }
  return result;
}

export async function restoreContractPdfArtifacts(
  incoming: readonly SerializedContractPdfArtifact[],
): Promise<number> {
  let restored = 0;
  for (const candidate of incoming) {
    if (!candidate || typeof candidate !== "object"
      || typeof candidate.seriesId !== "string" || typeof candidate.versionId !== "string"
      || typeof candidate.contentHash !== "string" || typeof candidate.pdfHash !== "string"
      || typeof candidate.filename !== "string" || typeof candidate.bytes !== "string"
      || typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt)) continue;
    try {
      const decoded = base64UrlToBytes(candidate.bytes);
      const bytes = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer;
      if (await sha256Base64Url(bytes) !== candidate.pdfHash) continue;
      await putContractPdfArtifact({
        seriesId: candidate.seriesId,
        versionId: candidate.versionId,
        contentHash: candidate.contentHash,
        filename: candidate.filename,
        bytes,
        createdAt: candidate.createdAt,
      });
      restored += 1;
    } catch {
      // One damaged binary document must not invalidate the rest of a backup.
    }
  }
  return restored;
}

export function contractPdfBlob(artifact: ContractPdfArtifact): Blob {
  return new Blob([artifact.bytes], { type: "application/pdf" });
}
