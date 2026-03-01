import { WallRect } from "./types";
import { WALL_THICKNESS, DOOR_WIDTH } from "./constants";

/**
 * Build wall segments for a rectangular building.
 * The door is a gap on the specified side (default: "bottom", centered).
 * Returns up to 8 thin wall rects (2 per side, split around the door on the door side).
 */
export function buildWalls(
  bx: number,
  by: number,
  bw: number,
  bh: number,
  doorSide: "top" | "bottom" | "left" | "right" = "bottom",
): WallRect[] {
  const t = WALL_THICKNESS;
  const d = DOOR_WIDTH;
  const walls: WallRect[] = [];

  // Helper: full side segments
  const top = (): WallRect => ({ x: bx, y: by, w: bw, h: t });
  const bottom = (): WallRect => ({ x: bx, y: by + bh - t, w: bw, h: t });
  const left = (): WallRect => ({ x: bx, y: by, w: t, h: bh });
  const right = (): WallRect => ({ x: bx + bw - t, y: by, w: t, h: bh });

  // Split a horizontal wall around a centered door gap
  const splitH = (wx: number, wy: number, ww: number): WallRect[] => {
    const mid = wx + ww / 2;
    const l = mid - d / 2 - wx;
    const r = wx + ww - (mid + d / 2);
    return [
      { x: wx, y: wy, w: l, h: t },
      { x: mid + d / 2, y: wy, w: r, h: t },
    ];
  };

  // Split a vertical wall around a centered door gap
  const splitV = (wx: number, wy: number, wh: number): WallRect[] => {
    const mid = wy + wh / 2;
    const topH = mid - d / 2 - wy;
    const bottomH = wy + wh - (mid + d / 2);
    return [
      { x: wx, y: wy, w: t, h: topH },
      { x: wx, y: mid + d / 2, w: t, h: bottomH },
    ];
  };

  if (doorSide === "bottom") {
    walls.push(top(), left(), right(), ...splitH(bx, by + bh - t, bw));
  } else if (doorSide === "top") {
    walls.push(...splitH(bx, by, bw), left(), right(), bottom());
  } else if (doorSide === "left") {
    walls.push(top(), ...splitV(bx, by, bh), right(), bottom());
  } else {
    walls.push(top(), left(), ...splitV(bx + bw - t, by, bh), bottom());
  }
  return walls;
}

/** AABB overlap test */
export function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
