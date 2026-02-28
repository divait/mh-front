import Phaser from "phaser";

const TILE_URL = new URL("../assets/tile.png", import.meta.url).href;
const GRASS_URL = new URL("../assets/grass.png", import.meta.url).href;

// Resolve idle frame URLs at build time via Vite's import.meta.url pattern
const BAKER_FRAMES: string[] = [
  new URL("../assets/baker/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/baker/idle/frame_003.png", import.meta.url).href,
];

const TAVERN_KEEPER_FRAMES: string[] = [
  new URL("../assets/tavern_keeper/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/tavern_keeper/idle/frame_003.png", import.meta.url).href,
];

const GUARD_FRAMES: string[] = [
  new URL("../assets/guard/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/guard/idle/frame_003.png", import.meta.url).href,
];

const DANCER_FRAMES: string[] = [
  new URL("../assets/dancer/idle/frame_000.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_001.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_002.png", import.meta.url).href,
  new URL("../assets/dancer/idle/frame_003.png", import.meta.url).href,
];

export type ZoneId =
  | "baker"
  | "guard"
  | "tavern_keeper"
  | "cabaret_dancer"
  | "inspector"
  | "artist"
  | "person_passerby"
  | "person_shopkeeper"
  | "person_flaneur";

export type ZoneCategory = "original" | "belle_epoque" | "person";

export interface ZoneClickedEvent {
  npcId: ZoneId;
  npcName: string;
  category: ZoneCategory;
  greeting?: string;
}

interface Zone {
  id: ZoneId;
  label: string;
  npcName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  hoverColor: number;
  borderColor: number;
  icon: string;
  category: ZoneCategory;
  greeting?: string;
}

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 2400;
const PLAYER_SPEED = 250; // Increased for larger map
const PLAYER_WIDTH = 24;
const PLAYER_HEIGHT = 32;
const PLAYER_COLOR = 0xe8d5a3;

// Grid constants for the layout
const GRID_COLS = 5;
const GRID_ROWS = 4;
const CELL_W = MAP_WIDTH / GRID_COLS;
const CELL_H = MAP_HEIGHT / GRID_ROWS;

