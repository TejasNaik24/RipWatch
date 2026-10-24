// Frame = floor(currentTime * fps), nudged by a tiny epsilon.
//
// With fractional fps (RipVIS clips are 30000/1001 = 29.97...), currentTime at an exact frame
// boundary is n / fps, and the float product can come out just under n (for example 2.9999999),
// which would show the previous frame's mask for one tick. 1e-3 of a frame is far below anything
// the video clock can resolve, so it only corrects those boundary cases.
export const FRAME_EPSILON = 1e-3;

/** Zero-based frame index for a playback time in seconds. Use this everywhere an index is computed. */
export function frameIndex(timeSeconds: number, fps: number): number {
  return Math.floor(timeSeconds * fps + FRAME_EPSILON);
}
