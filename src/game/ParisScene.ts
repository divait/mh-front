import Phaser from "phaser";

export type ZoneId = "baker" | "guard" | "tavern_keeper";

export interface ZoneClickedEvent {
  npcId: ZoneId;
  npcName: string;
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
  icon: string;
}

const ZONES: Zone[] = [
  {
    id: "baker",
    label: "La Boulangerie",
    npcName: "Marie Dupont",
    x: 120,
    y: 180,
    width: 180,
    height: 120,
    color: 0x8b5a2b,
    hoverColor: 0xa0703a,
    icon: "🍞",
  },
  {
    id: "guard",
    label: "Poste de Garde",
    npcName: "Capitaine Renard",
    x: 480,
    y: 140,
    width: 180,
    height: 120,
    color: 0x2c3e6b,
    hoverColor: 0x3a5080,
    icon: "⚔️",
  },
  {
    id: "tavern_keeper",
    label: "Taverne du Palais-Royal",
    npcName: "Jacques Moreau",
    x: 300,
    y: 340,
    width: 200,
    height: 120,
    color: 0x6b2c2c,
    hoverColor: 0x803a3a,
    icon: "🍷",
  },
];

export class ParisScene extends Phaser.Scene {
  private onZoneClicked!: (event: ZoneClickedEvent) => void;

  constructor() {
    super({ key: "ParisScene" });
  }

  init(data: { onZoneClicked: (e: ZoneClickedEvent) => void }) {
    this.onZoneClicked = data.onZoneClicked;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background — cobblestone Paris streets
    this.add.rectangle(width / 2, height / 2, width, height, 0x2a2015);

    // Ground grid (stylized cobblestones)
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x3a3020, 0.4);
    for (let x = 0; x < width; x += 40) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      graphics.lineBetween(0, y, width, y);
    }

    // Title
    this.add
      .text(width / 2, 30, "⚜  Paris, 1789  ⚜", {
        fontSize: "22px",
        color: "#d4af37",
        fontFamily: "Georgia, serif",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 58, "Cliquez sur un lieu pour enquêter", {
        fontSize: "13px",
        color: "#a89060",
        fontFamily: "Georgia, serif",
      })
      .setOrigin(0.5);

    // Build interactive zones
    ZONES.forEach((zone) => this.createZone(zone));
  }

  private createZone(zone: Zone) {
    const container = this.add.container(zone.x, zone.y);

    const bg = this.add
      .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, zone.color)
      .setStrokeStyle(2, 0xd4af37);

    const icon = this.add
      .text(zone.width / 2, zone.height / 2 - 20, zone.icon, { fontSize: "28px" })
      .setOrigin(0.5);

    const label = this.add
      .text(zone.width / 2, zone.height / 2 + 16, zone.label, {
        fontSize: "12px",
        color: "#f0e6c8",
        fontFamily: "Georgia, serif",
        wordWrap: { width: zone.width - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    const npcLabel = this.add
      .text(zone.width / 2, zone.height / 2 + 36, zone.npcName, {
        fontSize: "11px",
        color: "#d4af37",
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
      this.onZoneClicked({ npcId: zone.id, npcName: zone.npcName });
    });
  }
}
