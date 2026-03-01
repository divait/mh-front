export const TILE_URL = new URL("../assets/tile.png", import.meta.url).href;
export const GRASS_URL = new URL("../assets/grass.png", import.meta.url).href;
export const CABARET_URL = new URL("../assets/buildings/cabaret.png", import.meta.url).href;

export const BAKER_FRAMES: string[] = [
  new URL("../assets/baker/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_003.png", import.meta.url).href,
];

export const TAVERN_KEEPER_FRAMES: string[] = [
  new URL("../assets/tavern_keeper/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_003.png", import.meta.url).href,
];

export const GUARD_FRAMES: string[] = [
  new URL("../assets/guard/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_003.png", import.meta.url).href,
];

export const DANCER_FRAMES: string[] = [
  new URL("../assets/dancer/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_003.png", import.meta.url).href,
];

export const INSPECTOR_FRAMES: string[] = [
  new URL("../assets/inspector/idle/south/frame_000.png", import.meta.url).href,
  new URL("../assets/inspector/idle/south/frame_001.png", import.meta.url).href,
  new URL("../assets/inspector/idle/south/frame_002.png", import.meta.url).href,
  new URL("../assets/inspector/idle/south/frame_003.png", import.meta.url).href,
];

export const ARTIST_FRAMES: string[] = [
  new URL("../assets/artist/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/artist/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/artist/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/artist/idle/frame_003.png", import.meta.url).href,
];

export const MAIN_IDLE_FRAMES: string[] = [
  new URL("../assets/main/idle/frame_000.png", import.meta.url).href,
];
export const MAIN_WALK_FRAMES: string[] = [
  new URL("../assets/main/walk/frame_000.png", import.meta.url).href,
  new URL("../assets/main/walk/frame_001.png", import.meta.url).href,
  new URL("../assets/main/walk/frame_002.png", import.meta.url).href,
  new URL("../assets/main/walk/frame_003.png", import.meta.url).href,
  new URL("../assets/main/walk/frame_004.png", import.meta.url).href,
  new URL("../assets/main/walk/frame_005.png", import.meta.url).href,
];
export const MAIN_WALK_UP_FRAMES: string[] = [
  new URL("../assets/main/walk-up/frame_000.png", import.meta.url).href,
  new URL("../assets/main/walk-up/frame_001.png", import.meta.url).href,
  new URL("../assets/main/walk-up/frame_002.png", import.meta.url).href,
  new URL("../assets/main/walk-up/frame_003.png", import.meta.url).href,
  new URL("../assets/main/walk-up/frame_004.png", import.meta.url).href,
  new URL("../assets/main/walk-up/frame_005.png", import.meta.url).href,
];
export const MAIN_WALK_DOWN_FRAMES: string[] = [
  new URL("../assets/main/walk-down/frame_000.png", import.meta.url).href,
  new URL("../assets/main/walk-down/frame_001.png", import.meta.url).href,
  new URL("../assets/main/walk-down/frame_002.png", import.meta.url).href,
  new URL("../assets/main/walk-down/frame_003.png", import.meta.url).href,
  new URL("../assets/main/walk-down/frame_004.png", import.meta.url).href,
  new URL("../assets/main/walk-down/frame_005.png", import.meta.url).href,
];

export const MAP_SCALE = 0.68; // 15% smaller than the original 0.8
export const CHAR_SCALE = 1.28;
export const MAP_WIDTH = Math.round(3200 * MAP_SCALE);
export const MAP_HEIGHT = Math.round(2400 * MAP_SCALE);
export const PLAYER_SPEED = 250;
export const PLAYER_WIDTH = Math.round(36 * MAP_SCALE);
export const PLAYER_HEIGHT = Math.round(36 * MAP_SCALE);
export const GRID_COLS = 5;
export const GRID_ROWS = 4;
export const CELL_W = MAP_WIDTH / GRID_COLS;
export const CELL_H = MAP_HEIGHT / GRID_ROWS;

export const TALK_RADIUS = Math.round(150 * MAP_SCALE);
export const WALL_THICKNESS = Math.round(16 * MAP_SCALE);
export const DOOR_WIDTH = Math.round(80 * MAP_SCALE);
