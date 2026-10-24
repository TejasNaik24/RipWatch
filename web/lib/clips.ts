import type { MaskSource } from "./types";

// Clip IDs come from notes/contract.md. Display names are web-only
// presentation and are not part of the data contract.
export interface ClipMeta {
  id: string;
  camera: string;
  location: string;
}

export const CLIPS: ClipMeta[] = [
  { id: "clip1_obvious", camera: "CAM 01", location: "North Beach, Tower 3" },
  { id: "clip2_sneaky", camera: "CAM 02", location: "Pier Point, Tower 5" },
  { id: "clip3_norip", camera: "CAM 03", location: "South Cove, Tower 7" },
];

export const DEFAULT_THRESHOLD = 0.5;

export const SOURCE_LABEL: Record<MaskSource, string> = {
  baseline: "Baseline",
  ripwatch: "RipWatch",
};

export function clipVideoUrl(clipId: string) {
  return `/data/clips/${clipId}.mp4`;
}
