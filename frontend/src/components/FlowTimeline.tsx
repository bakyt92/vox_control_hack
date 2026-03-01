import { useState, useRef, useEffect } from "react";
import { FlowState, initFlowState, PresetFlow } from "@/data/flowData";
import FlowCard from "./FlowCard";
import ChoiceStep from "./ChoiceStep";
import { cn } from "@/lib/utils";
import { ChevronDown, Code, Copy, Check, GitBranch, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import FlowGraphModal from "./FlowGraphModal";

type Step =
  | { type: "card"; cardId: string }
  | { type: "choice"; choiceIds: string[] };

const NAMES_KEY = "flow-custom-names";

function getCustomNames(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}"); } catch { return {}; }
}

function rebuildSteps(cardIds: string[], cards: Record<string, any>): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < cardIds.length; i++) {
    const id = cardIds[i];
    if (i > 0) {
      const prev = cards[cardIds[i - 1]];
      if (prev?.choices && prev.choices.includes(id)) {
        steps.push({ type: "choice", choiceIds: prev.choices });
      }
    }
    steps.push({ type: "card", cardId: id });
  }
  return steps;
}

interface FlowTimelineProps {
  flowState: FlowState;
  onEditCard: (cardId: string) => void;
}

const FlowTimeline = ({ flowState, onEditCard }: FlowTimelineProps) => {
  const cards = flowState?.cards ?? {};
  const startCardId = flowState?.startCardId ?? "";
  const presetFlows = flowState?.presetFlows ?? [];

  const [steps, setSteps] = useState<Step[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [customNames, setCustomNames] = useState<Record<string, string>>(getCustomNames);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [completionRenameValue, setCompletionRenameValue] = useState("");
  const [isRenamingCompletion, setIsRenamingCompletion] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;

  // Re-sync if flows regenerated
  useEffect(() => {
    if (activeFlowId) {
      const flow = presetFlows.find((f) => f.id === activeFlowId);
      if (flow) {
        setSteps(rebuildSteps(flow.cardIds, cards));
      } else {
        // Flow no longer exists after regeneration, pick first
        if (presetFlows.length > 0) {
          setActiveFlowId(presetFlows[0].id);
          setSteps(rebuildSteps(presetFlows[0].cardIds, cards));
        } else {
          setSteps([]);
          setActiveFlowId(null);
        }
      }
    }
  }, [presetFlows]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-advance in manual mode
  useEffect(() => {
    if (!isManualMode || !lastStep || lastStep.type !== "card") return;
    const card = cards[lastStep.cardId];
    if (!card) return;
    if (card.choices && card.choices.length > 0) {
      const timer = setTimeout(() => {
        setSteps((s) => [...s, { type: "choice", choiceIds: card.choices! }]);
      }, 600);
      return () => clearTimeout(timer);
    }
    if (card.next) {
      const timer = setTimeout(() => {
        setSteps((s) => [...s, { type: "card", cardId: card.next! }]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [steps.length, isManualMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  const isComplete = lastStep?.type === "card" && !cards[lastStep.cardId]?.next && !cards[lastStep.cardId]?.choices;

  // Find matching flow for explored steps
  const exploredCardIds = steps.filter((s) => s.type === "card").map((s) => (s as { type: "card"; cardId: string }).cardId);
  const matchedFlow = isComplete && isManualMode
    ? presetFlows.find((f) => f.cardIds.length === exploredCardIds.length && f.cardIds.every((id, i) => id === exploredCardIds[i]))
    : null;
  const matchedFlowName = matchedFlow ? (customNames[matchedFlow.id] || matchedFlow.defaultName) : null;

  const handleCompletionRename = () => {
    if (!matchedFlow || !completionRenameValue.trim()) return;
    const updated = { ...customNames, [matchedFlow.id]: completionRenameValue.trim() };
    setCustomNames(updated);
    localStorage.setItem(NAMES_KEY, JSON.stringify(updated));
    setIsRenamingCompletion(false);
    setCompletionRenameValue("");
  };

  const handleChoice = (cardId: string) => {
    setSteps((s) => [...s, { type: "card", cardId }]);
  };

  const handleLoadFlow = (flow: PresetFlow) => {
    setSteps(rebuildSteps(flow.cardIds, cards));
    setActiveFlowId(flow.id);
    setIsManualMode(false);
    setDropdownOpen(false);
  };

  const handleStartManual = () => {
    setSteps([{ type: "card", cardId: startCardId }]);
    setActiveFlowId(null);
    setIsManualMode(true);
    setDropdownOpen(false);
  };

  const handleDeselect = () => {
    setSteps([]);
    setActiveFlowId(null);
    setIsManualMode(false);
  };

  const handleRename = (flowId: string) => {
    if (!renameValue.trim()) return;
    const updated = { ...customNames, [flowId]: renameValue.trim() };
    setCustomNames(updated);
    localStorage.setItem(NAMES_KEY, JSON.stringify(updated));
    setRenamingId(null);
    setRenameValue("");
  };

  const getFlowName = (flow: PresetFlow) => customNames[flow.id] || flow.defaultName;
  const activeFlow = presetFlows.find((f) => f.id === activeFlowId);

  let cardStepIndex = 0;

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-12">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            {activeFlow ? getFlowName(activeFlow) : isManualMode ? "Manual Selection" : "Select a Flow"}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-1/2 top-full z-50 mt-2 min-w-[320px] -translate-x-1/2 rounded-xl border border-border/50 bg-card p-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="px-3 py-2 text-[10px] font-bold tracking-widest text-muted-foreground">
                ALL FLOW PATHS ({presetFlows.length})
              </p>
              {presetFlows.map((flow) => (
                <div
                  key={flow.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2.5 transition-all hover:bg-secondary",
                    activeFlowId === flow.id && "bg-secondary"
                  )}
                >
                  {renamingId === flow.id ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRename(flow.id); }}
                      className="flex flex-1 items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                        onKeyDown={(e) => e.key === "Escape" && setRenamingId(null)}
                      />
                      <button type="submit" className="text-xs font-semibold text-primary">Save</button>
                    </form>
                  ) : (
                    <>
                      <button onClick={() => handleLoadFlow(flow)} className="flex-1 text-left">
                        <span className="text-sm font-medium text-foreground">{getFlowName(flow)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{flow.cardIds.length} steps</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(flow.id); setRenameValue(getFlowName(flow)); }}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:text-primary group-hover:opacity-100"
                        title="Rename"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
              <div className="mt-1 border-t border-border/30 pt-1">
                <button
                  onClick={handleStartManual}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-primary transition-all hover:bg-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                  Explore step-by-step
                </button>
              </div>
            </div>
          )}
        </div>

        {(activeFlowId || isManualMode) && (
          <button
            onClick={handleDeselect}
            className="flex items-center justify-center rounded-lg border border-border/50 bg-card p-2.5 text-muted-foreground transition-all hover:text-foreground hover:border-destructive/40"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => setGraphOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:border-primary/40"
          title="Graph View"
        >
          <GitBranch className="h-4 w-4 text-primary" />
        </button>
      </div>

      <FlowGraphModal open={graphOpen} onOpenChange={setGraphOpen} cards={cards} />

      {/* JSON Viewer */}
      {steps.length > 0 && (
        <div className="mb-6 mx-auto max-w-2xl">
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:border-primary/40 w-full justify-between group">
              <div className="flex items-center gap-2">
                <Code className="h-3.5 w-3.5 text-primary" />
                <span>Flow JSON</span>
                <span className="text-[10px] text-muted-foreground/70">
                  ({steps.filter(s => s.type === "card").length} cards)
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative mt-2">
                <button
                  onClick={() => {
                    const json = JSON.stringify(
                      steps.filter((s) => s.type === "card").map((s) => cards[(s as { type: "card"; cardId: string }).cardId]).filter(Boolean),
                      null, 2
                    );
                    navigator.clipboard.writeText(json);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
                  title="Copy JSON"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <pre className="max-h-96 overflow-auto rounded-lg border border-border/50 bg-card p-4 pr-10 text-xs text-foreground font-mono">
                  {JSON.stringify(
                    steps
                      .filter((s) => s.type === "card")
                      .map((s) => cards[(s as { type: "card"; cardId: string }).cardId])
                      .filter(Boolean),
                    null,
                    2
                  )}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Empty state */}
      {steps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
          <div className="mb-4 rounded-full border border-border/50 bg-card p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
          </div>
          {Object.keys(cards).length === 0 ? (
            <>
              <p className="text-lg font-semibold text-foreground">No cards yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Click "Build Flow" to add your first card</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">Select a flow from the dropdown</p>
              <p className="mt-1 text-sm text-muted-foreground">Or explore one step-by-step</p>
            </>
          )}
        </div>
      )}

      {steps.length > 0 && (
        <>
          <div className="absolute left-1/2 top-32 bottom-12 w-px -translate-x-1/2 bg-border/40" />
          <div className="flex flex-col items-center gap-0">
            {steps.map((step, i) => {
              if (step.type === "card") {
                const card = cards[step.cardId];
                if (!card) return null;
                const side: "left" | "right" = cardStepIndex % 2 === 0 ? "left" : "right";
                const isLast = i === steps.length - 1 || (i === steps.length - 2 && steps[steps.length - 1].type === "choice");
                const status = isLast && !isComplete ? "active" : "complete";
                cardStepIndex++;

                return (
                  <div key={i} className="relative flex w-full items-center">
                    <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                      <div className={cn(
                        "h-3.5 w-3.5 rounded-full border-2 transition-all",
                        status === "active"
                          ? "border-primary bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                          : "border-primary/50 bg-primary/30"
                      )} />
                    </div>
                    <div className={cn(
                      "flex w-1/2",
                      side === "left" ? "justify-end pr-10" : "ml-auto justify-start pl-10"
                    )}>
                      <FlowCard
                        card={card}
                        stepNumber={cardStepIndex}
                        side={side}
                        status={isComplete && i === steps.length - 1 ? "complete" : status}
                        onEdit={() => onEditCard(step.cardId)}
                      />
                    </div>
                  </div>
                );
              }

              // Choice
              if (!isManualMode) {
                const nextCardStep = steps[i + 1];
                const chosenId = nextCardStep?.type === "card" ? nextCardStep.cardId : null;
                return (
                  <div key={i} className="relative flex w-full justify-center py-4">
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2">
                      <span className="text-xs text-muted-foreground">Chose:</span>
                      <span className="text-xs font-semibold text-primary">{chosenId ? cards[chosenId]?.title : "—"}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="relative flex w-full justify-center py-6">
                  <ChoiceStep
                    choices={step.choiceIds.map((id) => cards[id]).filter(Boolean)}
                    onSelect={handleChoice}
                  />
                </div>
              );
            })}
          </div>

          {/* Completion banner */}
          {isComplete && isManualMode && (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                <span className="text-sm font-semibold text-foreground">Flow Complete!</span>
              </div>
              {matchedFlowName ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">This matches the flow:</span>
                  {isRenamingCompletion ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleCompletionRename(); }} className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={completionRenameValue}
                        onChange={(e) => setCompletionRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setIsRenamingCompletion(false)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                      <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/80">Save</button>
                      <button type="button" onClick={() => setIsRenamingCompletion(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{matchedFlowName}</span>
                      <button
                        onClick={() => { setIsRenamingCompletion(true); setCompletionRenameValue(matchedFlowName); }}
                        className="rounded p-1 text-muted-foreground hover:text-primary"
                        title="Rename this flow"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No matching preset flow found</span>
              )}
            </div>
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default FlowTimeline;
