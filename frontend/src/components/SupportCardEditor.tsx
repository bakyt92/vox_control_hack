import { useState } from "react";
import {
  SupportCard,
  addSupportCard,
  updateSupportCard,
  removeSupportCard,
} from "@/data/supportCards";

interface SupportCardEditorProps {
  supportCards: Record<string, SupportCard>;
  onCardsChange: (cards: Record<string, SupportCard>) => void;
}

const emptySupportCard = (): Omit<SupportCard, "id"> => ({
  title: "",
  content: "",
  access_condition: null,
});

const SupportCardEditor = ({ supportCards, onCardsChange }: SupportCardEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<SupportCard, "id">>(emptySupportCard());
  const [hasCondition, setHasCondition] = useState(false);

  const allCards = Object.values(supportCards);

  const startEditing = (card: SupportCard) => {
    setEditingId(card.id);
    setIsAdding(false);
    setForm({ title: card.title, content: card.content, access_condition: card.access_condition });
    setHasCondition(card.access_condition !== null);
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm(emptySupportCard());
    setHasCondition(false);
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(emptySupportCard());
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const cardData = { ...form, access_condition: hasCondition ? (form.access_condition || null) : null };
    if (isAdding) {
      onCardsChange(addSupportCard(supportCards, cardData));
    } else if (editingId) {
      onCardsChange(updateSupportCard(supportCards, { ...cardData, id: editingId }));
    }
    cancel();
  };

  const handleDelete = (id: string) => {
    onCardsChange(removeSupportCard(supportCards, id));
    cancel();
  };

  const isEditing = isAdding || editingId !== null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-primary">SUPPORT CARDS</h2>
        {!isEditing && (
          <button onClick={startAdding} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
            + Add
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground">
                {isAdding ? "NEW SUPPORT CARD" : "EDIT SUPPORT CARD"}
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
                placeholder="Support card title"
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-muted-foreground">CONTENT</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                rows={4}
                placeholder="Support card content..."
              />
            </div>

            {/* Access Condition */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground">ACCESS CONDITION</label>
                <button
                  onClick={() => setHasCondition(!hasCondition)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${hasCondition ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                >
                  {hasCondition ? "Enabled" : "None"}
                </button>
              </div>
              {hasCondition && (
                <input
                  value={form.access_condition || ""}
                  onChange={(e) => setForm({ ...form, access_condition: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                  placeholder='(user_role == "admin" and payment_status == "paid")'
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
                {isAdding ? "Add Card" : "Save Changes"}
              </button>
              {editingId && (
                <button onClick={() => handleDelete(editingId)} className="rounded-md bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30">
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {allCards.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">No support cards yet</p>
            )}
            {allCards.map((card) => (
              <button
                key={card.id}
                onClick={() => startEditing(card)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-secondary"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold text-accent">
                  S
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{card.title}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {card.access_condition ? `Condition: ${card.access_condition}` : "No condition"}
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCardEditor;
