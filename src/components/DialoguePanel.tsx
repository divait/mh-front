import { useState, useRef, useEffect, FormEvent } from "react";
import { MAX_ARREST_ATTEMPTS } from "../game/gameState";

interface Message {
  role: "player" | "npc";
  content: string;
}

interface DialoguePanelProps {
  npcId: string;
  npcName: string;
  sessionId: string;
  modelVariant: "prompt_engineered" | "finetuned";
  onClose: () => void;
  onClueDiscovered: (clue: string) => void;
  isInspector?: boolean;
  arrestAttempts?: number;
  clues?: string[];
  onArrestAttempt?: (result: "success" | "failure", solution?: Record<string, string>) => void;
}

const NPC_PORTRAITS: Record<string, string> = {
  baker: "🥖",
  guard: "⚔️",
  tavern_keeper: "🍷",
  cabaret_dancer: "💃",
  inspector: "🔍",
  artist: "🎨",
};

// Keywords that suggest a clue was discovered (Belle Époque)
const CLUE_TRIGGERS: Record<string, string[]> = {
  baker: ["esquisse", "miche", "pain", "caché", "livraison", "louvre"],
  guard: ["saisir", "ordre", "pamphlet", "disparu", "préfecture", "accès"],
  tavern_keeper: ["itinéraire", "Renard", "vendu", "regrette", "horaire", "nuit"],
  cabaret_dancer: ["coulisses", "entré", "passage", "secret", "porte", "moulin"],
  inspector: ["accès", "suspect", "identité", "dossier", "sûreté", "preuves"],
  artist: ["motif", "ami", "raison", "montmartre", "besoin", "argent"],
};

