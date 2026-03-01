import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Zap, Brain, BookOpen, ExternalLink, Bot, Globe, Cpu, Mic, Volume2, Pencil, ArrowLeft } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import FlowTimeline from "@/components/FlowTimeline";
import CardEditorPanel from "@/components/CardEditorPanel";
import { initFlowState, FlowState, generateFlows } from "@/data/flowData";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { initSupportCards } from "@/data/supportCards";
import { toast } from "sonner";

const LLM_MODELS = ["GPT-4o", "GPT-4o Mini", "Claude 3.5 Sonnet", "Gemini 2.5 Flash", "Gemini 2.5 Pro"];
const STT_MODELS = ["Whisper Large V3", "Deepgram Nova 2", "Google Chirp", "Azure Speech"];
const TTS_MODELS = ["ElevenLabs Turbo V2.5", "OpenAI TTS-1", "Google WaveNet", "Azure Neural"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Arabic", "Chinese", "Japanese", "Portuguese", "Hindi", "Korean"];

const InnerLayout = () => {
  const navigate = useNavigate();
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const isNewAgent = routeAgentId === "new" || !routeAgentId;
  const [flowState, setFlowState] = useState<FlowState>(() => {
    if (isNewAgent) return { cards: {}, startCardId: null, presetFlows: [] };
    return initFlowState();
  });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const { setOpen, open } = useSidebar();
  const [agentContext, setAgentContext] = useState("");
  const [contextEditing, setContextEditing] = useState(true);
  const [contextLoaded, setContextLoaded] = useState(false);
  const knowledgeBaseCount = 3;

  const [agentName, setAgentName] = useState("");
  const [language, setLanguage] = useState("English");
  const [llmModel, setLlmModel] = useState("GPT-4o");
  const [sttModel, setSttModel] = useState("Whisper Large V3");
  const [ttsModel, setTtsModel] = useState("ElevenLabs Turbo V2.5");

  const [isDeployed, setIsDeployed] = useState(false);
  const [deployedSnapshot, setDeployedSnapshot] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [agentId, setAgentId] = useState(isNewAgent ? "" : routeAgentId || "");

  // Fetch agent from API on load if we have an ID
  useEffect(() => {
    if (isNewAgent) return;
    (async () => {
      try {
        const res = await fetch(`https://4763-88-86-246-30.ngrok-free.app/agents/${agentId}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        setAgentName(data.agent_name || "");
        setLanguage(data.language || "English");
        setLlmModel(data.llm_model || "GPT-4o");
        setSttModel(data.stt_model || "Whisper Large V3");
        setTtsModel(data.tts_model || "ElevenLabs Turbo V2.5");
        setAgentContext(data.agent_context || "");
        setContextEditing(!data.agent_context);
        setContextLoaded(true);
        if (data.milestone_cards) {
          const cardsMap: Record<string, any> = {};
          data.milestone_cards.forEach((c: any) => { cardsMap[c.id] = c; });
          const { startCardId, presetFlows } = generateFlows(cardsMap);
          setFlowState({ cards: cardsMap, startCardId, presetFlows });
        }
        if (data.deploy_status === "deployed") {
          setIsDeployed(true);
          const snapshot = JSON.stringify({ agentName: data.agent_name, language: data.language, llmModel: data.llm_model, sttModel: data.stt_model, ttsModel: data.tts_model, agentContext: data.agent_context, cards: data.milestone_cards ? Object.fromEntries(data.milestone_cards.map((c: any) => [c.id, c])) : {} });
          setDeployedSnapshot(snapshot);
        }
      } catch (err: any) {
        console.error("Failed to fetch agent:", err.message);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentSnapshot = () => JSON.stringify({ agentName, language, llmModel, sttModel, ttsModel, agentContext, cards: flowState.cards });

  // Track changes after deploy
  const checkForChanges = () => {
    if (!isDeployed) return;
    setHasChanges(getCurrentSnapshot() !== deployedSnapshot);
  };

  const handleDeploy = async () => {
    const supportCards = initSupportCards();
    const payload = {
      deploy_status: "deployed",
      agent_name: agentName,
      language,
      llm_model: llmModel,
      stt_model: sttModel,
      tts_model: ttsModel,
      agent_context: agentContext,
      milestone_cards: Object.values(flowState.cards),
      support_cards: Object.values(supportCards),
    };

    try {
      const isNew = !agentId;
      const url = isNew
        ? "https://4763-88-86-246-30.ngrok-free.app/agents"
        : `https://4763-88-86-246-30.ngrok-free.app/agents/${agentId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      if (isNew) {
        const data = await res.json();
        const id = data.id;
        setAgentId(id);
        navigate(`/editor/${id}`, { replace: true });
      }
      const snapshot = getCurrentSnapshot();
      setIsDeployed(true);
      setDeployedSnapshot(snapshot);
      setHasChanges(false);
      toast.success("Agent deployed!");
    } catch (err: any) {
      toast.error(`Deploy failed: ${err.message}`);
    }
  };

  const handleUndeploy = async () => {
    const supportCards = initSupportCards();
    const payload = {
      deploy_status: "undeployed",
      agent_name: agentName,
      language,
      llm_model: llmModel,
      stt_model: sttModel,
      tts_model: ttsModel,
      agent_context: agentContext,
      milestone_cards: Object.values(flowState.cards),
      support_cards: Object.values(supportCards),
    };
    try {
      const res = await fetch(`https://4763-88-86-246-30.ngrok-free.app/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setIsDeployed(false);
      setDeployedSnapshot("");
      setHasChanges(false);
      toast.success("Agent undeployed!");
    } catch (err: any) {
      toast.error(`Undeploy failed: ${err.message}`);
    }
  };

  const handleApplyChanges = async () => {
    const supportCards = initSupportCards();
    const payload = {
      deploy_status: "deployed",
      agent_name: agentName,
      language,
      llm_model: llmModel,
      stt_model: sttModel,
      tts_model: ttsModel,
      agent_context: agentContext,
      milestone_cards: Object.values(flowState.cards),
      support_cards: Object.values(supportCards),
    };
    try {
      const res = await fetch(`https://4763-88-86-246-30.ngrok-free.app/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const snapshot = getCurrentSnapshot();
      setDeployedSnapshot(snapshot);
      setHasChanges(false);
      toast.success("Changes applied!");
    } catch (err: any) {
      toast.error(`Apply failed: ${err.message}`);
    }
  };

  // Auto-detect changes whenever any tracked field changes
  useEffect(() => {
    if (!isDeployed) return;
    setHasChanges(JSON.stringify({ agentName, language, llmModel, sttModel, ttsModel, agentContext, cards: flowState.cards }) !== deployedSnapshot);
  }, [agentName, language, llmModel, sttModel, ttsModel, agentContext, flowState.cards, isDeployed, deployedSnapshot]);

  const isValid = agentName.trim() && language && llmModel && sttModel && ttsModel && agentContext.trim() && Object.keys(flowState.cards).length > 0;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar side="right" collapsible="offcanvas" className="border-l border-border/30">
        <SidebarContent>
          <CardEditorPanel
            flowState={flowState}
            onStateChange={(s) => {
              setFlowState(s);
              setEditingCardId(null);
            }}
            editingCardId={editingCardId}
            onEditCard={setEditingCardId}
            onClose={() => setOpen(false)}
          />
        </SidebarContent>
      </Sidebar>

      <div
        className="flex-1 flex flex-col min-w-0"
        onClick={() => { if (open) setOpen(false); }}
      >
        <header className="border-b border-border/30 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg text-foreground">VoxControl<span className="text-primary">.ai</span></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/"); }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All Agents
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Build Flow
            </button>
          </div>
        </header>

        {/* Agent Identity */}
        <div className="border-b border-border/30 px-6 py-4">
          <h1 className="text-base font-bold text-foreground mb-4">Agent Setup</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Bot className="h-3.5 w-3.5" /> Agent Name
              </label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Maya"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> Language
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" /> LLM Model
              </label>
              <Select value={llmModel} onValueChange={setLlmModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LLM_MODELS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mic className="h-3.5 w-3.5" /> STT Model
              </label>
              <Select value={sttModel} onValueChange={setSttModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STT_MODELS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5" /> TTS Model
              </label>
              <Select value={ttsModel} onValueChange={setTtsModel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TTS_MODELS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Agent Context & Knowledge Base */}
        <div className="border-b border-border/30 px-6 py-4">
          <h2 className="text-sm font-bold tracking-wide text-foreground mb-3">Agent Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Context */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold tracking-widest text-muted-foreground">AGENT CONTEXT</span>
                </div>
                {!contextEditing && agentContext && (
                  <button
                    onClick={() => setContextEditing(true)}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {contextEditing ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={agentContext}
                    onChange={(e) => setAgentContext(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    rows={4}
                    placeholder="Define the agent's persona, tone, rules, and behavior..."
                  />
                  <button
                    disabled={!agentContext.trim()}
                    onClick={() => setContextEditing(false)}
                    className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Lock Context
                  </button>
                </div>
              ) : (
                <textarea
                  value={agentContext}
                  disabled
                  rows={3}
                  className="mt-3 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground cursor-not-allowed resize-none"
                />
              )}
            </div>

            {/* Knowledge Base */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold tracking-widest text-muted-foreground">KNOWLEDGE BASE</span>
                </div>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {knowledgeBaseCount}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {knowledgeBaseCount} document{knowledgeBaseCount as number !== 1 ? "s" : ""} uploaded
              </p>
              <button
                onClick={() => window.open("/knowledge-base", "_blank")}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Manage Knowledge Base
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Deploy / Apply / Undeploy */}
        <div className="border-b border-border/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-foreground">
              {isDeployed ? (hasChanges ? "Unsaved Changes" : "Agent Live") : "Ready to Deploy?"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDeployed
                ? hasChanges
                  ? "Configuration has changed since last deploy"
                  : "Agent is currently deployed and running"
                : (() => {
                    const missing: string[] = [];
                    if (!agentName.trim()) missing.push("Agent Name");
                    if (!agentContext.trim()) missing.push("Agent Context");
                    if (Object.keys(flowState.cards).length === 0) missing.push("At least 1 card");
                    return missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All requirements met";
                  })()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDeployed && (
              <button
                onClick={handleUndeploy}
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
              >
                Undeploy
              </button>
            )}
            {isDeployed && hasChanges ? (
              <button
                disabled={!isValid}
                onClick={handleApplyChanges}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply Changes
              </button>
            ) : !isDeployed ? (
              <button
                disabled={!isValid}
                onClick={handleDeploy}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deploy Agent
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-2">
            <h2 className="text-sm font-bold tracking-wide text-foreground">Agent Flows</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Preview conversation logic as a graph, a full path, or step by step.</p>
          </div>
          <FlowTimeline
            flowState={flowState}
            onEditCard={(cardId) => {
              setEditingCardId(cardId);
              setOpen(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Index = () => (
  <SidebarProvider defaultOpen={false}>
    <InnerLayout />
  </SidebarProvider>
);

export default Index;
