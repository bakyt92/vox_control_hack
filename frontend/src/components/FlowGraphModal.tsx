import { useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlowCard as FlowCardType } from "@/data/flowData";

interface FlowGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Record<string, FlowCardType>;
}

interface NodePos {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_W = 160;
const NODE_H = 52;
const H_GAP = 40;
const V_GAP = 70;


function buildTree(cards: Record<string, FlowCardType>) {
  // Find root (not referenced by any next/choices)
  const referenced = new Set<string>();
  Object.values(cards).forEach((c) => {
    if (c.next) referenced.add(c.next);
    c.choices?.forEach((ch) => referenced.add(ch));
  });
  const rootId = Object.keys(cards).find((id) => !referenced.has(id)) || Object.keys(cards)[0];

  // BFS to assign levels
  const levels: string[][] = [];
  const visited = new Set<string>();
  let queue = [rootId];
  while (queue.length > 0) {
    levels.push([...queue]);
    queue.forEach((id) => visited.add(id));
    const next: string[] = [];
    for (const id of queue) {
      const card = cards[id];
      if (!card) continue;
      if (card.choices) {
        card.choices.forEach((ch) => { if (!visited.has(ch)) next.push(ch); });
      } else if (card.next && !visited.has(card.next)) {
        next.push(card.next);
      }
    }
    queue = [...new Set(next)];
  }

  return levels;
}

function layoutNodes(levels: string[][]): NodePos[] {
  const nodes: NodePos[] = [];
  const maxWidth = Math.max(...levels.map((l) => l.length));
  const totalW = maxWidth * NODE_W + (maxWidth - 1) * H_GAP;

  levels.forEach((level, row) => {
    const levelW = level.length * NODE_W + (level.length - 1) * H_GAP;
    const offsetX = (totalW - levelW) / 2;
    level.forEach((id, col) => {
      nodes.push({
        id,
        x: offsetX + col * (NODE_W + H_GAP),
        y: row * (NODE_H + V_GAP),
        width: NODE_W,
        height: NODE_H,
      });
    });
  });
  return nodes;
}

const FlowGraphModal = ({ open, onOpenChange, cards }: FlowGraphModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read CSS variables for theme consistency
    const style = getComputedStyle(document.documentElement);
    const cssVar = (name: string) => `hsl(${style.getPropertyValue(name).trim()})`;
    const cardBg = cssVar("--card");
    const cardFg = cssVar("--card-foreground");
    const mutedFg = cssVar("--muted-foreground");
    const primary = cssVar("--primary");
    const borderColor = cssVar("--border");

    const levels = buildTree(cards);
    const nodes = layoutNodes(levels);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Assign BFS order numbers
    const orderMap = new Map<string, number>();
    let order = 1;
    levels.forEach((level) => level.forEach((id) => orderMap.set(id, order++)));

    const pad = 40;
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const w = maxX + pad * 2;
    const h = maxY + pad * 2;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Draw edges
    Object.values(cards).forEach((card) => {
      const from = nodeMap.get(card.id);
      if (!from) return;
      const targets = card.choices || (card.next ? [card.next] : []);
      targets.forEach((tid) => {
        const to = nodeMap.get(tid);
        if (!to) return;
        const x1 = pad + from.x + from.width / 2;
        const y1 = pad + from.y + from.height;
        const x2 = pad + to.x + to.width / 2;
        const y2 = pad + to.y;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1, y1 + V_GAP * 0.4, x2, y2 - V_GAP * 0.4, x2, y2);
        ctx.strokeStyle = card.choices ? primary : borderColor;
        ctx.lineWidth = card.choices ? 2 : 1.5;
        ctx.stroke();

        // Arrow
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 5, y2 - 8);
        ctx.lineTo(x2 + 5, y2 - 8);
        ctx.closePath();
        ctx.fillStyle = card.choices ? primary : borderColor;
        ctx.fill();
      });
    });

    // Draw nodes
    nodes.forEach((node) => {
      const card = cards[node.id];
      if (!card) return;
      const x = pad + node.x;
      const y = pad + node.y;

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      // Rounded rect
      const r = 10;
      ctx.beginPath();
      ctx.roundRect(x, y, NODE_W, NODE_H, r);
      ctx.fillStyle = cardBg;
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Left accent
      ctx.beginPath();
      ctx.roundRect(x, y, 4, NODE_H, [r, 0, 0, r]);
      ctx.fillStyle = primary;
      ctx.fill();

      // Title
      ctx.fillStyle = cardFg;
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(card.title, x + 12, y + NODE_H / 2 - 8, NODE_W - 36);

      // Action label
      ctx.fillStyle = mutedFg;
      ctx.font = "9px system-ui, sans-serif";
      ctx.fillText(card.action.replace(/_/g, " "), x + 12, y + NODE_H / 2 + 10, NODE_W - 36);

      // Step number badge
      const num = orderMap.get(node.id);
      if (num !== undefined) {
        const bx = x + NODE_W - 16;
        const by = y + 16;
        const br = 10;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = primary;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = primary;
        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(num), bx, by);
        ctx.textAlign = "start";
      }
    });
  }, [cards]);

  useEffect(() => {
    if (open) {
      // Delay to ensure dialog is rendered
      const timer = setTimeout(draw, 50);
      return () => clearTimeout(timer);
    }
  }, [open, draw]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Flow Graph View</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex justify-center">
          <canvas ref={canvasRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlowGraphModal;
