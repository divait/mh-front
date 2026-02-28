interface HUDProps {
  clues: string[];
  modelVariant: "prompt_engineered" | "finetuned";
  onToggleModel: () => void;
}

export function HUD({ clues, modelVariant, onToggleModel }: HUDProps) {
  return (
    <div style={styles.hud}>
      {/* Clue journal */}
      <div style={styles.journal}>
        <div style={styles.journalTitle}>📜 Investigation Journal</div>
        {clues.length === 0 ? (
          <div style={styles.noClues}>No clues found yet...</div>
        ) : (
          <ul style={styles.clueList}>
            {clues.map((clue, i) => (
              <li key={i} style={styles.clueItem}>
                {clue}
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
    gap: 12,
    zIndex: 50,
    width: 220,
  },
  journal: {
    background: "rgba(26,18,8,0.92)",
    border: "1px solid #d4af37",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
  },
  journalTitle: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
  },
  noClues: { color: "#6a5a30", fontStyle: "italic", fontSize: 12 },
  clueList: { listStyle: "none", display: "flex", flexDirection: "column", gap: 6 },
  clueItem: {
    color: "#e8dfc0",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    paddingLeft: 12,
    borderLeft: "2px solid #d4af37",
    lineHeight: 1.4,
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
