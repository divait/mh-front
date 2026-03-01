import Phaser from "phaser";
import { Zone, ZoneClickedEvent, WallRect, PendingInteraction, ZoneId } from "./types";
import {
  TILE_URL,
  GRASS_URL,
  ATELIER_URL,
  BOULANGERIE_URL,
  CABARET_URL,
  GUARD_POST_URL,
  HOUSE_URL,
  HOUSE2_URL,
  PREFECTURE_URL,
  TAVERN_URL,
  BAKER_FRAMES,
  TAVERN_KEEPER_FRAMES,
  GUARD_FRAMES,
  DANCER_FRAMES,
  INSPECTOR_FRAMES,
  ARTIST_FRAMES,
  MAIN_IDLE_FRAMES,
  MAIN_WALK_FRAMES,
  MAIN_WALK_UP_FRAMES,
  MAIN_WALK_DOWN_FRAMES,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  CELL_W,
  CELL_H,
  TALK_RADIUS,
  CHAR_SCALE,
} from "./constants";
import { ZONES } from "./zones";
import { buildWalls, overlaps } from "./walls";

export { MAP_WIDTH, MAP_HEIGHT };

export interface BuildingData {
  zoneId: string;
  exteriorImg: Phaser.GameObjects.Image;
  exteriorDoor: Phaser.GameObjects.Graphics;
  interior: Phaser.GameObjects.Container;
  interiorBounds: { ix: number; iy: number; iw: number; ih: number };
  npcContainer?: Phaser.GameObjects.Container;
  entryRect: { x: number; y: number; w: number; h: number };
}

export class ParisScene extends Phaser.Scene {
  private onZoneClicked!: (event: ZoneClickedEvent) => void;
  private player!: Phaser.GameObjects.Sprite;
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
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  
  private buildings: BuildingData[] = [];
  private activeBuilding: BuildingData | null = null;
  /** Wall rects added when entering a building; removed on exit. */
  private activeInteriorWalls: WallRect[] = [];
  private isTransitioning = false;
  private keyE!: Phaser.Input.Keyboard.Key;

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

  /** Update the day/night overlay color and alpha (called from React each second). */
  setDayNightOverlay(color: number, alpha: number) {
    if (!this.dayNightOverlay) return;
    this.dayNightOverlay.setFillStyle(color, alpha);
  }

  /** Update the title text to reflect the current day (called from React). */
  setDayLabel(day: number) {
    if (!this.titleText) return;
    this.titleText.setText(`⚜  Paris, 1900  —  Day ${day}  ⚜`);
  }

