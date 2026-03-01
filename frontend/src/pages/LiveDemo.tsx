import { useCallback, useEffect, useRef, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { useNavigate, useParams } from "react-router-dom";
import {
  useSession,
  SessionProvider,
  useAgent,
  useVoiceAssistant,
  useSessionMessages,
  AudioTrack,
  BarVisualizer,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Zap, ArrowLeft, Bot, Mic, MicOff, Square, Loader2, Play, Flag, Check,
} from "lucide-react";

const BACKEND_URL = "https://4763-88-86-246-30.ngrok-free.app";
const TOKEN_ENDPOINT = `${BACKEND_URL}/livekit/token`;
const LIVEKIT_SERVER = "wss://voxcontrol-9474dul5.livekit.cloud";

type AgentStatus = "idle" | "connecting" | "connected" | "disconnecting" | "error";

const STATUS_CFG: Record<AgentStatus, { label: string; dot: string }> = {
  idle:           { label: "Ready",          dot: "bg-muted-foreground" },
  connecting:     { label: "Connecting\u2026",    dot: "bg-amber-400 animate-pulse" },
  connected:      { label: "Connected",      dot: "bg-emerald-500" },
  disconnecting:  { label: "Disconnecting\u2026", dot: "bg-amber-400 animate-pulse" },
  error:          { label: "Error",          dot: "bg-red-500" },
};

const AGENT_STATE_COLOR: Record<string, string> = {
  disconnected: "text-muted-foreground",
  connecting:   "text-amber-400",
  initializing: "text-amber-400",
  idle:         "text-muted-foreground",
  listening:    "text-emerald-400",
  thinking:     "text-violet-400",
  speaking:     "text-indigo-400",
  failed:       "text-red-400",
};

const ACTION_BADGE: Record<string, string> = {
  expect_options:       "bg-blue-500/15 text-blue-400",
  inform_user_critical: "bg-red-500/15 text-red-400",
  inform_user_basic:    "bg-teal-500/15 text-teal-400",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface RawEvent {
  id: string;
  timestamp: number;
  data: unknown;
  from: string;
}

interface OptionRoute {
  option: string;
  next: string;
}

interface MilestoneCard {
  id: string;
  title: string;
  action: string;
  completionCriteria?: string;
  question?: string;
  instruction?: string;
  expectedOptions?: string[];
  optionRoutes?: OptionRoute[];
  choices?: string[];
  prereqCards?: string[];
}

// ── Milestone stepper ────────────────────────────────────────────────────────
function MilestoneStepper({
  milestoneCards,
  completedCardIds,
  selectedOptions,
  activeCardId,
}: {
  milestoneCards: MilestoneCard[];
  completedCardIds: Set<string>;
  selectedOptions: Map<string, string>;
  activeCardId: string | null;
}) {
  if (milestoneCards.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/50 italic p-4">
        No milestone cards defined.
      </p>
    );
  }

  return (
    <div className="p-4">
      {milestoneCards.map((card, index) => {
        const isCompleted = completedCardIds.has(card.id);
        const isActive    = card.id === activeCardId;
        const isLast      = index === milestoneCards.length - 1;
        const selectedOpt = selectedOptions.get(card.id);
        const nextCardId  = card.optionRoutes?.find((r) => r.option === selectedOpt)?.next;

        return (
          <div key={card.id} className="flex gap-3">
            {/* Left column: dot + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-colors ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500/20"
                    : isActive
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-border/50 bg-secondary"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                ) : (
                  <span className="text-[9px] text-muted-foreground/60 font-mono select-none">
                    {index + 1}
                  </span>
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-px flex-1 min-h-[20px] my-1 transition-colors ${
                    isCompleted ? "bg-emerald-500/35" : "bg-border/35"
                  }`}
                />
              )}
            </div>

            {/* Right column: card content */}
            <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-4"}`}>
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <span
                  className={`text-xs font-semibold leading-tight ${
                    isCompleted
                      ? "text-emerald-300"
                      : isActive
                      ? "text-amber-300"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {card.title}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5 ${
                    ACTION_BADGE[card.action] ?? "bg-secondary text-muted-foreground"
                  }`}
                >
                  {card.action.replace(/_/g, " ")}
                </span>
              </div>

              {card.question && (
                <p className="text-[10px] text-foreground/45 leading-relaxed italic mb-1.5">
                  \u201c{card.question}\u201d
                </p>
              )}

              {!card.question && card.instruction && (
                <p className="text-[10px] text-foreground/45 leading-relaxed italic mb-1.5">
                  {card.instruction}
                </p>
              )}

              {isCompleted && selectedOpt && (
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className="text-[9px] text-muted-foreground/50">selected</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/20">
                    {selectedOpt}
                  </span>
                  {nextCardId && (
                    <>
                      <span className="text-[9px] text-muted-foreground/40">\u2192</span>
                      <span className="text-[9px] font-mono text-indigo-400/80">{nextCardId}</span>
                    </>
                  )}
                </div>
              )}

              {!isCompleted && card.expectedOptions && card.expectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {card.expectedOptions.map((opt) => (
                    <span
                      key={opt}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                        isActive
                          ? "bg-amber-400/5 border-amber-400/20 text-amber-300/70"
                          : "bg-secondary/50 border-border/30 text-muted-foreground/50"
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}

              {card.completionCriteria && (
                <p className="text-[9px] text-muted-foreground/30 leading-relaxed">
                  {card.completionCriteria}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Inner panel (inside SessionProvider) ─────────────────────────────────────
function AgentPanelInner({
  session,
  status,
  error,
  micMuted,
  rawEvents,
  milestoneCards,
  onToggleMic,
  onDisconnect,
}: {
  session: ReturnType<typeof useSession>;
  status: AgentStatus;
  error: string | null;
  micMuted: boolean;
  rawEvents: RawEvent[];
  milestoneCards: MilestoneCard[];
  onToggleMic: () => void;
  onDisconnect: () => void;
}) {
  const agent = useAgent(session);
  const { audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { messages } = useSessionMessages(session);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const eventsRef     = useRef<HTMLDivElement>(null);

  const [completedCardIds, setCompletedCardIds] = useState<Set<string>>(new Set());
  const [selectedOptions,  setSelectedOptions]  = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (rawEvents.length === 0 || milestoneCards.length === 0) return;
    const validIds = new Set(milestoneCards.map((c) => c.id));
    const updatedCompleted = new Set(completedCardIds);
    const updatedSelected  = new Map(selectedOptions);
    let changed = false;

    for (const evt of rawEvents) {
      const d = evt.data as Record<string, unknown> | null;
      if (!d) continue;
      const cardId = d.card_id ?? d.completed_card ?? d.cardId ?? d.milestone_id;
      if (typeof cardId !== "string" || !validIds.has(cardId)) continue;

      if (!updatedCompleted.has(cardId)) {
        updatedCompleted.add(cardId);
        changed = true;
      }
      const opt = d.selected_option ?? d.option ?? d.result ?? d.chosen_option;
      if (typeof opt === "string" && !updatedSelected.has(cardId)) {
        updatedSelected.set(cardId, opt);
        changed = true;
      }
    }

    if (changed) {
      setCompletedCardIds(updatedCompleted);
      setSelectedOptions(updatedSelected);
    }
  }, [rawEvents, milestoneCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCardId = milestoneCards.find((c) => !completedCardIds.has(c.id))?.id ?? null;

  useEffect(() => {
    transcriptRef.current?.scrollTo(0, transcriptRef.current.scrollHeight);
  }, [agentTranscriptions, messages]);

  useEffect(() => {
    eventsRef.current?.scrollTo(0, eventsRef.current.scrollHeight);
  }, [rawEvents]);

  const allTranscripts = [
    ...agentTranscriptions.map((t) => ({
      id:    t.id,
      role:  "agent" as const,
      text:  t.text,
      final: t.final,
    })),
    ...messages
      .filter((m) => m.from?.isLocal === true)
      .map((m) => ({
        id:    String(m.timestamp),
        role:  "user" as const,
        text:  typeof m.message === "string" ? m.message : "",
        final: true,
      })),
  ].sort((a, b) => Number(a.id) - Number(b.id));

  const { label, dot } = STATUS_CFG[status];
  const stateColor  = AGENT_STATE_COLOR[agent.state] ?? "text-muted-foreground";
  const isConnected = status === "connected";

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Status bar */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-medium">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className="text-foreground">{label}</span>
            {(status === "connecting" || status === "disconnecting") && (
              <Loader2 className="w-3 h-3 text-amber-400 animate-spin ml-0.5" />
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="opacity-60 mr-1">Server</span>
              <code className="font-mono text-[10px] text-foreground/80 truncate max-w-[200px]">
                {LIVEKIT_SERVER}
              </code>
            </span>
            {isConnected && agent.state && (
              <span>
                <span className="opacity-60 mr-1">State</span>
                <code className={`font-mono font-semibold ${stateColor}`}>{agent.state}</code>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                className={`h-7 text-xs gap-1 ${
                  micMuted
                    ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                }`}
                onClick={onToggleMic}
              >
                {micMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {micMuted ? "Unmute" : "Mic on"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDisconnect}
              disabled={status === "disconnecting"}
            >
              <Square className="h-3 w-3" />
              Stop Agent
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">
            {error}
          </div>
        )}

        {isConnected && (
          <div className="flex items-start gap-4">
            {audioTrack && <AudioTrack trackRef={audioTrack} />}
            <div className="w-28 h-8 shrink-0">
              <BarVisualizer
                state={agent.state}
                track={audioTrack}
                barCount={16}
                style={{ "--lk-fg": "hsl(var(--primary))", "--lk-va-bg": "transparent" } as React.CSSProperties}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Three-column: Transcripts + Milestones + Raw Events */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">

        {/* Live Transcripts */}
        <div className="rounded-lg border border-border bg-card flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold tracking-widest text-muted-foreground">LIVE TRANSCRIPTS</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{allTranscripts.length} msgs</span>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {allTranscripts.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic">Waiting for conversation\u2026</p>
            ) : (
              allTranscripts.map((t) => (
                <div key={t.id} className={`flex gap-2 text-xs ${t.final ? "opacity-100" : "opacity-50"}`}>
                  <span className={`shrink-0 font-semibold ${
                    t.role === "agent" ? "text-indigo-400" : "text-emerald-400"
                  }`}>
                    {t.role === "agent" ? "Agent" : "You"}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{t.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Milestones — step-by-step flow */}
        <div className="rounded-lg border border-border bg-card flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold tracking-widest text-muted-foreground">MILESTONES</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {completedCardIds.size}/{milestoneCards.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MilestoneStepper
              milestoneCards={milestoneCards}
              completedCardIds={completedCardIds}
              selectedOptions={selectedOptions}
              activeCardId={activeCardId}
            />
          </div>
        </div>

        {/* Raw Events */}
        <div className="rounded-lg border border-border bg-card flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold tracking-widest text-muted-foreground">RAW EVENTS</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{rawEvents.length} events</span>
          </div>
          <div ref={eventsRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {rawEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic">Waiting for agent events\u2026</p>
            ) : (
              rawEvents.map((evt) => (
                <div key={evt.id} className="rounded border border-border/50 bg-secondary/30 p-2">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                    <span className="font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    <span>from <code className="text-foreground/70">{evt.from}</code></span>
                  </div>
                  <pre className="text-[11px] text-foreground/80 font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(evt.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── LiveSession wrapper ──────────────────────────────────────────────────────
function LiveSession({
  agentName,
  agentId,
  milestoneCards,
  onDisconnected,
}: {
  agentName: string;
  agentId: string;
  milestoneCards: MilestoneCard[];
  onDisconnected: () => void;
}) {
  // POST vox_agent_id to the token endpoint so the backend
  // knows which agent to attach to this LiveKit session.
  const session = useSession(
    TokenSource.endpoint(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    }),
    { agentName: agentName || "my-agent", roomName: 'room-'+agentId }
  );

  const [status,    setStatus]    = useState<AgentStatus>("connecting");
  const [error,     setError]     = useState<string | null>(null);
  const [micMuted,  setMicMuted]  = useState(false);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    console.log("[LiveDemo] \uD83D\uDE80 Starting session...", { agentName, agentId, session });
    console.log("[LiveDemo] vox_agent_id:", agentId);
    console.log("[LiveDemo] Token endpoint:", TOKEN_ENDPOINT);
    console.log("[LiveDemo] LiveKit server:", LIVEKIT_SERVER);

    session
      .start({ tracks: { microphone: { enabled: false } } })
      .then(async () => {
        try {
          await session.room?.localParticipant.setMicrophoneEnabled(true);
          console.log("[LiveDemo] \uD83C\uDFA4 Microphone enabled after connect");
        } catch (micErr) {
          console.warn("[LiveDemo] \u26A0\uFE0F Mic not available (user can unmute later):", micErr);
        }
        if (!cancelled) {
          console.log("[LiveDemo] \u2705 Session started successfully!");
          console.log("[LiveDemo] Room:", session.room?.name, "| State:", session.room?.state);
          console.log("[LiveDemo] Local participant identity:", session.room?.localParticipant?.identity);
          console.log("[LiveDemo] Num participants:", session.room?.numParticipants);
          setStatus("connected");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[LiveDemo] \u274C Session start FAILED:", err);
        console.error("[LiveDemo] Error name:",    err instanceof Error ? err.name    : "N/A");
        console.error("[LiveDemo] Error message:", err instanceof Error ? err.message : String(err));
        console.error("[LiveDemo] Error stack:",   err instanceof Error ? err.stack   : "N/A");
        setError(err instanceof Error ? err.message : "Connection failed");
        setStatus("error");
        setTimeout(() => { if (!cancelled) onDisconnected(); }, 3000);
      });
    return () => { cancelled = true; session.end(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const room = session.room;
    console.log("[LiveDemo] \uD83D\uDCE1 Setting up room event listeners. Room:", room);
    if (!room) {
      console.warn("[LiveDemo] \u26A0\uFE0F No room available yet, skipping event setup");
      return;
    }

    room.registerTextStreamHandler("agent-events", async (reader, participantInfo) => {
      console.log("[LiveDemo] \uD83D\uDCE8 Text stream 'agent-events' from:", participantInfo.identity);
      try {
        const raw = await reader.readAll();
        const evt = JSON.parse(raw);
        console.log("[LiveDemo] Parsed event:", evt);
        setRawEvents((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, timestamp: Date.now(), data: evt, from: participantInfo.identity },
        ]);
      } catch (err) {
        console.warn("[LiveDemo] Failed to parse agent event:", err);
      }
    });

    const handleData = (payload: Uint8Array) => {
      const decoded = new TextDecoder().decode(payload);
      try {
        const evt = JSON.parse(decoded);
        console.log("[LiveDemo] \uD83D\uDCE6 Data channel event:", evt);
        setRawEvents((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, timestamp: Date.now(), data: evt, from: "data-channel" },
        ]);
      } catch (e) {
        console.warn("[LiveDemo] Failed to parse data channel payload:", e);
      }
    };

    const handleDisconnect = () => { onDisconnected(); };

    const logEvent = (name: string) => (...args: unknown[]) =>
      console.log(`[LiveDemo] \uD83D\uDD14 ${name}`, ...args);

    room.on("participantConnected",    logEvent("participantConnected"));
    room.on("participantDisconnected", logEvent("participantDisconnected"));
    room.on("trackSubscribed",         logEvent("trackSubscribed"));
    room.on("trackUnsubscribed",       logEvent("trackUnsubscribed"));
    room.on("trackPublished",          logEvent("trackPublished"));
    room.on("activeSpeakersChanged",   logEvent("activeSpeakersChanged"));
    room.on("connectionStateChanged",  logEvent("connectionStateChanged"));
    room.on("mediaDevicesError",       logEvent("mediaDevicesError"));
    room.on("reconnecting",            logEvent("reconnecting"));
    room.on("reconnected",             logEvent("reconnected"));
    room.on("signalConnected",         logEvent("signalConnected"));
    room.on("dataReceived",  handleData);
    room.on("disconnected",  handleDisconnect);

    return () => {
      room.unregisterTextStreamHandler("agent-events");
      room.off("dataReceived",  handleData);
      room.off("disconnected",  handleDisconnect);
    };
  }, [session.room, onDisconnected]);

  const handleToggleMic = useCallback(async () => {
    const room = session.room;
    if (!room) return;
    const next = !micMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMicMuted(next);
  }, [session, micMuted]);

  const handleDisconnect = useCallback(async () => {
    setStatus("disconnecting");
    await session.end();
    onDisconnected();
  }, [session, onDisconnected]);

  return (
    <SessionProvider session={session}>
      <AgentPanelInner
        session={session}
        status={status}
        error={error}
        micMuted={micMuted}
        rawEvents={rawEvents}
        milestoneCards={milestoneCards}
        onToggleMic={handleToggleMic}
        onDisconnect={handleDisconnect}
      />
    </SessionProvider>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LiveDemo() {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const [agentName,      setAgentName]      = useState("");
  const [milestoneCards, setMilestoneCards] = useState<MilestoneCard[]>([]);
  const [agentActive,    setAgentActive]    = useState(false);
  const { state: engineState, startLiveKit, stopLiveKit } = useEngine();

  const handlePlayAgent = useCallback(() => {
    startLiveKit();
    setAgentActive(true);
  }, [startLiveKit]);

  const handleStopAgent = useCallback(() => {
    stopLiveKit();
    setAgentActive(false);
  }, [stopLiveKit]);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/agents/${agentId}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setAgentName(data.agent_name || "Agent");
        setMilestoneCards(data.milestone_cards ?? []);
      } catch {
        setAgentName("Agent");
        setMilestoneCards([]);
      }
    })();
  }, [agentId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/30 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{agentName}</span>
            <span className="text-xs text-muted-foreground">\u2014 Live Demo</span>
          </div>
        </div>

        {!agentActive ? (
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white border-0"
            onClick={handlePlayAgent}
          >
            <Play className="h-3.5 w-3.5" />
            Play Agent
          </Button>
        ) : (
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleStopAgent}>
            <Square className="h-3.5 w-3.5" />
            Stop Agent
          </Button>
        )}
      </header>

      <div className="flex-1 p-6 flex flex-col min-h-0">
        {!agentActive ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Click <span className="font-semibold text-foreground">\u201cPlay Agent\u201d</span> to start a live session
              </p>
            </div>
          </div>
        ) : (
          <LiveSession
            agentName="my-agent"
            agentId={agentId ?? ""}
            milestoneCards={milestoneCards}
            onDisconnected={handleStopAgent}
          />
        )}
      </div>
    </div>
  );
}
