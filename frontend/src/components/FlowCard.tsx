import { FlowCard as FlowCardType, ACTION_TYPES } from "@/data/flowData";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  extract_variables: "Extract Variables",
  validate_variables: "Validate Variables",
  api_call: "API Call",
  route_card: "Route Card",
  inform_user: "Inform User",
  expect_options: "Expect Options",
};

interface FlowCardProps {
  card: FlowCardType;
  stepNumber: number;
  side: "left" | "right";
  status: "complete" | "active";
  onEdit?: () => void;
}

const FlowCard = ({ card, stepNumber, side, status, onEdit }: FlowCardProps) => {
  const cardNum = card.id.replace(/\D/g, "").slice(-2).padStart(2, "0");

  return (
    <div
      onClick={onEdit}
      className={cn(
        "w-full max-w-md rounded-xl border bg-card p-5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4",
        status === "active"
          ? "border-primary/50 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]"
          : "border-border/50",
        onEdit && "cursor-pointer hover:border-primary/40"
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs font-bold tracking-widest text-primary">
          STEP {String(stepNumber).padStart(2, "0")}
        </span>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {ACTION_LABELS[card.action] || card.action}
        </span>
      </div>
      <h3 className="mb-2 text-xl font-bold text-foreground">{card.title}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{card.instruction}</p>

      <div className="space-y-1.5 text-xs">
        {card.completionCriteria && (
          <div>
            <span className="font-semibold text-primary">Done when: </span>
            <span className="text-muted-foreground">{card.completionCriteria}</span>
          </div>
        )}
        {card.variables.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {card.variables.map((v) => (
              <span key={v} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-foreground">{v}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowCard;
