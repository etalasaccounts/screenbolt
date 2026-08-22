// Ported as-is from apps/extension/src/pages/Editor/recorderStorage/stageBlobToOpfs.js
// (see docs/specs/07-shared-editor.md) -- pure OPFS/browser API, no
// chrome.* dependency, so it's genuinely portable. Duplicated rather than
// shared because apps/web can't reach into apps/extension's private source
// tree (see docs/architecture.md's "Shared code" section -- recorderStorage
// itself stays app-specific, this is just the one file inside it that
// happens to have no extension-API dependency).
const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const stageBlobToOpfs = async (blob: Blob, ext = "mp4"): Promise<string | null> => {
  if (!blob || typeof blob.size !== "number" || blob.size === 0) return null;
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.getDirectory !== "function"
  ) {
    return null;
  }
  const fileName = `drive-upload-${randomId()}.${ext}`;
  try {
    const dir = await navigator.storage.getDirectory();
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileName;
  } catch {
    try {
      const dir = await navigator.storage.getDirectory();
      await dir.removeEntry(fileName).catch(() => {});
    } catch {}
    return null;
  }
};
