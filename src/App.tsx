import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { ParisScene, ZoneClickedEvent, MAP_WIDTH, MAP_HEIGHT } from "./game/ParisScene";
import { DialoguePanel } from "./components/DialoguePanel";
import { HUD } from "./components/HUD";

// Stable session ID for this browser tab
const SESSION_ID = `session_${Math.random().toString(36).slice(2, 10)}`;

interface ActiveNPC {
  id: string;
  name: string;
  category: "original" | "belle_epoque" | "person";
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapGridRef = useRef<HTMLDivElement | null>(null);

  const [activeNPC, setActiveNPC] = useState<ActiveNPC | null>(null);
  const [personGreeting, setPersonGreeting] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number } | null>(null);
  const [clues, setClues] = useState<string[]>([]);
  const [modelVariant, setModelVariant] = useState<"prompt_engineered" | "finetuned">(
    "prompt_engineered"
  );

  const handleZoneClicked = useCallback((event: ZoneClickedEvent) => {
    if (event.category === "person") {
      setPersonGreeting(event.greeting ?? "");
      return;
    }
    setActiveNPC({ id: event.npcId, name: event.npcName, category: event.category });
  }, []);

  function handleClueDiscovered(clue: string) {
    setClues((prev) => (prev.includes(clue) ? prev : [...prev, clue]));
  }

  useEffect(() => {
    if (!personGreeting && !isMapOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPersonGreeting(null);
        setIsMapOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [personGreeting, isMapOpen]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#1a1208",
      parent: containerRef.current,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
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

      {/* Top-left Map Button */}
      <button
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 60,
          background: "rgba(26,18,8,0.92)",
          border: "1px solid #d4af37",
          borderRadius: 8,
          color: "#d4af37",
          cursor: "pointer",
          fontSize: 14,
          fontFamily: "Georgia, serif",
          fontWeight: "bold",
          padding: "10px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}
        onClick={() => {
          const scene = gameRef.current?.scene.getScene("ParisScene") as ParisScene | null;
          if (scene) setPlayerPos(scene.getPlayerPosition());
          setIsMapOpen(true);
        }}
      >
        🗺️ City Map
      </button>

      <HUD
        clues={clues}
        modelVariant={modelVariant}
        onToggleModel={() =>
          setModelVariant((v) => (v === "prompt_engineered" ? "finetuned" : "prompt_engineered"))
        }
      />

      {activeNPC && activeNPC.category !== "person" && (
        <DialoguePanel
          npcId={activeNPC.id}
          npcName={activeNPC.name}
          sessionId={SESSION_ID}
          modelVariant={modelVariant}
          onClose={() => setActiveNPC(null)}
          onClueDiscovered={handleClueDiscovered}
        />
      )}

      {personGreeting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setPersonGreeting(null)}
          role="dialog"
          aria-label="Person greeting"
        >
          <div
            style={{
              background: "#2a2520",
              border: "2px solid #888888",
              borderRadius: 12,
              padding: "20px 28px",
              maxWidth: "min(360px, 90vw)",
              color: "#e8dfc0",
              fontFamily: "Georgia, serif",
              fontSize: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {personGreeting}
            <div style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
              Click or press Escape to close
            </div>
          </div>
        </div>
      )}

      {isMapOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
          onClick={() => setIsMapOpen(false)}
        >
          <div
            style={{
              background: "#1a1208",
              border: "3px solid #d4af37",
              borderRadius: 16,
              width: "min(1000px, 95vw)",
              height: "min(750px, 85vh)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 0 50px rgba(0,0,0,1)",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ color: "#d4af37", margin: 0, fontFamily: "Georgia, serif" }}>
                🗺️ City Map — Paris 1900
              </h2>
              <button
                onClick={() => setIsMapOpen(false)}
                style={{
                  background: "none",
                  border: "1px solid #d4af37",
                  color: "#d4af37",
                  cursor: "pointer",
                  borderRadius: 4,
                  padding: "4px 12px",
                }}
              >
                Close (Esc)
              </button>
            </div>

            {/* Map Grid Visualization */}
            <div
              ref={(el) => { mapGridRef.current = el; }}
              style={{
                flex: 1,
                background: "#4a3e28",
                borderRadius: 8,
                position: "relative",
                border: "2px solid #5a4e38",
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gridTemplateRows: "repeat(4, 1fr)",
                gap: 14,
                padding: 14,
              }}
            >
              {/* Row 0 */}
              <div style={mapStyles.cell}>🥐 Bakery</div>
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.cell}>👮 Guard Post</div>
              <div style={mapStyles.cell}>🍷 Tavern</div>

              {/* Row 1 */}
              <div style={mapStyles.house}>House</div>
              <div style={{ ...mapStyles.park, gridColumn: "span 2" }}>🌳 Park</div>
              <div style={{ ...mapStyles.house, gridColumn: "span 2" }}>Houses</div>

              {/* Row 2 */}
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.cell}>💃 Moulin Rouge</div>
              <div style={{ ...mapStyles.house, gridRow: "span 2" }}>Large House</div>
              <div style={mapStyles.house}>House</div>

              {/* Row 3 */}
              <div style={{ ...mapStyles.cell, gridColumn: "span 3" }}>⚖️ Prefecture</div>
              {/* Col 3 is Large House span */}
              <div style={mapStyles.cell}>🎨 Atelier</div>

              {/* Player position dot */}
              {playerPos && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(playerPos.x / MAP_WIDTH) * 100}%`,
                    top: `${(playerPos.y / MAP_HEIGHT) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#e8d5a3",
                    border: "2px solid #fff",
                    boxShadow: "0 0 8px 3px rgba(232,213,163,0.7)",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                  title="You are here"
                />
              )}
            </div>

            <div style={{ marginTop: 16, color: "#a89060", fontSize: 13, fontStyle: "italic" }}>
              Highlighted zones are key investigation sites. Explore the city to find all witnesses.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const mapStyles: Record<string, React.CSSProperties> = {
  cell: {
    background: "rgba(212, 175, 55, 0.15)",
    border: "1px solid #d4af37",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    padding: 4,
  },
  house: {
    background: "rgba(58, 42, 26, 0.4)",
    border: "1px solid #3a3020",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6a5a30",
    fontSize: 11,
  },
  park: {
    background: "rgba(26, 58, 26, 0.3)",
    border: "1px solid #2a4a2a",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#4a6a4a",
    fontSize: 12,
  },
};
