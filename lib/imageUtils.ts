const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_SHARED_AVATAR_CHARS = 20_000;

interface CanvasAttempt {
  size: number;
  quality: number;
}

function drawSquareAvatar(img: HTMLImageElement, size: number, quality: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");

  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Afbeelding kon niet worden gelezen"));
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

export function resizeImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) return Promise.reject(new Error("Afbeelding is te groot (max 20 MB)"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          resolve(drawSquareAvatar(img, 256, 0.7));
        } catch (error) {
          reject(error);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-encodes an existing local avatar specifically for animated QR transport.
 * The stored 256px avatar remains untouched; only the shared copy is reduced.
 */
export async function prepareAvatarForShare(dataUrl: string): Promise<string | undefined> {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return undefined;

  try {
    const img = await loadDataUrl(dataUrl);
    const attempts: CanvasAttempt[] = [
      { size: 160, quality: 0.62 },
      { size: 144, quality: 0.52 },
      { size: 128, quality: 0.44 },
    ];
    for (const attempt of attempts) {
      const encoded = drawSquareAvatar(img, attempt.size, attempt.quality);
      if (encoded.length <= MAX_SHARED_AVATAR_CHARS) return encoded;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
