import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { ParisScene, ZoneClickedEvent, MAP_WIDTH, MAP_HEIGHT } from "./game/ParisScene";
import { DialoguePanel } from "./components/DialoguePanel";
import { HUD } from "./components/HUD";
import { GameOverScreen } from "./components/GameOverScreen";
import { IntroDialogue } from "./components/IntroDialogue";
import {
  DAY_DURATION_MS,
  MAX_ARREST_ATTEMPTS,
  computeTotalDays,
  getTimeOfDay,
  getPhaseProgress,
  getDayNightOverlay,
  getDangerOverlay,
  TIME_OF_DAY_ICONS,
  type GamePhase,
  type TimeOfDay,
} from "./game/gameState";

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

  // ── Intro state ──────────────────────────────────────────────────────────────
  const [showIntro, setShowIntro] = useState(true);

  // ── NPC / UI state ──────────────────────────────────────────────────────────
  const [activeNPC, setActiveNPC] = useState<ActiveNPC | null>(null);
  const [personGreeting, setPersonGreeting] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number } | null>(null);
  const [clues, setClues] = useState<string[]>([]);
  const [modelVariant, setModelVariant] = useState<"prompt_engineered" | "finetuned">(
    "prompt_engineered"
  );

  // ── Game state ───────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [loseReason, setLoseReason] = useState<"time" | "attempts" | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(3);
  const [dayElapsedMs, setDayElapsedMs] = useState(0);
  const [arrestAttempts, setArrestAttempts] = useState(0);
  const [questTitle, setQuestTitle] = useState("The Stolen Mona Lisa");
  const [questSolution, setQuestSolution] = useState<Record<string, string> | null>(null);

  // Refs for values used inside setInterval (avoid stale closure)
  const gamePhaseRef = useRef<GamePhase>("playing");
  const currentDayRef = useRef(1);
  const totalDaysRef = useRef(3);
  const dayElapsedMsRef = useRef(0);
  const timerPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
  useEffect(() => { currentDayRef.current = currentDay; }, [currentDay]);
  useEffect(() => { totalDaysRef.current = totalDays; }, [totalDays]);
  useEffect(() => { dayElapsedMsRef.current = dayElapsedMs; }, [dayElapsedMs]);

  // Pause timer whenever a panel is open or intro is showing
  useEffect(() => {
    timerPausedRef.current = activeNPC !== null || isMapOpen || showIntro;
  }, [activeNPC, isMapOpen, showIntro]);

  // ── Fetch quest on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchQuest() {
      try {
        const res = await fetch(`/quest/session/${SESSION_ID}`);
        if (res.ok) {
          const data = await res.json();
          const clueCount: number = data.clues?.length ?? 6;
          setTotalDays(computeTotalDays(clueCount));
          totalDaysRef.current = computeTotalDays(clueCount);
          if (data.title) setQuestTitle(data.title);
        }
      } catch {
        // Silently fall back to defaults (QUEST_0 has 6 clues → 3 days)
      }
    }
    fetchQuest();
  }, []);

  // ── Game timer (1-second tick) ───────────────────────────────────────────────
  useEffect(() => {
    const TICK_MS = 1000;
    const id = setInterval(() => {
      if (timerPausedRef.current) return;
      if (gamePhaseRef.current !== "playing") return;

      const nextElapsed = dayElapsedMsRef.current + TICK_MS;

      if (nextElapsed >= DAY_DURATION_MS) {
        // Day is over
        if (currentDayRef.current < totalDaysRef.current) {
          // Advance to next day
          const nextDay = currentDayRef.current + 1;
          currentDayRef.current = nextDay;
          dayElapsedMsRef.current = 0;
          setCurrentDay(nextDay);
          setDayElapsedMs(0);

          // Update Phaser title
          const scene = gameRef.current?.scene.getScene("ParisScene") as ParisScene | null;
          scene?.setDayLabel(nextDay);
        } else {
          // Out of days → lose
          gamePhaseRef.current = "lost_time";
          setGamePhase("lost_time");
          setLoseReason("time");
        }
      } else {
        dayElapsedMsRef.current = nextElapsed;
        setDayElapsedMs(nextElapsed);

        // Update Phaser day/night overlay
        const dayProgress = nextElapsed / DAY_DURATION_MS;
        const phase = getTimeOfDay(dayProgress);
        const phaseProgress = getPhaseProgress(dayProgress);
        const timeLeftSec = Math.ceil((DAY_DURATION_MS - nextElapsed) / 1000);
        const danger = getDangerOverlay(currentDayRef.current, totalDaysRef.current, timeLeftSec);
        const { color, alpha } = danger ?? getDayNightOverlay(phase, phaseProgress);
        const scene = gameRef.current?.scene.getScene("ParisScene") as ParisScene | null;
        scene?.setDayNightOverlay(color, alpha);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, []); // runs once; uses refs to avoid stale closures

  // ── Derived time-of-day values for HUD ──────────────────────────────────────
  const dayProgress = dayElapsedMs / DAY_DURATION_MS;
  const timeOfDay: TimeOfDay = getTimeOfDay(dayProgress);
  const timeOfDayLabel = `${TIME_OF_DAY_ICONS[timeOfDay]} ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`;
  const dayTimeLeftSec = Math.max(0, Math.ceil((DAY_DURATION_MS - dayElapsedMs) / 1000));

  // ── Intro complete handler ───────────────────────────────────────────────────
  const handleIntroComplete = useCallback((title: string, _firstLead: string) => {
    if (title) setQuestTitle(title);
    setShowIntro(false);
    // Re-enable movement now that the intro is dismissed
    const scene = gameRef.current?.scene.getScene("ParisScene") as ParisScene | null;
    scene?.setMovementEnabled(true);
  }, []);

  // ── Arrest outcome handler ───────────────────────────────────────────────────
  const handleArrestAttempt = useCallback(
    (result: "success" | "failure", solution?: Record<string, string>) => {
      if (result === "success") {
        if (solution) setQuestSolution(solution);
        setGamePhase("won");
        gamePhaseRef.current = "won";
        setActiveNPC(null);
      } else {
        const next = arrestAttempts + 1;
        setArrestAttempts(next);
        if (next >= MAX_ARREST_ATTEMPTS) {
          setGamePhase("lost_attempts");
          gamePhaseRef.current = "lost_attempts";
          setLoseReason("attempts");
          setActiveNPC(null);
        }
      }
    },
    [arrestAttempts]
  );

  // ── Phaser / React bridge ────────────────────────────────────────────────────
  const setSceneMovement = useCallback((enabled: boolean) => {
    const scene = gameRef.current?.scene.getScene("ParisScene") as ParisScene | null;
    scene?.setMovementEnabled(enabled);
  }, []);

  const handleZoneClicked = useCallback((event: ZoneClickedEvent) => {
    if (event.category === "person") {
      setPersonGreeting(event.greeting ?? "");
      return;
    }
    setActiveNPC({ id: event.npcId, name: event.npcName, category: event.category });
    setSceneMovement(false);
  }, [setSceneMovement]);

  function handleClueDiscovered(clue: string) {
    setClues((prev) => (prev.includes(clue) ? prev : [...prev, clue]));
  }

  // ── Keyboard dismiss for overlays ────────────────────────────────────────────
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

  // ── Phaser game init ─────────────────────────────────────────────────────────
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
        postBoot: (game) => {
          // Disable movement until the intro dialogue is dismissed
          setTimeout(() => {
            const scene = game.scene.getScene("ParisScene") as ParisScene | null;
            scene?.setMovementEnabled(false);
          }, 500);
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
        currentDay={currentDay}
        totalDays={totalDays}
        dayProgress={dayProgress}
        timeOfDayLabel={timeOfDayLabel}
        dayTimeLeftSec={dayTimeLeftSec}
        arrestAttempts={arrestAttempts}
      />

      {activeNPC && activeNPC.category !== "person" && (
        <DialoguePanel
          npcId={activeNPC.id}
          npcName={activeNPC.name}
          sessionId={SESSION_ID}
          modelVariant={modelVariant}
          onClose={() => { setActiveNPC(null); setSceneMovement(true); }}
          onClueDiscovered={handleClueDiscovered}
          isInspector={activeNPC.id === "inspector"}
          arrestAttempts={arrestAttempts}
          clues={clues}
          onArrestAttempt={handleArrestAttempt}
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

      {gamePhase !== "playing" && (
        <GameOverScreen
          phase={gamePhase}
          loseReason={loseReason}
          questTitle={questTitle}
          questSolution={questSolution}
          cluesFound={clues.length}
          totalDays={totalDays}
        />
      )}

      {showIntro && gamePhase === "playing" && (
        <IntroDialogue
          sessionId={SESSION_ID}
          onComplete={handleIntroComplete}
        />
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
