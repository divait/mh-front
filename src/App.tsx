import { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import {
  ParisScene,
  MAP_WIDTH,
  MAP_HEIGHT,
} from "./game/ParisScene";
import { ZoneClickedEvent } from "./game/types";
import { DialoguePanel } from "./components/DialoguePanel";
import { HUD } from "./components/HUD";
import { GameOverScreen } from "./components/GameOverScreen";
import { IntroDialogue } from "./components/IntroDialogue";
import { TitleScreen } from "./components/TitleScreen";
import bgMusicSrc from "./assets/background_music.mp3";
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

type AppState = "title" | "loading_quest" | "camera_pan" | "intro" | "playing";

// Stable session ID for this browser tab
const SESSION_ID = `session_${Math.random().toString(36).slice(2, 10)}`;

interface ActiveNPC {
  id: string;
  name: string;
  category: "original" | "belle_epoque" | "person";
}

export interface NpcClues {
  name: string;
  summary: string;  // AI-generated investigator's note for this NPC
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapGridRef = useRef<HTMLDivElement | null>(null);

  // ── App state machine ─────────────────────────────────────────────────────────
  const [appState, setAppState] = useState<AppState>("title");
  const appStateRef = useRef<AppState>("title");

  // ── NPC / UI state ──────────────────────────────────────────────────────────
  const [activeNPC, setActiveNPC] = useState<ActiveNPC | null>(null);
  const [personGreeting, setPersonGreeting] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [clues, setClues] = useState<Record<string, NpcClues>>({});
  const [modelVariant, setModelVariant] = useState<
    "prompt_engineered" | "finetuned"
  >("prompt_engineered");
  const modelVariantRef = useRef<{ variant: "prompt_engineered" | "finetuned" }>({ variant: "prompt_engineered" });

  const [showDevQuest, setShowDevQuest] = useState(false);
  const [devQuestData, setDevQuestData] = useState<any>(null);
  
  // Background music setup
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Start background music once when app starts
    const bgAudio = new Audio(bgMusicSrc);
    bgAudio.volume = 0.15;
    bgAudio.loop = true;
    bgAudioRef.current = bgAudio;
    
    // Autoplay may be blocked by browser until first interaction.
    // That's generally fine for a web game, but we can attempt to start it immediately.
    bgAudio.play()
      .catch(e => console.error("BG Music play blocked by browser:", e));

    return () => {
      bgAudio.pause();
    };
  }, []);

  // Set up an interaction listener on the window to ensure audio plays 
  // if browser policy blocked the autoplay above
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (bgAudioRef.current && bgAudioRef.current.paused) {
        bgAudioRef.current.play()
          .catch(() => {});
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    modelVariantRef.current.variant = modelVariant;
  }, [modelVariant]);

  // ── Game state ───────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [loseReason, setLoseReason] = useState<"time" | "attempts" | null>(
    null,
  );
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(3);
  const [dayElapsedMs, setDayElapsedMs] = useState(0);
  const [arrestAttempts, setArrestAttempts] = useState(0);
  const [questTitle, setQuestTitle] = useState("The Stolen Mona Lisa");
  const [questSolution, setQuestSolution] = useState<Record<
    string,
    string
  > | null>(null);

  // Refs for values used inside setInterval (avoid stale closure)
  const gamePhaseRef = useRef<GamePhase>("playing");
  const currentDayRef = useRef(1);
  const totalDaysRef = useRef(3);
  const dayElapsedMsRef = useRef(0);
  const timerPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);
  useEffect(() => {
    currentDayRef.current = currentDay;
  }, [currentDay]);
  useEffect(() => {
    totalDaysRef.current = totalDays;
  }, [totalDays]);
  useEffect(() => {
    dayElapsedMsRef.current = dayElapsedMs;
  }, [dayElapsedMs]);

  // Keep appStateRef in sync
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Pause timer whenever a panel is open or not yet playing
  useEffect(() => {
    timerPausedRef.current =
      activeNPC !== null || isMapOpen || appState !== "playing";
  }, [activeNPC, isMapOpen, appState]);

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
          const scene = gameRef.current?.scene.getScene(
            "ParisScene",
          ) as ParisScene | null;
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
        const danger = getDangerOverlay(
          currentDayRef.current,
          totalDaysRef.current,
          timeLeftSec,
        );
        const { color, alpha } =
          danger ?? getDayNightOverlay(phase, phaseProgress);
        const scene = gameRef.current?.scene.getScene(
          "ParisScene",
        ) as ParisScene | null;
        scene?.setDayNightOverlay(color, alpha);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, []); // runs once; uses refs to avoid stale closures

  // ── Derived time-of-day values for HUD ──────────────────────────────────────
  const dayProgress = dayElapsedMs / DAY_DURATION_MS;
  const timeOfDay: TimeOfDay = getTimeOfDay(dayProgress);
  const timeOfDayLabel = `${TIME_OF_DAY_ICONS[timeOfDay]} ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`;
  const dayTimeLeftSec = Math.max(
    0,
    Math.ceil((DAY_DURATION_MS - dayElapsedMs) / 1000),
  );

  // ── Start handler (triggered by TitleScreen) ─────────────────────────────────
  const handleStart = useCallback(async () => {
    setAppState("loading_quest");
    appStateRef.current = "loading_quest";
    try {
      const gmModel = modelVariantRef.current.variant === "finetuned" ? "finetuned" : "mistral-medium-latest";
      const res = await fetch("/quest/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, model: gmModel }),
      });
      if (res.ok) {
        const data = await res.json();
        const clueCount: number = data.clues?.length ?? 6;
        const days = computeTotalDays(clueCount);
        setTotalDays(days);
        totalDaysRef.current = days;
        if (data.title) setQuestTitle(data.title);
      }
    } catch {
      // Fall back to defaults (QUEST_0: 6 clues → 3 days)
    }

    // Quest loaded → start camera pan
    setAppState("camera_pan");
    appStateRef.current = "camera_pan";
    const scene = gameRef.current?.scene.getScene(
      "ParisScene",
    ) as ParisScene | null;
    scene?.panToInspector(() => {
      setAppState("intro");
      appStateRef.current = "intro";
    });
  }, []);

  // ── Intro complete handler ───────────────────────────────────────────────────
  const handleIntroComplete = useCallback(
    (title: string, _firstLead: string) => {
      if (title) setQuestTitle(title);
      setAppState("playing");
      appStateRef.current = "playing";
      // Re-enable movement now that the intro is dismissed
      const scene = gameRef.current?.scene.getScene(
        "ParisScene",
      ) as ParisScene | null;
      scene?.setMovementEnabled(true);
    },
    [],
  );

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
    [arrestAttempts],
  );

  // ── Phaser / React bridge ────────────────────────────────────────────────────
  const setSceneMovement = useCallback((enabled: boolean) => {
    const scene = gameRef.current?.scene.getScene(
      "ParisScene",
    ) as ParisScene | null;
    scene?.setMovementEnabled(enabled);
  }, []);

  const handleZoneClicked = useCallback(
    (event: ZoneClickedEvent) => {
      if (event.category === "person") {
        setPersonGreeting(event.greeting ?? "");
        return;
      }
      setActiveNPC({
        id: event.npcId,
        name: event.npcName,
        category: event.category,
      });
      setSceneMovement(false);
    },
    [setSceneMovement],
  );

  function handleClueDiscovered(
    npcId: string,
    npcName: string,
    summary: string,
  ) {
    if (!summary) return;
    setClues((prev) => ({
      ...prev,
      [npcId]: { name: npcName, summary },
    }));
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
          // Zoom out to show the full city as the title screen backdrop
          setTimeout(() => {
            const scene = game.scene.getScene(
              "ParisScene",
            ) as ParisScene | null;
            scene?.setMovementEnabled(false);
            scene?.zoomOutToCity();
          }, 500);
        },
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const isGameActive = appState === "playing" || appState === "intro";

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />

      {/* Title screen overlay — shown until quest is loaded and camera pan starts */}
      {(appState === "title" || appState === "loading_quest") && (
        <TitleScreen
          isLoading={appState === "loading_quest"}
          onStart={handleStart}
          modelVariant={modelVariant}
          onToggleModel={() => setModelVariant((v) => v === "prompt_engineered" ? "finetuned" : "prompt_engineered")}
        />
      )}

      {/* Top-left Map Button — only visible during active gameplay */}
      {isGameActive && (
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
            const scene = gameRef.current?.scene.getScene(
              "ParisScene",
            ) as ParisScene | null;
            if (scene) setPlayerPos(scene.getPlayerPosition());
            setIsMapOpen(true);
          }}
        >
          🗺️ City Map
        </button>
      )}

      {/* Bottom-left Dev Tools Quest Reveal Button */}
      {isGameActive && (
        <button
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            zIndex: 60,
            background: "rgba(26,18,8,0.92)",
            border: "1px dashed #888",
            borderRadius: 8,
            color: "#888",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "monospace",
            padding: "8px 12px",
          }}
          onClick={async () => {
             if (!showDevQuest) {
                try {
                  const r = await fetch(`/quest/session/${SESSION_ID}`);
                  if (r.ok) setDevQuestData(await r.json());
                } catch { /* ignore */ }
             }
             setShowDevQuest(!showDevQuest);
          }}
        >
          ⚙️ Debug: {showDevQuest ? "Hide" : "Show"} Quest Truth
        </button>
      )}

      {/* Dev Tools Quest Display Panel */}
      {isGameActive && showDevQuest && devQuestData && (
        <div 
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
          position: "fixed",
          bottom: 60,
          left: 16,
          zIndex: 60,
          background: "rgba(10,10,10,0.95)",
          border: "1px solid #d4af37",
          borderRadius: 8,
          padding: 16,
          width: 400,
          maxHeight: "60vh",
          overflowY: "auto",
          color: "#e8dfc0",
          fontFamily: "Georgia, serif",
          fontSize: 13,
          boxShadow: "0 0 20px rgba(0,0,0,0.8)",
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#d4af37", fontSize: 16 }}>Actual Game Master Output</h3>
          <p><strong>Title:</strong> {devQuestData.title}</p>
          <p><strong>Description:</strong> {devQuestData.description}</p>
          <div style={{ margin: "10px 0", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
            <strong>The True Solution:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
              <li><strong>Who:</strong> {devQuestData.solution?.suspect ?? "Missing"}</li>
              <li><strong>Why:</strong> {devQuestData.solution?.motive ?? "Missing"}</li>
              <li><strong>How:</strong> {devQuestData.solution?.method ?? "Missing"}</li>
            </ul>
          </div>
          <strong>Red Herrings generated:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {devQuestData.red_herrings?.map((rh: string, i: number) => <li key={i}>{rh}</li>)}
          </ul>
          
          <div style={{ marginTop: 10, borderTop: "1px dashed rgba(212, 175, 55, 0.3)", paddingTop: 10 }}>
            <strong>Generated Clues (The Chain):</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {devQuestData.clues?.map((c: any, i: number) => (
                <div key={i} style={{ background: "rgba(0,0,0,0.4)", padding: 8, borderRadius: 4, borderLeft: "2px solid #a89060" }}>
                  <div style={{ color: "#d4af37", fontWeight: "bold", marginBottom: 4 }}>
                    {c.sequence}. {c.npc_id} {c.leads_to ? `→ points to ${c.leads_to}` : " (Final File)"}
                  </div>
                  <div style={{ fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: "#888" }}>Secret:</span> {c.secret}
                  </div>
                  <div style={{ fontSize: 11, fontStyle: "italic", color: "#c8bfa0" }}>
                    <span style={{ color: "#888", fontStyle: "normal" }}>Hint:</span> "{c.hint}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isGameActive && (
        <HUD
          clues={clues}
          currentDay={currentDay}
          totalDays={totalDays}
          dayProgress={dayProgress}
          timeOfDayLabel={timeOfDayLabel}
          dayTimeLeftSec={dayTimeLeftSec}
          arrestAttempts={arrestAttempts}
        />
      )}

      {activeNPC && activeNPC.category !== "person" && (
        <DialoguePanel
          npcId={activeNPC.id}
          npcName={activeNPC.name}
          sessionId={SESSION_ID}
          onClose={() => {
            setActiveNPC(null);
            setSceneMovement(true);
          }}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  color: "#d4af37",
                  margin: 0,
                  fontFamily: "Georgia, serif",
                }}
              >
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
              ref={(el) => {
                mapGridRef.current = el;
              }}
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
              <div style={{ ...mapStyles.park, gridColumn: "span 2" }}>
                🌳 Park
              </div>
              <div style={{ ...mapStyles.house, gridColumn: "span 2" }}>
                Houses
              </div>

              {/* Row 2 */}
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.house}>House</div>
              <div style={mapStyles.cell}>💃 Moulin Rouge</div>
              <div style={{ ...mapStyles.house, gridRow: "span 2" }}>
                Large House
              </div>
              <div style={mapStyles.house}>House</div>

              {/* Row 3 */}
              <div style={{ ...mapStyles.cell, gridColumn: "span 3" }}>
                ⚖️ Prefecture
              </div>
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

            <div
              style={{
                marginTop: 16,
                color: "#a89060",
                fontSize: 13,
                fontStyle: "italic",
              }}
            >
              Highlighted zones are key investigation sites. Explore the city to
              find all witnesses.
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
          cluesFound={Object.keys(clues).length}
          totalDays={totalDays}
        />
      )}

      {appState === "intro" && gamePhase === "playing" && (
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
