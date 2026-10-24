// Mirrors notes/contract.md. Keep in sync with the contract.

export type Point = [number, number];

export interface Detection {
  polygon?: Point[];
  box?: [number, number, number, number];
  conf: number;
}

export interface FrameEntry {
  i: number;
  detections: Detection[];
}

export interface MaskFile {
  fake?: boolean;
  clipId: string;
  model: string;
  fps: number;
  width: number;
  height: number;
  frames: FrameEntry[];
}

export interface BoxLevel {
  f2: number;
  precision: number;
  recall: number;
  tp: number;
  fp: number;
  fn: number;
}

export interface ImageLevel extends BoxLevel {
  tn: number;
}

export interface ModelMetrics {
  name: string;
  // f2, precision and recall are box level (IoU >= 0.5), as in the original contract.
  f2: number;
  precision: number;
  recall: number;
  // Optional (notes/contract.md section 3). Old files lack them and the page falls back to box level.
  imageLevel?: ImageLevel;
  boxLevel?: BoxLevel;
}

export interface Metrics {
  fake?: boolean;
  models: ModelMetrics[];
  heldOutFrames: number;
  ripFrames?: number;
  noRipFrames?: number;
  notes: string;
}

export type MaskSource = "ripwatch" | "baseline";
