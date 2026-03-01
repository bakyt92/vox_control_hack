export const ACTION_TYPES = [
  "extract_variables",
  "validate_variables",
  "api_call",
  "route_card",
  "inform_user",
  "expect_options",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface FlowCard {
  id: string;
  title: string;
  action: ActionType;
  instruction: string;
  completionCriteria: string;
  variables: string[];
  prereqCards: string[];
  prereqVariables: string[];
  next?: string;
  choices?: string[];
  question?: string;
  expectedOptions?: string[];
  optionRoutes?: { option: string; next: string }[]; // maps each expected option to a next card
}

const CARDS_KEY = "flow-cards";

const defaultCards: Record<string, FlowCard> = {
  card1: {
    id: "card1", title: "Greeting", action: "inform_user",
    instruction: "Welcome the caller with a greeting", completionCriteria: "User acknowledges the greeting or returns it",
    variables: [], prereqCards: [], prereqVariables: [],
    next: "card2",
  },
  card2: {
    id: "card2", title: "Identify", action: "extract_variables",
    instruction: "Collect account ID and caller name from the user", completionCriteria: "All variables collected and validated",
    variables: ["account_id", "caller_name"], prereqCards: ["card1"], prereqVariables: [],
    next: "card3",
  },
  card3: {
    id: "card3", title: "Process", action: "route_card",
    instruction: "Route to appropriate department", completionCriteria: "Department selected",
    variables: [], prereqCards: ["card2"], prereqVariables: ["account_id"],
    choices: ["card4", "card5", "card6"],
  },
  card4: {
    id: "card4", title: "Billing Inquiry", action: "api_call",
    instruction: "Retrieve billing details from API", completionCriteria: "Billing info delivered",
    variables: ["billing_amount", "due_date"], prereqCards: ["card3"], prereqVariables: ["account_id"],
    next: "card7",
  },
  card5: {
    id: "card5", title: "Technical Support", action: "api_call",
    instruction: "Run diagnostics on account", completionCriteria: "Issue diagnosed",
    variables: ["issue_type", "severity"], prereqCards: ["card3"], prereqVariables: ["account_id"],
    next: "card10",
  },
  card6: {
    id: "card6", title: "Account Changes", action: "extract_variables",
    instruction: "Collect desired account modifications", completionCriteria: "Changes captured",
    variables: ["change_type"], prereqCards: ["card3"], prereqVariables: ["account_id"],
    next: "card11",
  },
  card7: {
    id: "card7", title: "Payment Options", action: "inform_user",
    instruction: "Present payment methods", completionCriteria: "Payment method selected",
    variables: ["payment_method"], prereqCards: ["card4"], prereqVariables: ["billing_amount"],
    choices: ["card8", "card9"],
  },
  card8: {
    id: "card8", title: "Auto-Pay Setup", action: "api_call",
    instruction: "Configure recurring payment", completionCriteria: "Auto-pay enabled",
    variables: ["autopay_status"], prereqCards: ["card7"], prereqVariables: ["payment_method"],
    next: "card12",
  },
  card9: {
    id: "card9", title: "One-Time Payment", action: "api_call",
    instruction: "Process single payment", completionCriteria: "Payment confirmed",
    variables: ["payment_confirmation"], prereqCards: ["card7"], prereqVariables: ["payment_method"],
    next: "card12",
  },
  card10: {
    id: "card10", title: "Escalate", action: "inform_user",
    instruction: "Transfer to specialist", completionCriteria: "Specialist assigned",
    variables: ["specialist_id"], prereqCards: ["card5"], prereqVariables: ["issue_type"],
    next: "card12",
  },
  card11: {
    id: "card11", title: "Confirm Changes", action: "expect_options",
    instruction: "Review & confirm modifications", completionCriteria: "Confirmation sent",
    variables: ["confirmation_status"], prereqCards: ["card6"], prereqVariables: ["change_type"],
    next: "card12",
  },
  card12: {
    id: "card12", title: "Wrap-Up", action: "inform_user",
    instruction: "Summarize & close interaction", completionCriteria: "Call ended",
    variables: [], prereqCards: [], prereqVariables: [],
  },
};

function loadCards(): Record<string, FlowCard> {
  try {
    const stored = localStorage.getItem(CARDS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultCards };
}

function saveCards(cards: Record<string, FlowCard>) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

/** Find the start card (no other card points to it as next or in choices or optionRoutes) */
function findStartCard(cards: Record<string, FlowCard>): string {
  const referenced = new Set<string>();
  Object.values(cards).forEach((c) => {
    if (c.next) referenced.add(c.next);
    c.choices?.forEach((ch) => referenced.add(ch));
    if (c.optionRoutes) c.optionRoutes.forEach((r) => referenced.add(r.next));
  });
  const start = Object.keys(cards).find((id) => !referenced.has(id));
  return start || Object.keys(cards)[0];
}

/** Compute all possible complete flow paths */
function computeAllPaths(cards: Record<string, FlowCard>, startId: string): string[][] {
  const paths: string[][] = [];
  function walk(id: string, path: string[], visited: Set<string>) {
    const card = cards[id];
    if (!card || visited.has(id)) return;
    const current = [...path, id];
    const newVisited = new Set(visited).add(id);

    // For expect_options cards, branch via optionRoutes
    if (card.action === "expect_options" && card.optionRoutes && card.optionRoutes.length > 0) {
      const targets = [...new Set(card.optionRoutes.map((r) => r.next))];
      for (const t of targets) walk(t, current, newVisited);
      return;
    }

    if (!card.next && !card.choices) {
      paths.push(current);
      return;
    }
    if (card.choices) {
      for (const c of card.choices) walk(c, current, newVisited);
    } else if (card.next) {
      walk(card.next, current, newVisited);
    }
  }
  walk(startId, [], new Set());
  return paths;
}

export interface PresetFlow {
  id: string;
  defaultName: string;
  cardIds: string[];
}

export function generateFlows(cards: Record<string, FlowCard>): { startCardId: string; presetFlows: PresetFlow[] } {
  const startCardId = findStartCard(cards);
  const allPaths = computeAllPaths(cards, startCardId);
  const presetFlows: PresetFlow[] = allPaths.map((cardIds, i) => {
    const choiceCards = cardIds.filter((id) => {
      const idx = cardIds.indexOf(id);
      if (idx === 0) return false;
      const prev = cards[cardIds[idx - 1]];
      return prev?.choices?.includes(id);
    });
    const choiceNames = choiceCards.map((id) => cards[id].title);
    const defaultName = choiceNames.length > 0
      ? `Flow ${i + 1}: ${choiceNames.join(" → ")}`
      : `Flow ${i + 1}`;
    return { id: `flow-${i}`, defaultName, cardIds };
  });
  return { startCardId, presetFlows };
}

export type FlowState = {
  cards: Record<string, FlowCard>;
  startCardId: string;
  presetFlows: PresetFlow[];
};

export function initFlowState(): FlowState {
  const cards = loadCards();
  const { startCardId, presetFlows } = generateFlows(cards);
  return { cards, startCardId, presetFlows };
}

export function addCard(
  state: FlowState,
  card: Omit<FlowCard, "id">,
  prevCardId?: string
): FlowState {
  const existingNums = Object.keys(state.cards)
    .map((k) => parseInt(k.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const id = `card${nextNum}`;
  const newCard: FlowCard = { ...card, id };
  const newCards = { ...state.cards, [id]: newCard };

  // Link prev card to new card
  if (prevCardId && newCards[prevCardId]) {
    const prev = { ...newCards[prevCardId] };
    // If prev had choices and new card's next is one of them, insert before
    if (!prev.choices) {
      // If prev had a next, new card takes it
      if (prev.next && !newCard.next) {
        newCard.next = prev.next;
        newCards[id] = newCard;
      }
      prev.next = id;
    }
    newCards[prevCardId] = prev;
  }

  saveCards(newCards);
  const { startCardId, presetFlows } = generateFlows(newCards);
  return { cards: newCards, startCardId, presetFlows };
}

export function updateCard(state: FlowState, card: FlowCard): FlowState {
  const newCards = { ...state.cards, [card.id]: card };
  saveCards(newCards);
  const { startCardId, presetFlows } = generateFlows(newCards);
  return { cards: newCards, startCardId, presetFlows };
}

export function removeCard(state: FlowState, cardId: string): FlowState {
  const newCards = { ...state.cards };
  const removing = newCards[cardId];
  delete newCards[cardId];

  // Relink: any card pointing to removed card via next → point to removed card's next
  Object.values(newCards).forEach((c) => {
    if (c.next === cardId) {
      c.next = removing?.next;
    }
    if (c.choices) {
      c.choices = c.choices.filter((ch) => ch !== cardId);
      if (c.choices.length === 0) {
        c.choices = undefined;
        c.next = removing?.next;
      }
    }
  });

  saveCards(newCards);
  const { startCardId, presetFlows } = generateFlows(newCards);
  return { cards: newCards, startCardId, presetFlows };
}

export function resetToDefaults(): FlowState {
  const cards = { ...defaultCards };
  saveCards(cards);
  const { startCardId, presetFlows } = generateFlows(cards);
  return { cards, startCardId, presetFlows };
}
