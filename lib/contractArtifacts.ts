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
  run: (
    store: IDBObjectStore,
    succeed: (value: T) => void,
    fail: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let hasResult = false;
    let result!: T;
    let requestError: unknown = null;

    const succeed = (value: T) => {
      result = value;
      hasResult = true;
    };
    const fail = (reason?: unknown) => {
      requestError = reason ?? new Error("Lokale documentopslag kon de bewerking niet afronden");
      try { transaction.abort(); } catch { /* transaction may already be aborting */ }
    };

    transaction.oncomplete = () => {
      db.close();
      if (requestError) {
        reject(requestError);
        return;
      }
      if (!hasResult) {
        reject(new Error("Lokale documentopslag gaf geen resultaat"));
        return;
      }
      resolve(result);
    };
    transaction.onerror = () => {
      const error = requestError ?? transaction.error ?? new Error("Lokale documentopslag is mislukt");
      db.close();
      reject(error);
    };
    transaction.onabort = () => {
      const error = requestError ?? transaction.error ?? new Error("Lokale documentopslag is afgebroken");
      db.close();
      reject(error);
    };

    try {
      run(store, succeed, fail);
    } catch (error) {
      fail(error);
    }
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
  await transact<void>("readwrite", (store, succeed, fail) => {
    const request = store.put(artifact);
    request.onsuccess = () => succeed();
    request.onerror = () => fail(request.error);
  });
  return artifact;
}

export async function getContractPdfArtifact(
  seriesId: string,
  versionId: string,
): Promise<ContractPdfArtifact | null> {
  const artifact = await transact<ContractPdfArtifact | null>("readonly", (store, succeed, fail) => {
    const request = store.get(artifactKey(seriesId, versionId));
    request.onsuccess = () => succeed((request.result as ContractPdfArtifact | undefined) ?? null);
    request.onerror = () => fail(request.error);
  });
  if (!artifact) return null;
  if (artifact.pdfHash !== await sha256Base64Url(artifact.bytes)) return null;
  return artifact;
}

export async function deleteContractArtifactsForSeries(seriesId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await transact<void>("readwrite", (store, succeed, fail) => {
    const request = store.openCursor();
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        succeed();
        return;
      }
      const artifact = cursor.value as ContractPdfArtifact;
      if (artifact.seriesId === seriesId) {
        const deletion = cursor.delete();
        deletion.onerror = () => fail(deletion.error);
      }
      cursor.continue();
    };
  });
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
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
  } catch {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Getekende contractdocumenten konden niet worden verwijderd"));
      request.onblocked = () => reject(new Error("Getekende contractdocumenten zijn nog open in een ander tabblad"));
    });
  }
}

export function contractPdfBlob(artifact: ContractPdfArtifact): Blob {
  return new Blob([artifact.bytes], { type: "application/pdf" });
}