const ZONES: Zone[] = [
  // ROW 0
  {
    id: "baker",
    label: "La Boulangerie",
    npcName: "Marie Dupont",
    x: CELL_W * 0 + 60,
    y: CELL_H * 0 + 60,
    width: CELL_W - 120,
    height: CELL_H - 120,
    color: 0x8b5a2b,
    hoverColor: 0xa0703a,
    borderColor: 0x4a6fa5,
    icon: "🍞",
    category: "original",
  },
  // Row 0, Col 1: House
  // Row 0, Col 2: House
  {
    id: "guard",
    label: "Poste de Garde",
    npcName: "Capitaine Renard",
    x: CELL_W * 3 + 60,
    y: CELL_H * 0 + 60,
    width: CELL_W - 120,
    height: CELL_H - 120,
    color: 0x2c3e6b,
    hoverColor: 0x3a5080,
    borderColor: 0x4a6fa5,
    icon: "⚔️",
    category: "original",
  },
  {
    id: "tavern_keeper",
    label: "Taverne du Palais-Royal",
    npcName: "Jacques Moreau",
    x: CELL_W * 4 + 60,
    y: CELL_H * 0 + 60,
    width: CELL_W - 120,
    height: CELL_H - 120,
    color: 0x6b2c2c,
    hoverColor: 0x803a3a,
    borderColor: 0x4a6fa5,
    icon: "🍷",
    category: "original",
  },

  // ROW 1
  // Row 1, Col 0: House
  // Row 1, Col 1-2: Park (Wide)
  // Row 1, Col 3-4: House (Wide)

  // ROW 2
  // Row 2, Col 0: House
  // Row 2, Col 1: House
  {
    id: "cabaret_dancer",
    label: "Le Moulin Rouge",
    npcName: "Colette Marchand",
    x: CELL_W * 2 + 60,
    y: CELL_H * 2 + 60,
    width: CELL_W - 120,
    height: CELL_H - 120,
    color: 0x6b2c4a,
    hoverColor: 0x803a5a,
    borderColor: 0xd4af37,
    icon: "💃",
    category: "belle_epoque",
  },
  // Row 2, Col 3: House (Vertical start)
  // Row 2, Col 4: House

  // ROW 3
  // Row 3, Col 0-2: Prefecture (Wide)
  {
    id: "inspector",
    label: "Préfecture / Sûreté",
    npcName: "Inspecteur Gaston Lefèvre",
    x: CELL_W * 0 + 60,
    y: CELL_H * 3 + 60,
    width: CELL_W * 2.5 - 120, // Spans across
    height: CELL_H - 120,
    color: 0x2c4a6b,
    hoverColor: 0x3a5a80,
    borderColor: 0xd4af37,
    icon: "🔍",
    category: "belle_epoque",
  },
  // Row 3, Col 3: House (Vertical end)
  {
    id: "artist",
    label: "Montmartre Atelier",
    npcName: "Henri Toulouse",
    x: CELL_W * 4 + 60,
    y: CELL_H * 3 + 60,
    width: CELL_W - 120,
    height: CELL_H - 120,
    color: 0x4a3a2c,
    hoverColor: 0x5a4a3a,
    borderColor: 0xd4af37,
    icon: "🎨",
    category: "belle_epoque",
  },

  // Person NPCs sprinkled in streets/parks
  {
    id: "person_passerby",
    label: "Un Passant",
    npcName: "Un passant",
    x: CELL_W * 1.5,
    y: CELL_H * 1.5,
    width: 100,
    height: 80,
    color: 0x4a4a4a,
    hoverColor: 0x5a5a5a,
    borderColor: 0x888888,
    icon: "🚶",
    category: "person",
    greeting: "Good day! Lovely weather, is it not?",
  },
  {
    id: "person_shopkeeper",
    label: "Une Marchande",
    npcName: "Une marchande",
    x: CELL_W * 3.5,
    y: CELL_H * 1.2,
    width: 100,
    height: 80,
    color: 0x4a4a4a,
    hoverColor: 0x5a5a5a,
    borderColor: 0x888888,
    icon: "🛒",
    category: "person",
    greeting: "Good morning! Buy my flowers...",
  },
  {
    id: "person_flaneur",
    label: "Un Flâneur",
    npcName: "Un flâneur",
    x: CELL_W * 3.5,
    y: CELL_H * 3.5,
    width: 100,
    height: 80,
    color: 0x4a4a4a,
    hoverColor: 0x5a5a5a,
    borderColor: 0x888888,
    icon: "🎩",
    category: "person",
    greeting: "Ah, Paris... what a city! Savour the moment.",
  },
];

export { MAP_WIDTH, MAP_HEIGHT };

const TALK_RADIUS = 150; // px — player can open dialogue within this distance of NPC center

// Axis-aligned rectangle used for wall collision
interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const WALL_THICKNESS = 16;
const DOOR_WIDTH = 60;

/**
 * Build wall segments for a rectangular building.
 * The door is a gap on the specified side (default: "bottom", centered).
 * Returns up to 8 thin wall rects (2 per side, split around the door on the door side).
 */
