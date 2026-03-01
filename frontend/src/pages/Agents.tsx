import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Cpu, Mic, Volume2, Info, Layers, CircleDot, Loader2, PlusCircle, Play } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  agent_name: string;
  language: string;
  llm_model: string;
  stt_model: string;
  tts_model: string;
  agent_context: string;
  deploy_status: string;
  milestone_cards: any[];
  support_cards: any[];
}

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://4763-88-86-246-30.ngrok-free.app/agents", {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNewAgent = () => {
    navigate("/editor/new");
  };

  const handleSelect = (agent: Agent) => {
    navigate(`/editor/${agent.id}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">View and manage all deployed agents.</p>
        </div>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleNewAgent}
            className="rounded-full p-2 text-primary hover:bg-primary/10 transition-colors"
            title="Create new agent"
          >
            <PlusCircle className="h-7 w-7" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load agents: {error}
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">No agents found.</div>
        )}

        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleSelect(agent)}
              className="group rounded-lg border border-border bg-card p-4 cursor-pointer transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Name + tags */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">{agent.agent_name || "Unnamed Agent"}</span>

                    <Badge
                      variant={agent.deploy_status === "deployed" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      <CircleDot className="h-2.5 w-2.5 mr-1" />
                      {agent.deploy_status === "deployed" ? "Live" : "Offline"}
                    </Badge>
                  </div>

                  {/* Context - hover preview */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <HoverCard openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Info className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{agent.agent_context ? agent.agent_context.slice(0, 40) + (agent.agent_context.length > 40 ? "…" : "") : "No context"}</span>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent side="bottom" align="start" className="w-80">
                        <p className="text-xs font-semibold text-foreground mb-1">Agent Context</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {agent.agent_context || "No context defined."}
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  </div>

                  {/* Model tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                      <Cpu className="h-2.5 w-2.5" /> {agent.llm_model}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                      <Mic className="h-2.5 w-2.5" /> {agent.stt_model}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                      <Volume2 className="h-2.5 w-2.5" /> {agent.tts_model}
                    </Badge>
                  </div>
                </div>

                {/* Right: play + card count */}
                <div className="flex items-center gap-3 shrink-0">
                  {agent.deploy_status === "deployed" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/demo/${agent.id}`); }}
                      className="flex items-center gap-1 rounded-md bg-violet-600 hover:bg-violet-700 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors"
                      title="Live Demo"
                    >
                      <Play className="h-3 w-3" /> Demo
                    </button>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{agent.milestone_cards?.length || 0} cards</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Agents;