  /**
   * Zoom the camera out so the entire map fills the viewport with no black bars.
   * Uses the larger of the two scale factors (cover strategy) so the map always
   * fills the screen edge-to-edge; the camera bounds prevent scrolling past the edges.
   */
  zoomOutToCity() {
    const cam = this.cameras.main;
    cam.stopFollow();
    // "Cover" fit: scale up to whichever axis needs more zoom to fill the screen
    const zoomX = cam.width / MAP_WIDTH;
    const zoomY = cam.height / MAP_HEIGHT;
    const zoom = Math.max(zoomX, zoomY);
    cam.setZoom(zoom);
    cam.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);
  }

  /**
   * Pan and zoom the camera from the city overview to the inspector zone,
   * then re-attach camera follow to the player and call onComplete.
   */
  panToInspector(onComplete: () => void) {
    const inspectorZone = ZONES.find((z) => z.id === "inspector")!;
    const targetX = inspectorZone.x + inspectorZone.width / 2;
    const targetY = inspectorZone.y + inspectorZone.height / 2;

    this.cameras.main.pan(targetX, targetY, 2200, "Sine.easeInOut");
    this.cameras.main.zoomTo(
      1.4,
      2200,
      "Sine.easeInOut",
      false,
      (_cam, progress) => {
        if (progress === 1) {
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
          onComplete();
        }
      },
    );
  }

  preload() {
    this.load.image("tile", TILE_URL);
    this.load.image("grass", GRASS_URL);
    this.load.image("atelier", ATELIER_URL);
    this.load.image("boulangerie", BOULANGERIE_URL);
    this.load.image("cabaret", CABARET_URL);
    this.load.image("guard_post", GUARD_POST_URL);
    this.load.image("house", HOUSE_URL);
    this.load.image("house2", HOUSE2_URL);
    this.load.image("prefecture", PREFECTURE_URL);
    this.load.image("tavern", TAVERN_URL);
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
    INSPECTOR_FRAMES.forEach((url, i) => {
      this.load.image(`inspector_idle_${i}`, url);
    });
    ARTIST_FRAMES.forEach((url, i) => {
      this.load.image(`artist_idle_${i}`, url);
    });
    MAIN_IDLE_FRAMES.forEach((url, i) => {
      this.load.image(`main_idle_${i}`, url);
    });
    MAIN_WALK_FRAMES.forEach((url, i) => {
      this.load.image(`main_walk_${i}`, url);
    });
    MAIN_WALK_UP_FRAMES.forEach((url, i) => {
      this.load.image(`main_walk_up_${i}`, url);
    });
    MAIN_WALK_DOWN_FRAMES.forEach((url, i) => {
      this.load.image(`main_walk_down_${i}`, url);
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
    this.titleText = this.add
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

    // Day/night overlay — full-screen rectangle fixed to camera, updated from React
    this.dayNightOverlay = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x112244, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9999);

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

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
    this.anims.create({
      key: "inspector_idle",
      frames: INSPECTOR_FRAMES.map((_, i) => ({ key: `inspector_idle_${i}` })),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "artist_idle",
      frames: ARTIST_FRAMES.map((_, i) => ({ key: `artist_idle_${i}` })),
      frameRate: 6,
      repeat: -1,
    });

    // Player animations
    this.anims.create({
      key: "main_idle",
      frames: MAIN_IDLE_FRAMES.map((_, i) => ({ key: `main_idle_${i}` })),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "main_walk",
      frames: MAIN_WALK_FRAMES.map((_, i) => ({ key: `main_walk_${i}` })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "main_walk_up",
      frames: MAIN_WALK_UP_FRAMES.map((_, i) => ({ key: `main_walk_up_${i}` })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "main_walk_down",
      frames: MAIN_WALK_DOWN_FRAMES.map((_, i) => ({
        key: `main_walk_down_${i}`,
      })),
      frameRate: 10,
      repeat: -1,
    });

    // Build interactive zones
    ZONES.forEach((zone) => this.createZone(zone));

    // Build decorative "House" and "Park" zones based on reference grid
    this.createDecorativeZones();

    // Player — spawn in the street just below the Préfecture, clear of all walls/NPCs
    const inspectorZone = ZONES.find((z) => z.id === "inspector")!;
    const spawnX = inspectorZone.x + inspectorZone.width / 2 + 50;
    const spawnY = inspectorZone.y + inspectorZone.height / 2 - 10;
    this.player = this.add.sprite(spawnX, spawnY, "main_idle_0");
    this.player.setScale(CHAR_SCALE);
    this.player.setDepth(10);
    this.player.play("main_idle");
    this.children.bringToTop(this.player);

    // Center on player initially; zoomOutToCity() (called from postBoot) will
    // stop follow and zoom out. panToInspector() re-attaches follow after the pan.
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  private createDecorativeZones() {
    const decorGraphics = this.add.graphics();

    // Helper to draw a "House" with walls
    const drawHouse = (
      col: number,
      row: number,
      colSpan = 1,
      rowSpan = 1,
      label = "Maison de Ville",
    ) => {
      const x = col * CELL_W + 60;
      const y = row * CELL_H + 60;
      const w = CELL_W * colSpan - 120;
      const h = CELL_H * rowSpan - 120;

      // We alternate between house and house2 for visual variety
      const bType = (col + row) % 2 === 0 ? "house" : "house2";

      this.createZone({
        id: `decor_house_${col}_${row}` as ZoneId,
        label,
        npcName: "", // Empty so no NPC renders
        category: "belle_epoque",
        icon: "",
        x: x,
        y: y,
        width: w,
        height: h,
        color: 0x3a2a1a,
        hoverColor: 0x4a3a2a,
        borderColor: 0x6a5a30,
        buildingType: bType,
      });
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

        // Animate auto-walk
        if (Math.abs(dy) > Math.abs(dx)) {
          this.player.play(dy < 0 ? "main_walk_up" : "main_walk_down", true);
          this.player.setFlipX(false);
        } else {
          this.player.play("main_walk", true);
          this.player.setFlipX(dx < 0);
        }
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

    if (this.isTransitioning) {
      this.player.play("main_idle", true);
      return;
    }

    // Auto-enter by walking through exterior door
    if (!this.activeBuilding) {
      for (const b of this.buildings) {
        if (!b.exteriorImg.visible) continue;
        
        const { x: bx, y: by, w: bw, h: bh } = b.entryRect;
        
        if (
          this.player.x > bx + bw / 2 - 40 &&
          this.player.x < bx + bw / 2 + 40 &&
          this.player.y < by + bh &&
          this.player.y > by + bh - 20
        ) {
          this.playEnterBuildingAnimation(b);
          return;
        }
      }
    }

    // When inside a building, only exit via the door (E key near door)
    if (this.activeBuilding) {
      const b = this.activeBuilding.interiorBounds;
      const doorX = b.ix + b.iw / 2;
      const doorY = b.iy + b.ih - 25;
      const distToDoor = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        doorX,
        doorY,
      );

      // Auto-exit if the player walks out through the door (Y exceeds the interior floor bounds near the door)
      // or if they press E near the door.
      const walkedOut = this.player.y > b.iy + b.ih - 18;

      if (walkedOut || (distToDoor < 50 && Phaser.Input.Keyboard.JustDown(this.keyE))) {
        this.playExitBuildingAnimation(this.activeBuilding);
        return;
      }
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

      // Pick animation — vertical takes priority over horizontal
      if (vy < 0) {
        this.player.play("main_walk_up", true);
        this.player.setFlipX(false);
      } else if (vy > 0) {
        this.player.play("main_walk_down", true);
        this.player.setFlipX(false);
      } else {
        // Horizontal: walk right is the source, flip for left
        this.player.play("main_walk", true);
        this.player.setFlipX(vx < 0);
      }
    } else {
      this.player.play("main_idle", true);
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

  /**
   * Play an enter-building animation (zoom in + fade to black) then fire the
   * zone event. On the black frame, swaps the exterior image for the interior
   * container so the fade-in reveals the inside of the building.
   */
  private playEnterBuildingAnimation(building: BuildingData) {
    this.isTransitioning = true;
    const cam = this.cameras.main;
    cam.zoomTo(2.2, 400, "Sine.easeIn");
    this.time.delayedCall(350, () => {
      cam.fade(
        300,
        0,
        0,
        0,
        false,
        (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress === 1) {
            // Swap exterior → interior while screen is black
            building.exteriorImg.setVisible(false);
            if (building.exteriorDoor) building.exteriorDoor.setVisible(false);
            building.interior.setVisible(true);
            this.children.bringToTop(building.interior);
            if (building.npcContainer) {
              building.npcContainer.setVisible(true);
              this.children.bringToTop(building.npcContainer);
            }
            this.children.bringToTop(this.player);

            // Add interior walls so the player is confined and can only leave via the door
            const bounds = building.interiorBounds;
            if (bounds) {
              const { ix, iy, iw, ih } = bounds;
              this.activeInteriorWalls = buildWalls(ix, iy, iw, ih, "bottom");
              this.walls.push(...this.activeInteriorWalls);
              this.activeBuilding = building;
              // Place player just inside the room (center, above the door)
              this.player.setPosition(ix + iw / 2, iy + ih - 50);
            }

            cam.zoomTo(1.4, 0);
            cam.fadeIn(250, 0, 0, 0);
            this.isTransitioning = false;
          }
        },
      );
    });
  }

  /**
   * Play the inverse of the enter animation: fade to black, hide interior and
   * show exterior, remove interior walls, place player outside the door, fade in.
   */
  private playExitBuildingAnimation(building: BuildingData) {
    this.isTransitioning = true;
    const cam = this.cameras.main;
    
    // Fade to black
    cam.fade(300, 0, 0, 0, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        building.interior.setVisible(false);
        building.exteriorImg.setVisible(true);
        if (building.exteriorDoor) building.exteriorDoor.setVisible(true);
        if (building.npcContainer) building.npcContainer.setVisible(false);

        // Remove interior walls and clear state
        this.walls = this.walls.filter((w) => !this.activeInteriorWalls.includes(w));
        this.activeInteriorWalls = [];
        this.activeBuilding = null;

        // Place player just outside the door (bottom center of interior)
        const b = building.interiorBounds;
        this.player.setPosition(b.ix + b.iw / 2, b.iy + b.ih + 35);

        // Ensure player is rendered above the building exterior
        this.children.bringToTop(this.player);

        // Reverse the entrance zoom effect
        cam.setZoom(2.2);
        cam.fadeIn(250, 0, 0, 0);
        cam.zoomTo(1.4, 400, "Sine.easeOut");

        this.isTransitioning = false;
      }
    });
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
    const hasBuilding = !!zone.buildingType;
    const isPerson = zone.category === "person";

    // Solid collision box around the NPC sprite so the player cannot walk through them
    const npcWorldCX = zone.x + zone.width / 2;
    const npcWorldCY = isPerson ? zone.y + zone.height / 2 : zone.y + zone.height / 2 - 10;
    const npcBlockW = 0;
    const npcBlockH = 30;
    this.walls.push({
      x: npcWorldCX - npcBlockW / 2,
      y: npcWorldCY - npcBlockH / 2,
      w: npcBlockW,
      h: npcBlockH,
    });

    const container = this.add.container(zone.x, zone.y);

    let bgRect: Phaser.GameObjects.Rectangle | null = null;
    let bgImg: Phaser.GameObjects.Image | null = null;
    let bData: BuildingData | null = null;

    if (hasBuilding) {
      const bType = zone.buildingType!;
      let hitBox = { bx: zone.x, by: zone.y, bw: zone.width, bh: zone.height };
      
      if (bType === "cabaret") {
        hitBox = {
          bx: zone.x + zone.width * (6 / 64),
          by: zone.y + zone.height * (2 / 64),
          bw: zone.width * (52 / 64),
          bh: zone.height * (60 / 64),
        };
      } else if (bType === "house") {
        hitBox = {
          bx: zone.x + zone.width * (17 / 64),
          by: zone.y + zone.height * (1 / 64),
          bw: zone.width * (30 / 64),
          bh: zone.height * (62 / 64),
        };
      } else if (bType === "house2") {
        hitBox = {
          bx: zone.x + zone.width * (18 / 64),
          by: zone.y + zone.height * (5 / 64),
          bw: zone.width * (28 / 64),
          bh: zone.height * (59 / 64),
        };
      } else if (bType === "prefecture") {
        hitBox = {
          bx: zone.x,
          by: zone.y + zone.height * (11 / 64),
          bw: zone.width,
          bh: zone.height * (46 / 64),
        };
      } else if (bType === "boulangerie") {
        hitBox = {
          bx: zone.x + zone.width * (14 / 64),
          by: zone.y + zone.height * (0 / 64),
          bw: zone.width * (36 / 64),
          bh: zone.height * (64 / 64),
        };
      } else if (bType === "guard_post") {
        hitBox = {
          bx: zone.x + zone.width * (8 / 64),
          by: zone.y + zone.height * (2 / 64),
          bw: zone.width * (48 / 64),
          bh: zone.height * (61 / 64),
        };
      } else if (bType === "tavern") {
        hitBox = {
          bx: zone.x + zone.width * (6 / 64),
          by: zone.y + zone.height * (3 / 64),
          bw: zone.width * (51 / 64),
          bh: zone.height * (58 / 64),
        };
      } else if (bType === "atelier") {
        hitBox = {
          bx: zone.x + zone.width * (12 / 64),
          by: zone.y + zone.height * (1 / 64),
          bw: zone.width * (40 / 64),
          bh: zone.height * (63 / 64),
        };
      }

      const zoneWalls = buildWalls(hitBox.bx, hitBox.by, hitBox.bw, hitBox.bh, "bottom");
      this.walls.push(...zoneWalls);

      bgImg = this.add.image(zone.width / 2, zone.height / 2, bType);
      bgImg.setDisplaySize(zone.width, zone.height);
      container.add([bgImg]);

      const iw = zone.width * 0.6;
      const ih = zone.height * 0.8;
      const ix = zone.x + (zone.width - iw) / 2;
      const iy = zone.y + (zone.height - ih) / 2;

      const interiorContainer = this.add.container(ix, iy);

      const floor = this.add
        .rectangle(iw / 2, ih / 2, iw, ih, 0x2a1a0e)
        .setStrokeStyle(3, zone.borderColor);

      const stageLight = this.add.graphics();
      stageLight.fillStyle(0x6b2c4a, 0.6);
      stageLight.fillRect(0, 0, iw, ih * 0.18);

      const interiorLabel = this.add
        .text(iw / 2, 14, zone.label, {
          fontSize: "11px",
          color: "#d4af37",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        })
        .setOrigin(0.5, 0);

      const doorG = this.add.graphics();
      const interiorDoorWidth = 60;
      const interiorDoorHeight = 10;
      const doorX = iw / 2 - interiorDoorWidth / 2;
      const doorY = ih - interiorDoorHeight + 8;
      doorG.fillStyle(0x1a1208, 0.7);
      doorG.fillRect(doorX, doorY, interiorDoorWidth, interiorDoorHeight);
      doorG.lineStyle(2, 0x1a1208, 1);
      doorG.strokeRect(doorX, doorY, interiorDoorWidth, interiorDoorHeight);
      
      interiorContainer.add([floor, stageLight, interiorLabel, doorG]);
      interiorContainer.setVisible(false);

      const exteriorDoorG = this.add.graphics();
      const extDoorWidth = 60;
      const extDoorHeight = 10;
      const extDoorX = hitBox.bx + hitBox.bw / 2 - extDoorWidth / 2;
      const extDoorY = hitBox.by + hitBox.bh - extDoorHeight / 2;
      
      exteriorDoorG.fillStyle(0x1a1208, 0.7);
      exteriorDoorG.fillRect(extDoorX, extDoorY, extDoorWidth, extDoorHeight);
      exteriorDoorG.lineStyle(2, 0x1a1208, 1);
      exteriorDoorG.strokeRect(extDoorX, extDoorY, extDoorWidth, extDoorHeight);
      container.add([exteriorDoorG]);

      bData = {
        zoneId: zone.id,
        exteriorImg: bgImg,
        exteriorDoor: exteriorDoorG,
        interior: interiorContainer,
        interiorBounds: { ix, iy, iw, ih },
        entryRect: { x: hitBox.bx, y: hitBox.by, w: hitBox.bw, h: hitBox.bh },
      };
      this.buildings.push(bData);
    } else {
      bgRect = this.add
        .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, zone.color)
        .setStrokeStyle(2, zone.borderColor);
      
      const label = this.add
        .text(zone.width / 2, 24, zone.label, {
          fontSize: "12px",
          color: "#f0e6c8",
          fontFamily: "Georgia, serif",
          wordWrap: { width: zone.width - 16 },
          align: "center",
        })
        .setOrigin(0.5, 0);
      container.add([bgRect, label]);
    }

    // Remove fallback door graphic (all buildings now have exterior door overlay)

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
      sprite.setScale(CHAR_SCALE);
      sprite.play("baker_idle");
      npcVisual = sprite;
    } else if (zone.id === "tavern_keeper") {
      const sprite = this.add.sprite(npcCX, npcCY, "tavern_keeper_idle_0");
      sprite.setScale(CHAR_SCALE);
      sprite.play("tavern_keeper_idle");
      npcVisual = sprite;
    } else if (zone.id === "guard") {
      const sprite = this.add.sprite(npcCX, npcCY, "guard_idle_0");
      sprite.setScale(CHAR_SCALE);
      sprite.play("guard_idle");
      npcVisual = sprite;
    } else if (zone.id === "cabaret_dancer") {
      const sprite = this.add.sprite(npcCX, npcCY, "dancer_idle_0");
      sprite.setScale(CHAR_SCALE);
      sprite.play("dancer_idle");
      npcVisual = sprite;
    } else if (zone.id === "inspector") {
      const sprite = this.add.sprite(npcCX, npcCY, "inspector_idle_0");
      sprite.setScale(CHAR_SCALE);
      sprite.play("inspector_idle");
      npcVisual = sprite;
    } else if (zone.id === "artist") {
      const sprite = this.add.sprite(npcCX, npcCY, "artist_idle_0");
      sprite.setScale(CHAR_SCALE);
      sprite.play("artist_idle");
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
      zone.id === "cabaret_dancer" ||
      zone.id === "inspector" ||
      zone.id === "artist";

    // NPC name below sprite
    const npcName = this.add
      .text(npcCX, npcCY + (isSprite ? 35 : NPC_H / 2 + 14), zone.npcName, {
        fontSize: "11px",
        color: zone.category === "person" ? "#aaaaaa" : "#d4af37",
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
      })
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
    
    // Draw independently of exterior building to allow z-depth sorting
    const npcContainer = this.add.container(zone.x, zone.y);
    npcContainer.add(visualItems);

    if (bData) {
      npcContainer.setVisible(false);
      bData.npcContainer = npcContainer;
    }

    hitArea.on("pointerover", () => {
      if (!isSprite) {
        this.tweens.add({
          targets: npcIcon ? [npcVisual, npcIcon] : [npcVisual],
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 100,
        });
      }
      // Image backgrounds (cabaret) don't support setFillStyle — tint instead
      if (bgImg) {
        bgImg.setTint(0xffddaa);
      } else if (bgRect) {
        bgRect.setFillStyle(zone.hoverColor);
      }
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
      if (bgImg) {
        bgImg.clearTint();
      } else if (bgRect) {
        bgRect.setFillStyle(zone.color);
      }
    });

    hitArea.on("pointerdown", () => {
      if (bData && this.activeBuilding?.zoneId !== zone.id) return;

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
