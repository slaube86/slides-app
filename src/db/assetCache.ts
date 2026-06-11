import { getAsset, putAsset } from './db';
import type { Asset } from '../types';
import { uid } from '../utils/id';

// Blob-URLs sind teuer und müssen wiederverwendet werden. Wir cachen pro assetId
// eine Object-URL, damit <img> nicht bei jedem Render neu lädt/flackert.
const urlCache = new Map<string, string>();

export async function objectUrlFor(assetId: string): Promise<string | null> {
  const cached = urlCache.get(assetId);
  if (cached) return cached;
  const asset = await getAsset(assetId);
  if (!asset) return null;
  const url = URL.createObjectURL(asset.blob);
  urlCache.set(assetId, url);
  return url;
}

export async function storeImageFile(file: File): Promise<Asset> {
  const asset: Asset = {
    id: uid('a_'),
    blob: file,
    type: file.type,
    createdAt: Date.now(),
  };
  await putAsset(asset);
  return asset;
}

export function revokeAll(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