export function DialoguePanel({
  npcId,
  npcName,
  sessionId,
  modelVariant,
  onClose,
  onClueDiscovered,
  isInspector = false,
  arrestAttempts = 0,
  clues = [],
  onArrestAttempt,
}: DialoguePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Accusation panel state
  const [showAccuse, setShowAccuse] = useState(false);
  const [accuseText, setAccuseText] = useState("");
  const [selectedClues, setSelectedClues] = useState<Set<number>>(new Set());
  const [accuseLoading, setAccuseLoading] = useState(false);

  const attemptsLeft = MAX_ARREST_ATTEMPTS - arrestAttempts;
  const canAccuse = isInspector && attemptsLeft > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "player", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/dialogue/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          npc_id: npcId,
          player_message: text,
          model_variant: modelVariant,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.response;

      setMessages((prev) => [...prev, { role: "npc", content: reply }]);

      // Check for clue keywords in the reply
      const triggers = CLUE_TRIGGERS[npcId] ?? [];
      const replyLower = reply.toLowerCase();
      for (const trigger of triggers) {
        if (replyLower.includes(trigger)) {
          onClueDiscovered(`[${npcName}] "${trigger}" mentioned`);
          break;
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "npc", content: "*(The character does not respond...)*" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleClue(index: number) {
    setSelectedClues((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function submitAccusation(e: FormEvent) {
    e.preventDefault();
    const argument = accuseText.trim();
    if (!argument || accuseLoading) return;

    setAccuseLoading(true);

    const attachedClues = clues.filter((_, i) => selectedClues.has(i));
    const evidenceSummary =
      attachedClues.length > 0
        ? `\n\nEvidence I have gathered:\n${attachedClues.map((c) => `- ${c}`).join("\n")}`
        : "";

    const fullArgument = `${argument}${evidenceSummary}`;

    // 1. Send the argument to the inspector as a dialogue message so the AI reacts in-character
    setMessages((prev) => [
      ...prev,
      { role: "player", content: `[ACCUSATION] ${fullArgument}` },
    ]);

    try {
      const [dialogueRes, solveRes] = await Promise.all([
        fetch("/dialogue/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            npc_id: npcId,
            player_message: `The player is making a formal accusation: ${fullArgument}. React in character as the inspector — if the argument is compelling and evidence is solid, say you will make the arrest. If it is weak or wrong, dismiss it coldly.`,
            model_variant: modelVariant,
          }),
        }),
        fetch("/quest/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            suspect: argument,
            motive: argument,
            method: argument,
          }),
        }),
      ]);

      // Show inspector's in-character reaction
      if (dialogueRes.ok) {
        const dialogueData = await dialogueRes.json();
        setMessages((prev) => [
          ...prev,
          { role: "npc", content: dialogueData.response ?? "*(silence)*" },
        ]);
      }

      if (!solveRes.ok) throw new Error(`Solve HTTP ${solveRes.status}`);
      const solveData = await solveRes.json();

      setShowAccuse(false);
      setAccuseText("");
      setSelectedClues(new Set());

      if (solveData.correct) {
        onArrestAttempt?.("success", solveData.solution ?? undefined);
      } else {
        onArrestAttempt?.("failure");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "npc", content: "*(The inspector stares at you in silence...)*" },
      ]);
      onArrestAttempt?.("failure");
    } finally {
      setAccuseLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.portrait}>{NPC_PORTRAITS[npcId] ?? "👤"}</span>
          <div>
            <div style={styles.npcName}>{npcName}</div>
            <div style={styles.modelBadge}>
              {modelVariant === "finetuned" ? "🧠 Fine-tuned Model" : "💬 Prompt Engineering"}
            </div>
          </div>
          {isInspector && (
            <div style={styles.attemptsBadge}>
              ⚖️ {attemptsLeft}/{MAX_ARREST_ATTEMPTS} accusations
            </div>
          )}
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.hint}>
              {isInspector
                ? "Gather your evidence, then use \"Make Accusation\" to convince the Inspector to make an arrest..."
                : "Ask your first question to the witness..."}
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                ...(msg.role === "player" ? styles.playerMsg : styles.npcMsg),
              }}
            >
              {msg.role === "player" ? (
                <span style={styles.playerLabel}>You:</span>
              ) : (
                <span style={styles.npcLabel}>{npcName}:</span>
              )}
              <span style={styles.msgText}>{msg.content}</span>
            </div>
          ))}
          {(loading || accuseLoading) && (
            <div style={{ ...styles.message, ...styles.npcMsg }}>
              <span style={styles.npcLabel}>{npcName}:</span>
              <span style={{ ...styles.msgText, fontStyle: "italic", opacity: 0.6 }}>
                ...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Accusation panel (inspector only, expanded) */}
        {isInspector && showAccuse && (
          <form onSubmit={submitAccusation} style={styles.accusePanel}>
            <div style={styles.accusePanelTitle}>
              ⚖️ Make Your Accusation
              <span style={styles.accuseAttemptsNote}>
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
              </span>
            </div>

            <textarea
              style={styles.accuseTextarea}
              value={accuseText}
              onChange={(e) => setAccuseText(e.target.value)}
              placeholder="State your case: who did it, why, and how? Be specific — name the suspect and their motive..."
              rows={3}
              disabled={accuseLoading}
            />

            {clues.length > 0 && (
              <div style={styles.evidenceSection}>
                <div style={styles.evidenceTitle}>Attach evidence from your journal:</div>
                <div style={styles.clueCheckboxes}>
                  {clues.map((clue, i) => (
                    <label key={i} style={styles.clueCheckboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedClues.has(i)}
                        onChange={() => toggleClue(i)}
                        style={{ marginRight: 6 }}
                      />
                      <span style={styles.clueCheckboxText}>{clue}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.accuseActions}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => { setShowAccuse(false); setAccuseText(""); setSelectedClues(new Set()); }}
                disabled={accuseLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitAccuseBtn,
                  opacity: !accuseText.trim() || accuseLoading ? 0.5 : 1,
                }}
                disabled={!accuseText.trim() || accuseLoading}
              >
                {accuseLoading ? "Presenting..." : "Present to Inspector"}
              </button>
            </div>
          </form>
        )}

        {/* Input row */}
        <div style={styles.inputRow}>
          <form onSubmit={sendMessage} style={styles.form}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your question..."
              disabled={loading || accuseLoading || showAccuse}
              autoFocus={!showAccuse}
            />
            <button
              style={styles.sendBtn}
              type="submit"
              disabled={loading || accuseLoading || !input.trim() || showAccuse}
            >
              Send
            </button>
          </form>

          {canAccuse && !showAccuse && (
            <button
              style={styles.accuseBtn}
              onClick={() => setShowAccuse(true)}
              disabled={loading || accuseLoading}
            >
              ⚖️ Accuse
              <span style={styles.accuseBtnHint}>({attemptsLeft} left)</span>
            </button>
          )}

          {isInspector && attemptsLeft === 0 && (
            <div style={styles.noAttemptsWarning}>
              No accusations left — the Inspector has lost patience.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
    padding: "0 0 24px",
  },
  panel: {
    background: "#1e1508",
    border: "2px solid #d4af37",
    borderRadius: "12px 12px 0 0",
    width: "min(760px, 100%)",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.8)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid #4a3a10",
  },
  portrait: { fontSize: 32 },
  npcName: { color: "#d4af37", fontSize: 18, fontFamily: "Georgia, serif", fontWeight: "bold" },
  modelBadge: { fontSize: 11, color: "#8a7a40", marginTop: 2 },
  attemptsBadge: {
    marginLeft: "auto",
    background: "rgba(212,175,55,0.1)",
    border: "1px solid #4a3a10",
    borderRadius: 6,
    color: "#d4af37",
    fontSize: 12,
    padding: "4px 10px",
    fontFamily: "Georgia, serif",
  },
  closeBtn: {
    marginLeft: "auto",
    background: "none",
    border: "1px solid #4a3a10",
    color: "#a08040",
    cursor: "pointer",
    borderRadius: 4,
    padding: "4px 10px",
    fontSize: 16,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  hint: { color: "#6a5a30", fontStyle: "italic", textAlign: "center", marginTop: 20 },
  message: { display: "flex", gap: 8, lineHeight: 1.5 },
  playerMsg: { flexDirection: "row-reverse" },
  npcMsg: { flexDirection: "row" },
  playerLabel: { color: "#6ab0f5", fontWeight: "bold", flexShrink: 0, fontSize: 13 },
  npcLabel: { color: "#d4af37", fontWeight: "bold", flexShrink: 0, fontSize: 13 },
  msgText: { color: "#e8dfc0", fontSize: 14, fontFamily: "Georgia, serif" },

  // Accusation panel
  accusePanel: {
    background: "#120e04",
    borderTop: "1px solid #4a3a10",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  accusePanelTitle: {
    color: "#d4af37",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    fontSize: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accuseAttemptsNote: {
    fontSize: 11,
    color: "#8a7a40",
    fontWeight: "normal",
  },
  accuseTextarea: {
    background: "#1a1208",
    border: "1px solid #4a3a10",
    borderRadius: 6,
    color: "#e8dfc0",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "Georgia, serif",
    resize: "none",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  evidenceSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  evidenceTitle: {
    color: "#a89060",
    fontSize: 12,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
  },
  clueCheckboxes: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 100,
    overflowY: "auto",
  },
  clueCheckboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    cursor: "pointer",
    gap: 4,
  },
  clueCheckboxText: {
    color: "#e8dfc0",
    fontSize: 12,
    fontFamily: "Georgia, serif",
  },
  accuseActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    background: "none",
    border: "1px solid #4a3a10",
    borderRadius: 6,
    color: "#a08040",
    cursor: "pointer",
    padding: "6px 14px",
    fontSize: 13,
  },
  submitAccuseBtn: {
    background: "#8b1a1a",
    border: "1px solid #cc4444",
    borderRadius: 6,
    color: "#ffd0d0",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "6px 16px",
    fontSize: 13,
    fontFamily: "Georgia, serif",
  },

  // Input row
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "10px 16px",
    borderTop: "1px solid #4a3a10",
    alignItems: "center",
  },
  form: { display: "flex", gap: 8, flex: 1 },
  input: {
    flex: 1,
    background: "#120e04",
    border: "1px solid #4a3a10",
    borderRadius: 6,
    color: "#e8dfc0",
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "Georgia, serif",
    outline: "none",
  },
  sendBtn: {
    background: "#d4af37",
    border: "none",
    borderRadius: 6,
    color: "#1a1208",
    fontWeight: "bold",
    padding: "8px 18px",
    cursor: "pointer",
    fontSize: 14,
  },
  accuseBtn: {
    background: "#2a0a0a",
    border: "1px solid #cc4444",
    borderRadius: 6,
    color: "#ff9999",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "8px 14px",
    fontSize: 13,
    fontFamily: "Georgia, serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  accuseBtnHint: {
    fontSize: 10,
    color: "#cc6666",
    fontWeight: "normal",
  },
  noAttemptsWarning: {
    color: "#cc4444",
    fontSize: 11,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    flexShrink: 0,
    maxWidth: 120,
    textAlign: "center",
  },
};
