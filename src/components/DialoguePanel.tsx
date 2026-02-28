import { useState, useRef, useEffect, FormEvent } from "react";

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
}

const NPC_PORTRAITS: Record<string, string> = {
  baker: "🍞",
  guard: "⚔️",
  tavern_keeper: "🍷",
};

// Keywords that suggest a clue was discovered
const CLUE_TRIGGERS: Record<string, string[]> = {
  baker: ["miche", "pain", "courrier", "matin", "caché", "livraison"],
  guard: ["saisir", "ordre", "pamphlet", "courrier", "fuir", "disparu"],
  tavern_keeper: ["itinéraire", "Renard", "vendu", "regrette", "sou", "liste"],
};

export function DialoguePanel({
  npcId,
  npcName,
  sessionId,
  modelVariant,
  onClose,
  onClueDiscovered,
}: DialoguePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          onClueDiscovered(`[${npcName}] "${trigger}" mentionné`);
          break;
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "npc", content: "*(Le personnage ne répond pas...)*" },
      ]);
    } finally {
      setLoading(false);
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
              {modelVariant === "finetuned" ? "🧠 Modèle affiné" : "💬 Prompt engineering"}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <p style={styles.hint}>
              Posez votre première question au témoin...
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
                <span style={styles.playerLabel}>Vous:</span>
              ) : (
                <span style={styles.npcLabel}>{npcName}:</span>
              )}
              <span style={styles.msgText}>{msg.content}</span>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.message, ...styles.npcMsg }}>
              <span style={styles.npcLabel}>{npcName}:</span>
              <span style={{ ...styles.msgText, fontStyle: "italic", opacity: 0.6 }}>
                ...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={styles.form}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question en français ou en anglais..."
            disabled={loading}
            autoFocus
          />
          <button style={styles.sendBtn} type="submit" disabled={loading || !input.trim()}>
            Envoyer
          </button>
        </form>
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
    maxHeight: "55vh",
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
  form: { display: "flex", gap: 8, padding: "10px 16px", borderTop: "1px solid #4a3a10" },
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
};