function buildWalls(
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
    const left = mid - d / 2 - wx;
    const right = wx + ww - (mid + d / 2);
    return [
      { x: wx, y: wy, w: left, h: t },
      { x: mid + d / 2, y: wy, w: right, h: t },
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
function overlaps(
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

interface PendingInteraction {
  targetX: number;
  targetY: number;
  event: ZoneClickedEvent;
  indicator: Phaser.GameObjects.Graphics;
}

export class ParisScene extends Phaser.Scene {
  private onZoneClicked!: (event: ZoneClickedEvent) => void;
  private player!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private walls: WallRect[] = [];
  private pendingInteraction: PendingInteraction | null = null;
  private indicatorTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: "ParisScene" });
  }

  init(data: { onZoneClicked: (e: ZoneClickedEvent) => void }) {
    this.onZoneClicked = data.onZoneClicked;
  }

  getPlayerPosition(): { x: number; y: number } {
    return {
      x: this.player?.x ?? MAP_WIDTH / 2,
      y: this.player?.y ?? MAP_HEIGHT / 2,
    };
  }

  /**
   * Enable or disable player movement input.
   * Call with `false` when a chat panel is open so WASD/Space are not consumed
   * by Phaser and can be typed freely in the chat input.
   */
  setMovementEnabled(enabled: boolean) {
    if (!this.input.keyboard) return;
    if (enabled) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
    } else {
      this.input.keyboard.enabled = false;
      this.input.keyboard.disableGlobalCapture();
    }
  }

  preload() {
    this.load.image("tile", TILE_URL);
    this.load.image("grass", GRASS_URL);
    BAKER_FRAMES.forEach((url, i) => {
      this.load.image(`baker_idle_${i}`, url);
    });
    TAVERN_KEEPER_FRAMES.forEach((url, i) => {
      this.load.image(`tavern_keeper_idle_${i}`, url);
    });
    GUARD_FRAMES.forEach((url, i) => {
      this.load.image(`guard_idle_${i}`, url);
    });
    DANCER_FRAMES.forEach((url, i) => {
      this.load.image(`dancer_idle_${i}`, url);
    });
  }

  create() {
    // Camera bounds (no physics plugin — player movement is manual)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background — cobblestone tile texture tiled across the full map
    this.add
      .tileSprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, "tile")
      .setDepth(-1);

    // Map boundary (subtle vignette)
    const border = this.add.graphics();
    border.lineStyle(4, 0x3a3020, 0.6);
    border.strokeRect(2, 2, MAP_WIDTH - 4, MAP_HEIGHT - 4);

    // Title and subtitle — fixed to camera so always visible
    const cam = this.cameras.main;
    this.add
      .text(cam.width / 2, 30, "⚜  Paris, 1900  ⚜", {
        fontSize: "22px",
        color: "#d4af37",
        fontFamily: "Georgia, serif",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.add
      .text(cam.width / 2, 58, "Move (WASD / arrows) — Click an NPC to talk", {
        fontSize: "13px",
        color: "#a89060",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Register idle animations (4 frames at 6 fps)
    this.anims.create({
      key: "baker_idle",
      frames: BAKER_FRAMES.map((_, i) => ({ key: `baker_idle_${i}` })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "tavern_keeper_idle",
      frames: TAVERN_KEEPER_FRAMES.map((_, i) => ({
        key: `tavern_keeper_idle_${i}`,
      })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "guard_idle",
      frames: GUARD_FRAMES.map((_, i) => ({ key: `guard_idle_${i}` })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "dancer_idle",
      frames: DANCER_FRAMES.map((_, i) => ({ key: `dancer_idle_${i}` })),
      frameRate: 6,
      repeat: -1,
    });

    // Build interactive zones
    ZONES.forEach((zone) => this.createZone(zone));

    // Build decorative "House" and "Park" zones based on reference grid
    this.createDecorativeZones();

    // Player — created last so it renders on top of all buildings and walls
    this.player = this.add.graphics();
    this.player.fillStyle(PLAYER_COLOR, 1);
    this.player.fillRect(
      -PLAYER_WIDTH / 2,
      -PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
    );
    // Outline so the player stands out against any background
    this.player.lineStyle(2, 0x1a1208, 1);
    this.player.strokeRect(
      -PLAYER_WIDTH / 2,
      -PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
    );
    this.player.setPosition(MAP_WIDTH / 2, MAP_HEIGHT / 2);
    this.children.bringToTop(this.player);

    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private drawWalls(wallRects: WallRect[]) {
    const g = this.add.graphics();
    g.fillStyle(0x1a1208, 1);
    for (const w of wallRects) {
      g.fillRect(w.x, w.y, w.w, w.h);
    }
    // Door indicator: a lighter strip in the gap on the bottom wall
    // (visual only — the gap in the wall rects IS the door)
    g.fillStyle(0x5a4a28, 0.6);
    // We can't easily know which side the door is here, so just a subtle floor mark
    // is handled by the absence of wall fill in that gap.
  }

  private createDecorativeZones() {
    const decorGraphics = this.add.graphics();

    // Helper to draw a "House" with walls
    const drawHouse = (
      col: number,
      row: number,
      colSpan = 1,
      rowSpan = 1,
      label = "House",
    ) => {
      const x = col * CELL_W + 60;
      const y = row * CELL_H + 60;
      const w = CELL_W * colSpan - 120;
      const h = CELL_H * rowSpan - 120;

      // Fill
      decorGraphics.fillStyle(0x3a2a1a, 1);
      decorGraphics.fillRect(x, y, w, h);

      // Register and draw walls
      const houseWalls = buildWalls(x, y, w, h, "bottom");
      this.walls.push(...houseWalls);
      this.drawWalls(houseWalls);

      // Door highlight (warm strip at the gap)
      const doorG = this.add.graphics();
      doorG.fillStyle(0x6a5028, 1);
      const mid = x + w / 2;
      doorG.fillRect(
        mid - DOOR_WIDTH / 2,
        y + h - WALL_THICKNESS,
        DOOR_WIDTH,
        WALL_THICKNESS,
      );

      this.add
        .text(x + w / 2, y + h / 2, label, {
          fontSize: "14px",
          color: "#6a5a30",
          fontFamily: "Georgia, serif",
        })
        .setOrigin(0.5);
    };

    // Helper to draw a "Park" — no walls, fully walkable
    const drawPark = (col: number, row: number, colSpan = 1, rowSpan = 1) => {
      const x = col * CELL_W + 40;
      const y = row * CELL_H + 40;
      const w = CELL_W * colSpan - 80;
      const h = CELL_H * rowSpan - 80;

      this.add.tileSprite(x + w / 2, y + h / 2, w, h, "grass");

      decorGraphics.lineStyle(2, 0x2a4a2a, 0.6);
      decorGraphics.strokeRect(x, y, w, h);

      this.add
        .text(x + w / 2, y + h / 2, "Park (walkable)", {
          fontSize: "16px",
          color: "#c8f0c8",
          fontFamily: "Georgia, serif",
          stroke: "#1a3a1a",
          strokeThickness: 2,
        })
        .setOrigin(0.5);
    };

    // ROW 0
    drawHouse(1, 0);
    drawHouse(2, 0);

    // ROW 1
    drawHouse(0, 1);
    drawPark(1, 1, 2, 1);
    drawHouse(3, 1, 2, 1);

    // ROW 2
    drawHouse(0, 2);
    drawHouse(1, 2);
    drawHouse(3, 2, 1, 2); // Vertical house spanning to Row 3
    drawHouse(4, 2);

    // ROW 3
    // Col 0-2 is Prefecture (Agent Zone)
    // Col 3 is Vertical House end
    // Col 4 is Artist (Agent Zone)
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const hw = PLAYER_WIDTH / 2;
    const hh = PLAYER_HEIGHT / 2;

    // If auto-walking toward a pending interaction target
    if (this.pendingInteraction) {
      const { targetX, targetY, event, indicator } = this.pendingInteraction;
      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 8) {
        // Arrived — fire dialogue and clean up
        this.pendingInteraction = null;
        this.indicatorTween?.stop();
        this.indicatorTween = null;
        indicator.destroy();
        this.onZoneClicked(event);
      } else {
        // Move toward target (bypass wall collision so player doesn't get stuck)
        const speed = PLAYER_SPEED * dt;
        const nx = Phaser.Math.Clamp(
          this.player.x + (dx / dist) * speed,
          hw,
          MAP_WIDTH - hw,
        );
        const ny = Phaser.Math.Clamp(
          this.player.y + (dy / dist) * speed,
          hh,
          MAP_HEIGHT - hh,
        );
        this.player.setPosition(nx, ny);
      }

      // Any manual key press cancels auto-walk
      const anyKey =
        this.cursors.left.isDown ||
        this.cursors.right.isDown ||
        this.cursors.up.isDown ||
        this.cursors.down.isDown ||
        this.wasd.left.isDown ||
        this.wasd.right.isDown ||
        this.wasd.up.isDown ||
        this.wasd.down.isDown;
      if (anyKey && this.pendingInteraction) {
        this.indicatorTween?.stop();
        this.indicatorTween = null;
        this.pendingInteraction.indicator.destroy();
        this.pendingInteraction = null;
      }
      return;
    }

    // Normal manual movement
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * PLAYER_SPEED;
      vy = (vy / len) * PLAYER_SPEED;

      // Try X axis first
      let nx = Phaser.Math.Clamp(this.player.x + vx * dt, hw, MAP_WIDTH - hw);
      let ny = this.player.y;
      if (this.collidesWithWall(nx, ny, hw, hh)) nx = this.player.x;

      // Then Y axis
      ny = Phaser.Math.Clamp(this.player.y + vy * dt, hh, MAP_HEIGHT - hh);
      if (this.collidesWithWall(nx, ny, hw, hh)) ny = this.player.y;

      this.player.setPosition(nx, ny);
    }
  }

  private collidesWithWall(
    px: number,
    py: number,
    hw: number,
    hh: number,
  ): boolean {
    const pl = px - hw,
      pt = py - hh,
      pw = hw * 2,
      ph = hh * 2;
    for (const w of this.walls) {
      if (overlaps(pl, pt, pw, ph, w.x, w.y, w.w, w.h)) return true;
    }
    return false;
  }

  /** Returns true if the player is close enough to the NPC stand-point to talk immediately. */
  private isNearNPC(standX: number, standY: number): boolean {
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      standX,
      standY,
    );
    return dist <= TALK_RADIUS;
  }

  /**
   * Returns the world-space stand point right next to the NPC — the player walks here
   * before dialogue opens. Positioned just below the NPC sprite center inside the building.
   */
  private getNPCStandPoint(zone: Zone): { x: number; y: number } {
    const npcCY =
      zone.category === "person" ? zone.height / 2 : zone.height / 2 - 10;
    return {
      x: zone.x + zone.width / 2,
      // Stand 30px below the NPC center (right next to them)
      y: zone.y + npcCY + 30,
    };
  }

  /** Creates a pulsing destination indicator at world position (wx, wy). */
  private createDestinationIndicator(
    wx: number,
    wy: number,
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0xd4af37, 0.9);
    g.fillCircle(0, 0, 8);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeCircle(0, 0, 8);
    g.setPosition(wx, wy);
    this.children.bringToTop(g);

    this.indicatorTween = this.tweens.add({
      targets: g,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return g;
  }

  private createZone(zone: Zone) {
    // Register walls for this building (skip person NPCs — they're open sprites)
    if (zone.category !== "person") {
      const zoneWalls = buildWalls(
        zone.x,
        zone.y,
        zone.width,
        zone.height,
        "bottom",
      );
      this.walls.push(...zoneWalls);
      this.drawWalls(zoneWalls);
    }

    const container = this.add.container(zone.x, zone.y);

    const bg = this.add
      .rectangle(
        zone.width / 2,
        zone.height / 2,
        zone.width,
        zone.height,
        zone.color,
      )
      .setStrokeStyle(2, zone.borderColor);

    // Building label (top area)
    const label = this.add
      .text(zone.width / 2, 24, zone.label, {
        fontSize: "12px",
        color: "#f0e6c8",
        fontFamily: "Georgia, serif",
        wordWrap: { width: zone.width - 16 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    container.add([bg, label]);

    // Door — drawn on top of the building fill, inside the container (local coords)
    if (zone.category !== "person") {
      const doorG = this.add.graphics();
      const doorX = zone.width / 2 - DOOR_WIDTH / 2;
      const doorY = zone.height - WALL_THICKNESS;
      doorG.fillStyle(0xc8860a, 1);
      doorG.fillRect(doorX, doorY, DOOR_WIDTH, WALL_THICKNESS);
      doorG.lineStyle(2, 0x1a1208, 1);
      doorG.strokeRect(doorX, doorY, DOOR_WIDTH, WALL_THICKNESS);
      const doorLabel = this.add
        .text(zone.width / 2, doorY + WALL_THICKNESS / 2, "🚪", {
          fontSize: "14px",
        })
        .setOrigin(0.5);
      container.add([doorG, doorLabel]);
    }

    // NPC character sprite — centered in the building, interactive
    const NPC_W = zone.category === "person" ? 36 : 44;
    const NPC_H = zone.category === "person" ? 44 : 56;
    const npcCX = zone.width / 2;
    // For buildings: place NPC in the upper-center area; for persons: center of their zone
    const npcCY =
      zone.category === "person" ? zone.height / 2 : zone.height / 2 - 10;

    // Animated sprite for baker / tavern_keeper; Graphics fallback for all others
    let npcVisual: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
    let npcIcon: Phaser.GameObjects.Text | null = null;

    if (zone.id === "baker") {
      // Pixel-art sprite — scale up 1.5× from 48×48 (renders at 72×72)
      const sprite = this.add.sprite(npcCX, npcCY, "baker_idle_0");
      sprite.setScale(1.5);
      sprite.play("baker_idle");
      npcVisual = sprite;
    } else if (zone.id === "tavern_keeper") {
      const sprite = this.add.sprite(npcCX, npcCY, "tavern_keeper_idle_0");
      sprite.setScale(1.6);
      sprite.play("tavern_keeper_idle");
      npcVisual = sprite;
    } else if (zone.id === "guard") {
      const sprite = this.add.sprite(npcCX, npcCY, "guard_idle_0");
      sprite.setScale(1.6);
      sprite.play("guard_idle");
      npcVisual = sprite;
    } else if (zone.id === "cabaret_dancer") {
      const sprite = this.add.sprite(npcCX, npcCY, "dancer_idle_0");
      sprite.setScale(1.6);
      sprite.play("dancer_idle");
      npcVisual = sprite;
    } else {
      const g = this.add.graphics();
      g.fillStyle(zone.category === "person" ? 0x888888 : zone.borderColor, 1);
      g.fillRoundedRect(-NPC_W / 2, -NPC_H / 2, NPC_W, NPC_H, 6);
      g.lineStyle(2, zone.category === "person" ? 0xaaaaaa : 0xffd700, 1);
      g.strokeRoundedRect(-NPC_W / 2, -NPC_H / 2, NPC_W, NPC_H, 6);
      // Head circle
      g.fillStyle(0xe8d5a3, 1);
      g.fillCircle(0, -NPC_H / 2 - 10, 10);
      g.lineStyle(1, 0x1a1208, 0.6);
      g.strokeCircle(0, -NPC_H / 2 - 10, 10);
      g.setPosition(npcCX, npcCY);
      npcVisual = g;

      // Icon only for non-baker NPCs
      npcIcon = this.add
        .text(npcCX, npcCY - 6, zone.icon, { fontSize: "20px" })
        .setOrigin(0.5);
    }

    const isSprite =
      zone.id === "baker" ||
      zone.id === "tavern_keeper" ||
      zone.id === "guard" ||
      zone.id === "cabaret_dancer";

    // NPC name below sprite
    const npcName = this.add
      .text(
        npcCX,
        npcCY + (isSprite ? 40 : NPC_H / 2 + 14),
        zone.npcName,
        {
          fontSize: "11px",
          color: zone.category === "person" ? "#aaaaaa" : "#d4af37",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        },
      )
      .setOrigin(0.5, 0);

    // Invisible hit zone over the NPC sprite (slightly larger for easier clicking)
    const hitW = isSprite ? 52 : NPC_W + 16;
    const hitH = isSprite ? 80 : NPC_H + 30;
    const hitArea = this.add
      .rectangle(npcCX, npcCY - 10, hitW, hitH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    const visualItems: Phaser.GameObjects.GameObject[] = [
      npcVisual,
      npcName,
      hitArea,
    ];
    if (npcIcon) visualItems.splice(1, 0, npcIcon);
    container.add(visualItems);

    hitArea.on("pointerover", () => {
      if (!isSprite) {
        this.tweens.add({
          targets: npcIcon ? [npcVisual, npcIcon] : [npcVisual],
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 100,
        });
      }
      bg.setFillStyle(zone.hoverColor);
    });

    hitArea.on("pointerout", () => {
      if (!isSprite) {
        this.tweens.add({
          targets: npcIcon ? [npcVisual, npcIcon] : [npcVisual],
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      }
      bg.setFillStyle(zone.color);
    });

    hitArea.on("pointerdown", () => {
      const clickEvent: ZoneClickedEvent = {
        npcId: zone.id,
        npcName: zone.npcName,
        category: zone.category,
        greeting: zone.greeting,
      };

      // Person NPCs in the street: always immediate (no walls)
      if (zone.category === "person") {
        this.cameras.main.shake(150, 0.003);
        this.onZoneClicked(clickEvent);
        return;
      }

      // Stand point = right next to the NPC inside the building
      const stand = this.getNPCStandPoint(zone);

      // Check proximity to stand point
      if (this.isNearNPC(stand.x, stand.y)) {
        this.cameras.main.shake(200, 0.005);
        this.onZoneClicked(clickEvent);
      } else {
        // Auto-walk directly to the NPC stand point (bypasses wall collision)
        const indicator = this.createDestinationIndicator(stand.x, stand.y);
        // Cancel any previous pending interaction
        if (this.pendingInteraction) {
          this.indicatorTween?.stop();
          this.pendingInteraction.indicator.destroy();
        }
        this.pendingInteraction = {
          targetX: stand.x,
          targetY: stand.y,
          event: clickEvent,
          indicator,
        };
      }
    });
  }
}
