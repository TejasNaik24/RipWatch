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

export interface ModelMetrics {
  name: string;
  f2: number;
  precision: number;
  recall: number;
}

export interface Metrics {
  fake?: boolean;
  models: ModelMetrics[];
  heldOutFrames: number;
  notes: string;
}

export type MaskSource = "ripwatch" | "baseline";
