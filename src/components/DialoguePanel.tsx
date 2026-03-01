import { useState, useRef, useEffect, FormEvent } from "react";
import { MAX_ARREST_ATTEMPTS } from "../game/gameState";
import type { NpcClues } from "../App";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  role: "player" | "npc";
  content: string;
}

interface DialoguePanelProps {
  npcId: string;
  npcName: string;
  sessionId: string;

  onClose: () => void;
  onClueDiscovered: (npcId: string, npcName: string, summary: string) => void;
  isInspector?: boolean;
  arrestAttempts?: number;
  clues?: Record<string, NpcClues>;
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


export function DialoguePanel({
  npcId,
  npcName,
  sessionId,

  onClose,
  onClueDiscovered,
  isInspector = false,
  arrestAttempts = 0,
  clues = {},
  onArrestAttempt,
}: DialoguePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Speech API
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; 

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + " " + transcript : transcript);
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
          shouldKeepRecordingRef.current = false;
        }
      };
      recognition.onend = () => {
        setIsRecording(false);
        if (shouldKeepRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recording:", e);
            shouldKeepRecordingRef.current = false;
          }
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording || shouldKeepRecordingRef.current) {
      shouldKeepRecordingRef.current = false;
      recognitionRef.current?.stop();
    } else {
      shouldKeepRecordingRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch (e) {/* already started */}
    }
  };

  // Auto-send after 5 seconds of silence if recording
  useEffect(() => {
    if (!isRecording || !input.trim()) return;
    const timer = setTimeout(() => {
      handleSend(input);
    }, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isRecording]);

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

const INITIAL_GREETINGS: Record<string, string> = {
  baker: "Bonjour... what can I do for you?",
  guard: "State your business, quickly.",
  tavern_keeper: "Ah! Welcome, my friend. What can I get you?",
  cabaret_dancer: "Well, hello there... looking for a show?",
  inspector: "What is it now? Speak quickly.",
  artist: "Can't you see I'm working? What do you want?",
};

  useEffect(() => {
    if (messages.length === 0) {
      const greeting = INITIAL_GREETINGS[npcId] || "Hello.";
      setMessages([{ role: "npc", content: greeting }]);
      
      const audioUrl = `/dialogue/tts?text=${encodeURIComponent(greeting)}&npc_id=${npcId}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playNpcAudio = (text: string, id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audioUrl = `/dialogue/tts?text=${encodeURIComponent(text)}&npc_id=${id}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.play().catch(e => console.error("Audio playback failed:", e));
  };

  async function handleSend(textToSend: string) {
    const text = textToSend.trim();
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
          model_variant: "prompt_engineered",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.response;

      setMessages((prev) => [...prev, { role: "npc", content: reply }]);
      playNpcAudio(reply, npcId);

      // Non-blocking: ask Mistral to summarise the whole conversation so far into
      // a crisp investigator's note. The journal entry for this NPC is replaced
      // each time, so it only ever shows the best / latest distillation.
      const snapshot = [...messages, { role: "player", content: text }, { role: "npc", content: reply }];
      fetch("/dialogue/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          npc_id: npcId,
          npc_name: npcName,
          conversation: snapshot,
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.summary) onClueDiscovered(npcId, npcName, data.summary);
        })
        .catch(() => {/* ignore — journal update is best-effort */});
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

    // Flatten Record<npcId, NpcClues> → one string per NPC for evidence summary
    const clueLines = Object.values(clues).map(
      ({ name, summary }) => `[${name}] ${summary}`
    );
    const attachedClues = clueLines.filter((_, i) => selectedClues.has(i));
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
            model_variant: "prompt_engineered",
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
        const reply = dialogueData.response ?? "*(silence)*";
        setMessages((prev) => [
          ...prev,
          { role: "npc", content: reply },
        ]);
        playNpcAudio(reply, npcId);
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

            {Object.keys(clues).length > 0 && (
              <div style={styles.evidenceSection}>
                <div style={styles.evidenceTitle}>Attach evidence from your journal:</div>
                <div style={styles.clueCheckboxes}>
                  {Object.values(clues).map(({ name, summary }, i) => (
                    <label key={i} style={styles.clueCheckboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedClues.has(i)}
                        onChange={() => toggleClue(i)}
                        style={{ marginRight: 6 }}
                      />
                      <span style={styles.clueCheckboxText}>
                        <strong>[{name}]</strong>{" "}
                        {summary.length > 80 ? summary.slice(0, 77) + "…" : summary}
                      </span>
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
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={styles.form}>
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleRecording}
                style={{
                  ...styles.micBtn,
                  ...(isRecording ? styles.micBtnRecording : {}),
                }}
                disabled={loading || accuseLoading || showAccuse}
                title={isRecording ? "Stop recording" : "Start speaking"}
              >
                {isRecording ? "🔴" : "🎤"}
              </button>
            )}
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : "Ask your question..."}
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
  micBtn: {
    background: "#1e1508",
    border: "1px solid #4a3a10",
    borderRadius: 6,
    color: "#a08040",
    cursor: "pointer",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    transition: "background 0.2s, color 0.2s",
  },
  micBtnRecording: {
    background: "#4a1c1c",
    borderColor: "#cc4444",
    color: "#ff9999",
  },
};
