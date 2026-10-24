import type { Detection, MaskFile, MaskSource, Metrics } from "./types";

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export function loadMasks(clipId: string, source: MaskSource) {
  return getJson<MaskFile>(`/data/masks/${clipId}.${source}.json`);
}

export function loadMetrics() {
  return getJson<Metrics>("/data/metrics.json");
}

// Frames are indexed by `i`. Fast path assumes frames[k].i === k; falls back
// to a lookup table when the file is sparse or unordered.
const lookups = new WeakMap<MaskFile, Map<number, Detection[]> | null>();

export function detectionsAt(file: MaskFile, frame: number): Detection[] {
  const n = file.frames.length;
  if (n === 0) return [];
  const idx = ((frame % n) + n) % n;
  const direct = file.frames[idx];
  if (direct.i === idx) return direct.detections;

  let map = lookups.get(file);
  if (map === undefined) {
    map = new Map(file.frames.map((f) => [f.i, f.detections]));
    lookups.set(file, map);
  }
  const last = file.frames[n - 1].i + 1;
  return map?.get(((frame % last) + last) % last) ?? [];
}
