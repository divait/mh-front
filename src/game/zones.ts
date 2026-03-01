import { Zone } from "./types";
import { CELL_W, CELL_H } from "./constants";

export const ZONES: Zone[] = [
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
    buildingType: "boulangerie",
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
    buildingType: "guard_post",
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
    buildingType: "tavern",
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
    buildingType: "cabaret",
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
    buildingType: "prefecture",
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
    buildingType: "atelier",
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
