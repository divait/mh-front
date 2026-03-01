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

export interface Zone {
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

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PendingInteraction {
  targetX: number;
  targetY: number;
  event: ZoneClickedEvent;
  indicator: Phaser.GameObjects.Graphics;
  useEnterAnimation: boolean;
  exteriorImg?: Phaser.GameObjects.Image;
  interior?: Phaser.GameObjects.Container;
}
