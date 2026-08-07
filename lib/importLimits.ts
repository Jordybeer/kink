export const BACKUP_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const PROFILE_SHARE_INPUT_MAX_CHARS = 6_001_024;

export function backupFileSizeAllowed(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes >= 0 && bytes <= BACKUP_FILE_MAX_BYTES;
}
