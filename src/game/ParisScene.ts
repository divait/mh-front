import Phaser from "phaser";

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

export class ParisScene extends Phaser.Scene {
  private onZoneClicked!: (event: ZoneClickedEvent) => void;
  private player!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

  constructor() {
    super({ key: "ParisScene" });
  }

  init(data: { onZoneClicked: (e: ZoneClickedEvent) => void }) {
    this.onZoneClicked = data.onZoneClicked;
  }

  create() {
    // Camera bounds (no physics plugin — player movement is manual)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Background — cobblestone Paris streets
    this.add.rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x2a2015);

    // Ground grid (stylized cobblestones)
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3a3020, 0.4);
    for (let x = 0; x <= MAP_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, MAP_WIDTH, y);
    }

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
      .setScrollFactor(0);

    this.add
      .text(cam.width / 2, 58, "Move (WASD / arrows) — Click a location to investigate", {
        fontSize: "13px",
        color: "#a89060",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Player — colored rectangle
    this.player = this.add.graphics();
    this.player.fillStyle(PLAYER_COLOR, 1);
    this.player.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT);
    this.player.setPosition(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Build interactive zones
    ZONES.forEach((zone) => this.createZone(zone));

    // Build decorative "House" and "Park" zones based on reference grid
    this.createDecorativeZones();
  }

  private createDecorativeZones() {
    const decorGraphics = this.add.graphics();
    decorGraphics.lineStyle(2, 0x3a3020, 0.8);
    
    // Helper to draw a "House"
    const drawHouse = (col: number, row: number, colSpan = 1, rowSpan = 1, label = "House") => {
      const x = col * CELL_W + 60;
      const y = row * CELL_H + 60;
      const w = CELL_W * colSpan - 120;
      const h = CELL_H * rowSpan - 120;
      
      decorGraphics.fillStyle(0x3a2a1a, 0.4);
      decorGraphics.fillRect(x, y, w, h);
      decorGraphics.strokeRect(x, y, w, h);
      
      this.add.text(x + w/2, y + h/2, label, {
        fontSize: "14px",
        color: "#6a5a30",
        fontFamily: "Georgia, serif"
      }).setOrigin(0.5);
    };

    // Helper to draw a "Park"
    const drawPark = (col: number, row: number, colSpan = 1, rowSpan = 1) => {
      const x = col * CELL_W + 40;
      const y = row * CELL_H + 40;
      const w = CELL_W * colSpan - 80;
      const h = CELL_H * rowSpan - 80;
      
      decorGraphics.fillStyle(0x1a3a1a, 0.3);
      decorGraphics.fillRect(x, y, w, h);
      decorGraphics.lineStyle(1, 0x2a4a2a, 0.5);
      decorGraphics.strokeRect(x, y, w, h);
      
      this.add.text(x + w/2, y + h/2, "Park (walkable)", {
        fontSize: "16px",
        color: "#4a6a4a",
        fontFamily: "Georgia, serif"
      }).setOrigin(0.5);
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
      const dt = delta / 1000;
      let nx = this.player.x + vx * dt;
      let ny = this.player.y + vy * dt;
      const hw = PLAYER_WIDTH / 2;
      const hh = PLAYER_HEIGHT / 2;
      nx = Phaser.Math.Clamp(nx, hw, MAP_WIDTH - hw);
      ny = Phaser.Math.Clamp(ny, hh, MAP_HEIGHT - hh);
      this.player.setPosition(nx, ny);
    }
  }

  private createZone(zone: Zone) {
    const container = this.add.container(zone.x, zone.y);

    const bg = this.add
      .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, zone.color)
      .setStrokeStyle(2, zone.borderColor);

    const icon = this.add
      .text(zone.width / 2, zone.height / 2 - (zone.greeting ? 8 : 20), zone.icon, {
        fontSize: zone.greeting ? "22px" : "28px",
      })
      .setOrigin(0.5);

    const label = this.add
      .text(zone.width / 2, zone.height / 2 + (zone.greeting ? 4 : 16), zone.label, {
        fontSize: "12px",
        color: "#f0e6c8",
        fontFamily: "Georgia, serif",
        wordWrap: { width: zone.width - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    const npcLabel = this.add
      .text(zone.width / 2, zone.height / 2 + (zone.greeting ? 22 : 36), zone.npcName, {
        fontSize: "11px",
        color: zone.category === "person" ? "#aaa" : "#d4af37",
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    container.add([bg, icon, label, npcLabel]);

    // Hit area
    const hitArea = this.add
      .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    container.add(hitArea);

    hitArea.on("pointerover", () => {
      bg.setFillStyle(zone.hoverColor);
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120 });
    });

    hitArea.on("pointerout", () => {
      bg.setFillStyle(zone.color);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
    });

    hitArea.on("pointerdown", () => {
      this.cameras.main.shake(200, 0.005);
      this.onZoneClicked({
        npcId: zone.id,
        npcName: zone.npcName,
        category: zone.category,
        greeting: zone.greeting,
      });
    });
  }
}
