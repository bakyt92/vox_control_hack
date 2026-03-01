import { useState } from "react";
import { FlowCard, FlowState, ActionType, ACTION_TYPES, addCard, updateCard, removeCard } from "@/data/flowData";
import { SupportCard, initSupportCards } from "@/data/supportCards";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SupportCardEditor from "@/components/SupportCardEditor";
import { cn } from "@/lib/utils";

interface CardEditorPanelProps {
  flowState: FlowState;
  onStateChange: (state: FlowState) => void;
  editingCardId: string | null;
  onEditCard: (cardId: string | null) => void;
  onClose?: () => void;
}

const ACTION_LABELS: Record<ActionType, string> = {
  extract_variables: "Extract Variables",
  validate_variables: "Validate Variables",
  api_call: "API Call",
  route_card: "Route Card",
  inform_user: "Inform User",
  expect_options: "Expect Options",
};

const emptyCard = (): Omit<FlowCard, "id"> => ({
  title: "",
  action: "inform_user",
  instruction: "",
  completionCriteria: "",
  variables: [],
  prereqCards: [],
  prereqVariables: [],
  question: "",
  expectedOptions: [],
  optionRoutes: [],
});

const CardEditorPanel = ({ flowState, onStateChange, editingCardId, onEditCard, onClose }: CardEditorPanelProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<FlowCard, "id">>(emptyCard());
  const [prevCardId, setPrevCardId] = useState("");
  const [variableInput, setVariableInput] = useState("");
  const [prereqVarInput, setPrereqVarInput] = useState("");
  const [expectedOptionInput, setExpectedOptionInput] = useState("");
  const [supportCards, setSupportCards] = useState<Record<string, SupportCard>>(initSupportCards);

  const allCards = Object.values(flowState.cards);
  const allVariables = [...new Set(allCards.flatMap((c) => c.variables))];

  const startEditing = (card: FlowCard) => {
    onEditCard(card.id);
    setForm({ ...card });
    setIsAdding(false);
  };

  const startAdding = () => {
    setIsAdding(true);
    onEditCard(null);
    setForm(emptyCard());
    setPrevCardId("");
  };

  const cancel = () => {
    setIsAdding(false);
    onEditCard(null);
    setForm(emptyCard());
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (form.action === "expect_options" && (!form.question?.trim() || !form.question.trim().endsWith("?"))) return;
    if (isAdding) {
      const newState = addCard(flowState, form, prevCardId || undefined);
      onStateChange(newState);
    } else if (editingCardId) {
      const newState = updateCard(flowState, { ...form, id: editingCardId } as FlowCard);
      onStateChange(newState);
    }
    cancel();
  };

  const handleDelete = (cardId: string) => {
    const newState = removeCard(flowState, cardId);
    onStateChange(newState);
    cancel();
  };

  const addVariable = () => {
    if (!variableInput.trim()) return;
    setForm({ ...form, variables: [...form.variables, variableInput.trim()] });
    setVariableInput("");
  };

  const removeVariable = (v: string) => {
    setForm({ ...form, variables: form.variables.filter((x) => x !== v) });
  };

  const addPrereqVar = () => {
    if (!prereqVarInput.trim()) return;
    setForm({ ...form, prereqVariables: [...form.prereqVariables, prereqVarInput.trim()] });
    setPrereqVarInput("");
  };

  const removePrereqVar = (v: string) => {
    setForm({ ...form, prereqVariables: form.prereqVariables.filter((x) => x !== v) });
  };

  const togglePrereqCard = (cardId: string) => {
    const has = form.prereqCards.includes(cardId);
    setForm({
      ...form,
      prereqCards: has ? form.prereqCards.filter((c) => c !== cardId) : [...form.prereqCards, cardId],
    });
  };

  const isEditing = isAdding || editingCardId !== null;

  const milestoneContent = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-primary">MILESTONE CARDS</h2>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button onClick={startAdding} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground">
                {isAdding ? "NEW CARD" : "EDIT CARD"}
              </span>
              <button onClick={cancel} className="text-xs text-muted-foreground hover:text-foreground">✕ Cancel</button>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">TITLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                placeholder="Card title"
              />
            </div>

            {/* Action */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">ACTION</label>
              <select
                value={form.action}
                onChange={(e) => {
                  const newAction = e.target.value as ActionType;
                  setForm({
                    ...form,
                    action: newAction,
                    completionCriteria: newAction === "expect_options" ? "User response matches one expected option." : form.completionCriteria,
                  });
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>

            {/* Instruction */}
            {form.action !== "expect_options" && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">INSTRUCTION</label>
                <textarea
                  value={form.instruction}
                  onChange={(e) => setForm({ ...form, instruction: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  rows={2}
                  placeholder="What should happen at this step"
                />
              </div>
            )}

            {/* Question & Expected Options (expect_options only) */}
            {form.action === "expect_options" && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">QUESTION</label>
                  <input
                    value={form.question || ""}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. Would you like to proceed?"
                  />
                  {form.question && !form.question.trim().endsWith("?") && (
                    <p className="mt-1 text-[10px] text-destructive">Question must end with ?</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">EXPECTED OPTIONS</label>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {(form.expectedOptions || []).map((opt) => (
                      <span key={opt} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                        {opt}
                        <button onClick={() => setForm({ ...form, expectedOptions: (form.expectedOptions || []).filter((x) => x !== opt) })} className="text-muted-foreground hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={expectedOptionInput}
                      onChange={(e) => setExpectedOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && expectedOptionInput.trim()) {
                          e.preventDefault();
                          setForm({ ...form, expectedOptions: [...(form.expectedOptions || []), expectedOptionInput.trim()] });
                          setExpectedOptionInput("");
                        }
                      }}
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      placeholder="e.g. Yes, No, Maybe"
                    />
                    <button
                      onClick={() => {
                        if (!expectedOptionInput.trim()) return;
                        setForm({ ...form, expectedOptions: [...(form.expectedOptions || []), expectedOptionInput.trim()] });
                        setExpectedOptionInput("");
                      }}
                      className="rounded-md bg-secondary px-2 py-1.5 text-xs text-primary hover:bg-secondary/80"
                    >Add</button>
                  </div>
                </div>
              </>
            )}

            {/* Completion Criteria */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">COMPLETION CRITERIA</label>
              <input
                value={form.action === "expect_options" ? "User response matches one expected option." : form.completionCriteria}
                onChange={(e) => setForm({ ...form, completionCriteria: e.target.value })}
                disabled={form.action === "expect_options"}
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none",
                  form.action === "expect_options" && "cursor-not-allowed opacity-60"
                )}
                placeholder="When is this step done?"
              />
            </div>

            {/* Variables */}
            {form.action !== "expect_options" && (
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">VARIABLES (fill/validate)</label>
              <div className="mb-2 flex flex-wrap gap-1">
                {form.variables.map((v) => (
                  <span key={v} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                    {v}
                    <button onClick={() => removeVariable(v)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={variableInput}
                  onChange={(e) => setVariableInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariable())}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  placeholder="variable_name"
                />
                <button onClick={addVariable} className="rounded-md bg-secondary px-2 py-1.5 text-xs text-primary hover:bg-secondary/80">Add</button>
              </div>
            </div>
            )}

            {/* Prereq Cards */}
            {form.action !== "expect_options" && (
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">PREREQUISITE CARDS</label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                {allCards.filter((c) => c.id !== editingCardId).map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={form.prereqCards.includes(c.id)}
                      onChange={() => togglePrereqCard(c.id)}
                      className="accent-primary"
                    />
                    <span className="text-foreground">{c.title}</span>
                    <span className="text-muted-foreground">({c.id})</span>
                  </label>
                ))}
              </div>
            </div>
            )}

            {/* Prereq Variables */}
            {form.action !== "expect_options" && (
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">PREREQUISITE VARIABLES</label>
              <div className="mb-2 flex flex-wrap gap-1">
                {form.prereqVariables.map((v) => (
                  <span key={v} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                    {v}
                    <button onClick={() => removePrereqVar(v)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={prereqVarInput}
                  onChange={(e) => setPrereqVarInput(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Select variable...</option>
                  {allVariables.filter((v) => !form.prereqVariables.includes(v)).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <button onClick={addPrereqVar} className="rounded-md bg-secondary px-2 py-1.5 text-xs text-primary hover:bg-secondary/80">Add</button>
              </div>
            </div>
            )}

            {/* Prev Card (only for adding) */}
            {isAdding && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">INSERT AFTER CARD</label>
                <select
                  value={prevCardId}
                  onChange={(e) => setPrevCardId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Start (no previous)</option>
                  {allCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Next / Choices */}
            {(editingCardId || isAdding) && form.action !== "route_card" && form.action !== "expect_options" && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">NEXT CARD</label>
                <select
                  value={form.next || ""}
                  onChange={(e) => setForm({ ...form, next: e.target.value || undefined, choices: e.target.value ? undefined : form.choices })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">None (end or choices)</option>
                  {allCards.filter((c) => c.id !== editingCardId).map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                  ))}
                </select>
              </div>
            )}

            {(editingCardId || isAdding) && (form.action === "route_card" || (!form.next && form.action !== "expect_options")) && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">
                  {form.action === "route_card" ? "NEXT CARDS (routing)" : "CHOICES (branching)"}
                </label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                  {allCards.filter((c) => c.id !== editingCardId).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-secondary">
                      <input
                        type="checkbox"
                        checked={form.choices?.includes(c.id) || false}
                        onChange={() => {
                          const current = form.choices || [];
                          const has = current.includes(c.id);
                          setForm({
                            ...form,
                            choices: has ? current.filter((x) => x !== c.id) : [...current, c.id],
                          });
                        }}
                        className="accent-primary"
                      />
                      <span className="text-foreground">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Option Routes (expect_options only) */}
            {(editingCardId || isAdding) && form.action === "expect_options" && (form.expectedOptions || []).length > 0 && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">OPTION → NEXT CARD</label>
                <div className="space-y-2">
                  {(form.expectedOptions || []).map((opt) => {
                    const route = (form.optionRoutes || []).find((r) => r.option === opt);
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="min-w-[80px] rounded-md bg-secondary px-2 py-1.5 text-xs font-medium text-foreground">{opt}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <select
                          value={route?.next || ""}
                          onChange={(e) => {
                            const routes = (form.optionRoutes || []).filter((r) => r.option !== opt);
                            if (e.target.value) {
                              routes.push({ option: opt, next: e.target.value });
                            }
                            const choices = [...new Set(routes.map((r) => r.next))];
                            setForm({ ...form, optionRoutes: routes, choices, next: undefined });
                          }}
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">None (end)</option>
                          {allCards.filter((c) => c.id !== editingCardId).map((c) => (
                            <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
                {isAdding ? "Add Card" : "Save Changes"}
              </button>
              {editingCardId && (
                <button onClick={() => handleDelete(editingCardId)} className="rounded-md bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30">
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {allCards.map((card) => (
              <button
                key={card.id}
                onClick={() => startEditing(card)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-secondary"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                  {card.id.replace("card", "")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{card.title}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{ACTION_LABELS[card.action]}</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

   return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-primary">CARDS</h2>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="Close panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <Tabs defaultValue="milestones" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 shrink-0">
          <TabsTrigger value="milestones" className="flex-1 text-xs">Milestone</TabsTrigger>
          <TabsTrigger value="support" className="flex-1 text-xs">Support</TabsTrigger>
        </TabsList>
        <TabsContent value="milestones" className="flex-1 overflow-hidden">
          {milestoneContent}
        </TabsContent>
        <TabsContent value="support" className="flex-1 overflow-hidden">
          <SupportCardEditor supportCards={supportCards} onCardsChange={setSupportCards} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CardEditorPanel;
