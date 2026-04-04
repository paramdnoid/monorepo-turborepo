import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Prüft, ob `candidate` unter `root` liegt (kein Path-Traversal). */
export function isPathInsideRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function absoluteAssetPath(root: string, storageRelativePath: string): string {
  const normalizedRel = path.normalize(storageRelativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.join(path.resolve(root), normalizedRel);
  if (!isPathInsideRoot(root, abs)) {
    throw new Error("path_traversal");
  }
  return abs;
}

export async function writeAssetFile(
  root: string,
  storageRelativePath: string,
  data: Buffer,
): Promise<void> {
  const abs = absoluteAssetPath(root, storageRelativePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data, { mode: 0o640 });
}

export async function removeAssetFile(
  root: string,
  storageRelativePath: string,
): Promise<void> {
  const abs = absoluteAssetPath(root, storageRelativePath);
  try {
    await unlink(abs);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw e;
  }
}

export function createAssetReadStream(
  root: string,
  storageRelativePath: string,
): ReturnType<typeof createReadStream> {
  const abs = absoluteAssetPath(root, storageRelativePath);
  return createReadStream(abs);
}
