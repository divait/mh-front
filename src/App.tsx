import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { ParisScene, ZoneClickedEvent, ZoneId } from "./game/ParisScene";
import { DialoguePanel } from "./components/DialoguePanel";
import { HUD } from "./components/HUD";

// Stable session ID for this browser tab
const SESSION_ID = `session_${Math.random().toString(36).slice(2, 10)}`;

interface ActiveNPC {
  id: ZoneId;
  name: string;
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeNPC, setActiveNPC] = useState<ActiveNPC | null>(null);
  const [clues, setClues] = useState<string[]>([]);
  const [modelVariant, setModelVariant] = useState<"prompt_engineered" | "finetuned">(
    "prompt_engineered"
  );

  function handleZoneClicked(event: ZoneClickedEvent) {
    setActiveNPC({ id: event.npcId, name: event.npcName });
  }

  function handleClueDiscovered(clue: string) {
    setClues((prev) => (prev.includes(clue) ? prev : [...prev, clue]));
  }

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#1a1208",
      parent: containerRef.current,
      scene: ParisScene,
      callbacks: {
        preBoot: (game) => {
          game.scene.start("ParisScene", { onZoneClicked: handleZoneClicked });
        },
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />

      <HUD
        clues={clues}
        modelVariant={modelVariant}
        onToggleModel={() =>
          setModelVariant((v) => (v === "prompt_engineered" ? "finetuned" : "prompt_engineered"))
        }
      />

      {activeNPC && (
        <DialoguePanel
          npcId={activeNPC.id}
          npcName={activeNPC.name}
          sessionId={SESSION_ID}
          modelVariant={modelVariant}
          onClose={() => setActiveNPC(null)}
          onClueDiscovered={handleClueDiscovered}
        />
      )}
    </>
  );
}
