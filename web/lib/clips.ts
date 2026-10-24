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

/** Role of each side in /compare. */
export const SOURCE_LABEL: Record<MaskSource, string> = {
  baseline: "Baseline",
  ripwatch: "Fine-tuned",
};

export const RIPWATCH_DISPLAY = "RipWatch (fine-tuned)";
/** Shown only when the baseline mask file has no "model" id, so no version is claimed. */
export const GEMINI_DISPLAY = "Gemini (zero-shot)";

/**
 * Display name from a Gemini model id: "gemini-3.5-flash-lite" -> "Gemini 3.5 Flash Lite (zero-shot)".
 * Keeps the first version number, drops later numeric or "latest" tokens (dates, revisions).
 * Same rule as gemini_display_name in ml/scripts/eval_compare.py, so /compare and /results agree.
 */
export function geminiDisplayName(id: string): string {
  const words: string[] = [];
  let seenVersion = false;
  for (const t of id.trim().replace(/^models\//, "").split("-").filter(Boolean)) {
    if (/^\d+(\.\d+)*$/.test(t)) {
      if (!seenVersion) words.push(t);
      seenVersion = true;
    } else if (t.toLowerCase() !== "latest") {
      words.push(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    }
  }
  return `${words.join(" ")} (zero-shot)`;
}

/** Pane title when a mask file has no "model" field (or could not load). */
export const FALLBACK_MODEL_LABEL: Record<MaskSource, string> = {
  baseline: GEMINI_DISPLAY,
  ripwatch: RIPWATCH_DISPLAY,
};

/**
 * Friendly pane title for the "model" field of a mask file. Known ids get a display name and the
 * raw id is returned too, to show underneath in small mono text. Any other id is shown as is.
 * With no id (missing field, or the file did not load) the per-side fallback title is used.
 */
export function modelDisplay(model: string | undefined, source: MaskSource): { title: string; rawId: string | null } {
  const id = model?.trim();
  if (!id) return { title: FALLBACK_MODEL_LABEL[source], rawId: null };
  if (/^ripwatch/i.test(id)) return { title: RIPWATCH_DISPLAY, rawId: id };
  if (/gemini/i.test(id)) return { title: geminiDisplayName(id), rawId: id };
  return { title: id, rawId: null };
}

export function clipVideoUrl(clipId: string) {
  return `/data/clips/${clipId}.mp4`;
}
