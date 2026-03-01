import { FlowCard } from "@/data/flowData";
import { cn } from "@/lib/utils";

interface ChoiceStepProps {
  choices: FlowCard[];
  onSelect: (cardId: string) => void;
}

const ChoiceStep = ({ choices, onSelect }: ChoiceStepProps) => {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="mb-2 text-sm font-semibold tracking-widest text-primary">
        CHOOSE NEXT PATH
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {choices.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            className="group rounded-xl border border-border/50 bg-card px-5 py-4 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
          >
            <span className="text-xs font-bold tracking-widest text-primary">
              {card.title.toUpperCase()}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">{card.instruction}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChoiceStep;
