interface TitleScreenProps {
  isLoading: boolean;
  onStart: () => void;
}

export function TitleScreen({ isLoading, onStart }: TitleScreenProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Decorative top rule */}
        <div style={styles.rule} />

        {/* Title */}
        <h1 style={styles.title}>Les Mystères de Paris</h1>
        <div style={styles.subtitle}>Paris, 1900</div>

        {/* Decorative divider */}
        <div style={styles.divider}>⚜ ─────────────── ⚜</div>

        {/* Flavour text */}
        <p style={styles.flavour}>
          A crime has shaken the city. The Préfecture calls upon you.
          <br />
          Gather evidence, question witnesses, and bring the guilty to justice —
          <br />
          before time runs out.
        </p>

        {/* Start button */}
        <button
          style={{
            ...styles.startBtn,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          onClick={onStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <span style={styles.loadingRow}>
              <span style={styles.spinner} />
              Preparing the case...
            </span>
          ) : (
            "Begin Investigation"
          )}
        </button>

        {/* Bottom rule */}
        <div style={styles.rule} />

        <div style={styles.footer}>
          Belle Époque Mystery — Powered by Mistral AI
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Semi-transparent so the city is visible behind
    background: "rgba(10, 7, 2, 0.78)",
    backdropFilter: "blur(2px)",
  },
  card: {
    background: "rgba(20, 14, 4, 0.97)",
    border: "2px solid #d4af37",
    borderRadius: 16,
    padding: "48px 56px",
    maxWidth: 560,
    width: "90vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    boxShadow: "0 0 80px rgba(212, 175, 55, 0.15), 0 0 200px rgba(0,0,0,0.9)",
    textAlign: "center",
  },
  rule: {
    width: "100%",
    height: 1,
    background: "linear-gradient(to right, transparent, #d4af37, transparent)",
  },
  title: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 2,
    margin: 0,
    lineHeight: 1.2,
    textShadow: "0 0 30px rgba(212,175,55,0.4)",
  },
  subtitle: {
    color: "#a89060",
    fontFamily: "Georgia, serif",
    fontSize: 18,
    fontStyle: "italic",
    letterSpacing: 4,
    marginTop: -8,
  },
  divider: {
    color: "#4a3a10",
    fontSize: 14,
    letterSpacing: 2,
  },
  flavour: {
    color: "#c8bfa0",
    fontFamily: "Georgia, serif",
    fontSize: 15,
    lineHeight: 1.8,
    margin: 0,
    maxWidth: 420,
  },
  startBtn: {
    background: "transparent",
    border: "2px solid #d4af37",
    borderRadius: 8,
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 17,
    padding: "14px 40px",
    letterSpacing: 1,
    transition: "background 0.2s, color 0.2s",
    marginTop: 8,
    minWidth: 220,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid #4a3a10",
    borderTop: "2px solid #d4af37",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    color: "#4a3a10",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
};
