import { MAX_ARREST_ATTEMPTS } from "../game/gameState";
import type { NpcClues } from "../App";

interface HUDProps {
  clues: Record<string, NpcClues>;
  modelVariant: "prompt_engineered" | "finetuned";
  onToggleModel: () => void;
  currentDay: number;
  totalDays: number;
  dayProgress: number;
  timeOfDayLabel: string;
  dayTimeLeftSec: number;
  arrestAttempts: number;
}

export function HUD({
  clues,
  modelVariant,
  onToggleModel,
  currentDay,
  totalDays,
  dayProgress,
  timeOfDayLabel,
  dayTimeLeftSec,
  arrestAttempts,
}: HUDProps) {
  const minutesLeft = Math.floor(dayTimeLeftSec / 60);
  const secondsLeft = dayTimeLeftSec % 60;
  const timeStr = `${minutesLeft}:${String(secondsLeft).padStart(2, "0")}`;

  const attemptsLeft = MAX_ARREST_ATTEMPTS - arrestAttempts;
  const progressPercent = Math.round(dayProgress * 100);

  return (
    <div style={styles.hud}>
      {/* Day / time panel */}
      <div style={styles.panel}>
        <div style={styles.dayRow}>
          <span style={styles.dayLabel}>Day {currentDay} of {totalDays}</span>
          <span style={styles.timeOfDay}>{timeOfDayLabel}</span>
        </div>

        {/* Progress bar for the current day */}
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${progressPercent}%`,
              background: dayProgress > 0.8 ? "#cc4444" : dayProgress > 0.6 ? "#d4af37" : "#4a9a4a",
            }}
          />
        </div>

        <div style={styles.timeLeft}>
          ⏳ {timeStr} remaining today
        </div>
      </div>

      {/* Arrest attempts — shown once the player has at least one clue */}
      {Object.keys(clues).length > 0 && (
        <div style={styles.panel}>
          <div style={styles.accuseTitle}>⚖️ Accusations</div>
          <div style={styles.accuseDots}>
            {Array.from({ length: MAX_ARREST_ATTEMPTS }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.dot,
                  background: i < arrestAttempts ? "#cc4444" : "#4a9a4a",
                }}
              />
            ))}
          </div>
          <div style={styles.accuseHint}>
            {attemptsLeft > 0
              ? `${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left`
              : "No attempts left!"}
          </div>
        </div>
      )}

      {/* Clue journal */}
      <div style={styles.panel}>
        <div style={styles.journalTitle}>📜 Investigation Journal</div>
        {Object.keys(clues).length === 0 ? (
          <div style={styles.noClues}>No clues found yet...</div>
        ) : (
          <ul style={styles.clueList}>
            {Object.entries(clues).map(([npcId, { name, keywords }]) => (
              <li key={npcId} style={styles.clueItem}>
                <span style={styles.clueNpc}>[{name}]</span>
                <span style={styles.clueKeywords}>{keywords.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Model toggle — for the W&B demo comparison */}
      <button style={styles.modelToggle} onClick={onToggleModel}>
        {modelVariant === "prompt_engineered" ? (
          <>💬 Prompt Engineering<br /><span style={styles.toggleHint}>Switch → Fine-tuned Model</span></>
        ) : (
          <>🧠 Fine-tuned Model<br /><span style={styles.toggleHint}>Switch → Prompt Eng.</span></>
        )}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hud: {
    position: "fixed",
    top: 16,
    right: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 50,
    width: 220,
  },
  panel: {
    background: "rgba(26,18,8,0.92)",
    border: "1px solid #d4af37",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
  },
  dayRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dayLabel: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
  },
  timeOfDay: {
    color: "#e8dfc0",
    fontSize: 12,
    fontFamily: "Georgia, serif",
  },
  barTrack: {
    height: 6,
    background: "#2a2010",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 1s linear, background 1s ease",
  },
  timeLeft: {
    color: "#a89060",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    textAlign: "center",
  },
  accuseTitle: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 6,
  },
  accuseDots: {
    display: "flex",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  accuseHint: {
    color: "#a89060",
    fontSize: 11,
    fontFamily: "Georgia, serif",
  },
  journalTitle: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
  },
  noClues: { color: "#6a5a30", fontStyle: "italic", fontSize: 12 },
  clueList: { listStyle: "none", display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0 },
  clueItem: {
    fontSize: 12,
    fontFamily: "Georgia, serif",
    paddingLeft: 12,
    borderLeft: "2px solid #d4af37",
    lineHeight: 1.5,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  clueNpc: {
    color: "#d4af37",
    fontWeight: "bold",
    fontSize: 11,
  },
  clueKeywords: {
    color: "#e8dfc0",
    fontStyle: "italic",
    fontSize: 11,
  },
  modelToggle: {
    background: "rgba(26,18,8,0.92)",
    border: "1px solid #d4af37",
    borderRadius: 8,
    color: "#d4af37",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    padding: "10px 12px",
    textAlign: "center",
    lineHeight: 1.5,
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
  },
  toggleHint: { fontSize: 10, color: "#8a7a40", fontWeight: "normal" },
};
