import { useState, useEffect, useCallback } from "react";

interface IntroDialogueProps {
  sessionId: string;
  onComplete: (questTitle: string, firstLeadNpc: string) => void;
}

const CHAR_DELAY_MS = 28; // ms per character for typewriter

export function IntroDialogue({ sessionId, onComplete }: IntroDialogueProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [questTitle, setQuestTitle] = useState("");
  const [firstLeadNpc, setFirstLeadNpc] = useState("baker");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch intro lines from backend
  useEffect(() => {
    async function fetchIntro() {
      try {
        const res = await fetch(`/dialogue/intro/${sessionId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLines(data.lines ?? []);
        setQuestTitle(data.quest_title ?? "");
        setFirstLeadNpc(data.first_lead_npc ?? "baker");
      } catch {
        // Fallback lines if backend is down
        setLines([
          "Ah — you have arrived at last. I am Inspecteur Gaston Lefèvre of the Sûreté.",
          "The Mona Lisa has vanished from the Louvre overnight. Paris is in shock.",
          "I have three days to hand the Préfet a name, a motive, and a method.",
          "You are my eyes and ears in the streets, Monsieur l'enquêteur.",
          "Begin at La Boulangerie near the Louvre — the baker saw something at dawn.",
          "Report back to me here when you have evidence. Bonne chance.",
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchIntro();
  }, [sessionId]);

  // Typewriter effect for the current line
  useEffect(() => {
    if (loading || lines.length === 0) return;
    if (currentLineIndex >= lines.length) {
      setIsDone(true);
      return;
    }

    const fullLine = lines[currentLineIndex];
    let charIndex = 0;
    setDisplayedText("");
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      charIndex++;
      setDisplayedText(fullLine.slice(0, charIndex));
      if (charIndex >= fullLine.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, CHAR_DELAY_MS);

    return () => clearInterval(typeInterval);
  }, [currentLineIndex, lines, loading]);

  const skipAll = useCallback(() => {
    onComplete(questTitle, firstLeadNpc);
  }, [questTitle, firstLeadNpc, onComplete]);

  const advance = useCallback(() => {
    if (isTyping) {
      // Skip to end of current line instantly
      setDisplayedText(lines[currentLineIndex] ?? "");
      setIsTyping(false);
      return;
    }
    if (isDone) {
      onComplete(questTitle, firstLeadNpc);
      return;
    }
    setCurrentLineIndex((i) => i + 1);
  }, [isTyping, isDone, lines, currentLineIndex, questTitle, firstLeadNpc, onComplete]);

  // Keyboard: Space or Enter advances
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.panel}>
          <div style={styles.loadingText}>Inspecteur Lefèvre is gathering his notes...</div>
        </div>
      </div>
    );
  }

  const lineProgress = `${Math.min(currentLineIndex + 1, lines.length)} / ${lines.length}`;

  return (
    <div style={styles.overlay} onClick={advance}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.portrait}>🔍</span>
          <div>
            <div style={styles.speakerName}>Inspecteur Gaston Lefèvre</div>
            <div style={styles.speakerRole}>Sûreté — Opening Briefing</div>
          </div>
          <div style={styles.progress}>{lineProgress}</div>
          <button
            style={styles.skipButton}
            onClick={(e) => { e.stopPropagation(); skipAll(); }}
          >
            Skip Intro ⏭
          </button>
        </div>

        {/* Dialogue text */}
        <div style={styles.textBox}>
          {/* Already-spoken lines (dimmed) */}
          {lines.slice(0, currentLineIndex).map((line, i) => (
            <p key={i} style={styles.pastLine}>{line}</p>
          ))}
          {/* Current line with typewriter cursor */}
          {currentLineIndex < lines.length && (
            <p style={styles.currentLine}>
              {displayedText}
              {isTyping && <span style={styles.cursor}>▌</span>}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer} onClick={advance}>
          {isDone ? (
            <span style={styles.footerCta}>Click to begin your investigation →</span>
          ) : isTyping ? (
            <span style={styles.footerHint}>Click to skip ▸</span>
          ) : (
            <span style={styles.footerHint}>Click to continue ▸</span>
          )}
        </div>
      </div>

      {/* Quest title badge */}
      {questTitle && (
        <div style={styles.questBadge}>
          📜 {questTitle}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 150,
    background: "rgba(0,0,0,0.88)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "0 0 32px",
    cursor: "pointer",
  },
  panel: {
    background: "#1a1208",
    border: "2px solid #d4af37",
    borderRadius: "12px 12px 0 0",
    width: "min(820px, 100%)",
    maxHeight: "55vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -12px 60px rgba(0,0,0,0.9)",
    cursor: "default",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 20px",
    borderBottom: "1px solid #3a2a08",
    background: "rgba(212,175,55,0.06)",
    flexShrink: 0,
  },
  portrait: { fontSize: 36 },
  speakerName: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 18,
  },
  speakerRole: {
    color: "#8a7a40",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    marginTop: 2,
  },
  progress: {
    marginLeft: "auto",
    color: "#6a5a30",
    fontSize: 12,
    fontFamily: "Georgia, serif",
  },
  textBox: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  pastLine: {
    color: "#6a5a30",
    fontFamily: "Georgia, serif",
    fontSize: 15,
    lineHeight: 1.65,
    margin: 0,
    fontStyle: "italic",
  },
  currentLine: {
    color: "#e8dfc0",
    fontFamily: "Georgia, serif",
    fontSize: 16,
    lineHeight: 1.7,
    margin: 0,
  },
  cursor: {
    color: "#d4af37",
    animation: "blink 0.8s step-end infinite",
  },
  footer: {
    padding: "12px 24px",
    borderTop: "1px solid #3a2a08",
    textAlign: "right",
    flexShrink: 0,
    cursor: "pointer",
  },
  footerCta: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
  },
  footerHint: {
    color: "#6a5a30",
    fontFamily: "Georgia, serif",
    fontSize: 13,
  },
  loadingText: {
    color: "#8a7a40",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: 15,
    padding: 32,
    textAlign: "center",
  },
  skipButton: {
    marginLeft: 12,
    background: "none",
    border: "1px solid #6a5a30",
    borderRadius: 6,
    color: "#6a5a30",
    fontFamily: "Georgia, serif",
    fontSize: 12,
    padding: "5px 12px",
    cursor: "pointer",
    flexShrink: 0,
    transition: "border-color 0.15s, color 0.15s",
  },
  questBadge: {
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(26,18,8,0.95)",
    border: "1px solid #d4af37",
    borderRadius: 8,
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 15,
    padding: "8px 20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
    pointerEvents: "none",
  },
};
