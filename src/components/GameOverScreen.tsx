import { type GamePhase } from "../game/gameState";

interface GameOverScreenProps {
  phase: GamePhase;
  loseReason: "time" | "attempts" | null;
  questTitle: string;
  questSolution: Record<string, string> | null;
  cluesFound: number;
  totalDays: number;
}

export function GameOverScreen({
  phase,
  loseReason,
  questTitle,
  questSolution,
  cluesFound,
  totalDays,
}: GameOverScreenProps) {
  const isWin = phase === "won";

  function handlePlayAgain() {
    window.location.reload();
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, borderColor: isWin ? "#d4af37" : "#cc4444" }}>
        {/* Icon */}
        <div style={styles.icon}>{isWin ? "🏆" : "📋"}</div>

        {/* Title */}
        <h1 style={{ ...styles.title, color: isWin ? "#d4af37" : "#cc4444" }}>
          {isWin ? "Case Solved!" : "You've Been Fired!"}
        </h1>

        {/* Quest name */}
        <div style={styles.questName}>{questTitle}</div>

        {/* Status message */}
        <p style={styles.message}>
          {isWin
            ? "The Inspector made the arrest. Justice is served in Belle Époque Paris."
            : loseReason === "time"
            ? `${totalDays} day${totalDays !== 1 ? "s" : ""} passed and the case remains unsolved. The Préfecture has replaced you.`
            : "Three failed accusations — the Inspector has lost all confidence in your abilities."}
        </p>

        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Clues found</span>
            <span style={styles.statValue}>{cluesFound}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Days elapsed</span>
            <span style={styles.statValue}>{totalDays}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Outcome</span>
            <span style={{ ...styles.statValue, color: isWin ? "#4a9a4a" : "#cc4444" }}>
              {isWin ? "Victory" : "Defeat"}
            </span>
          </div>
        </div>

        {/* Solution reveal (win only) */}
        {isWin && questSolution && (
          <div style={styles.solutionBox}>
            <div style={styles.solutionTitle}>The Truth Revealed</div>
            {questSolution.suspect && (
              <div style={styles.solutionRow}>
                <span style={styles.solutionKey}>Suspect:</span>
                <span style={styles.solutionVal}>{questSolution.suspect}</span>
              </div>
            )}
            {questSolution.motive && (
              <div style={styles.solutionRow}>
                <span style={styles.solutionKey}>Motive:</span>
                <span style={styles.solutionVal}>{questSolution.motive}</span>
              </div>
            )}
            {questSolution.method && (
              <div style={styles.solutionRow}>
                <span style={styles.solutionKey}>Method:</span>
                <span style={styles.solutionVal}>{questSolution.method}</span>
              </div>
            )}
          </div>
        )}

        {/* Play again */}
        <button style={styles.playAgainBtn} onClick={handlePlayAgain}>
          🔄 Play Again
        </button>

        <div style={styles.footer}>
          Paris, 1900 — Les Mystères de Paris
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(0,0,0,0.92)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "#1a1208",
    border: "3px solid #d4af37",
    borderRadius: 16,
    padding: "40px 48px",
    maxWidth: 560,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 0 60px rgba(0,0,0,1)",
    textAlign: "center",
  },
  icon: {
    fontSize: 64,
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  questName: {
    color: "#a89060",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: 16,
  },
  message: {
    color: "#e8dfc0",
    fontFamily: "Georgia, serif",
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 420,
  },
  stats: {
    display: "flex",
    gap: 24,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #3a3020",
    borderRadius: 8,
    padding: "12px 24px",
    width: "100%",
    justifyContent: "center",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    color: "#6a5a30",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: "#d4af37",
    fontSize: 20,
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
  },
  solutionBox: {
    background: "rgba(212,175,55,0.06)",
    border: "1px solid #4a3a10",
    borderRadius: 8,
    padding: "14px 20px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textAlign: "left",
  },
  solutionTitle: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },
  solutionRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
  },
  solutionKey: {
    color: "#8a7a40",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    flexShrink: 0,
    width: 60,
  },
  solutionVal: {
    color: "#e8dfc0",
    fontSize: 13,
    fontFamily: "Georgia, serif",
    lineHeight: 1.4,
  },
  playAgainBtn: {
    background: "#d4af37",
    border: "none",
    borderRadius: 8,
    color: "#1a1208",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 16,
    padding: "12px 32px",
    cursor: "pointer",
    marginTop: 8,
    boxShadow: "0 4px 16px rgba(212,175,55,0.3)",
  },
  footer: {
    color: "#4a3a10",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
  },
};
