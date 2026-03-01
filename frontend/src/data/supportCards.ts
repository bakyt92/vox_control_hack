export interface SupportCard {
  id: string;
  title: string;
  content: string;
  access_condition: string | null;
}

const SUPPORT_KEY = "support-cards";

const defaultSupportCards: Record<string, SupportCard> = {
  support1: {
    id: "support1",
    title: "Refund Policy",
    content: "Refunds are available within 30 days of purchase. Provide order ID and reason for refund.",
    access_condition: '(payment_status == "paid")',
  },
  support2: {
    id: "support2",
    title: "Account Recovery",
    content: "Guide the user through account recovery steps: verify identity, reset credentials, confirm access.",
    access_condition: null,
  },
  support3: {
    id: "support3",
    title: "Premium Features",
    content: "Explain premium tier benefits and upsell options available to the caller.",
    access_condition: '(user_role == "premium" or user_role == "admin")',
  },
};

function loadSupportCards(): Record<string, SupportCard> {
  try {
    const stored = localStorage.getItem(SUPPORT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...defaultSupportCards };
}

function saveSupportCards(cards: Record<string, SupportCard>) {
  localStorage.setItem(SUPPORT_KEY, JSON.stringify(cards));
}

export function initSupportCards(): Record<string, SupportCard> {
  return loadSupportCards();
}

export function addSupportCard(
  cards: Record<string, SupportCard>,
  card: Omit<SupportCard, "id">
): Record<string, SupportCard> {
  const id = `support${Date.now()}`;
  const updated = { ...cards, [id]: { ...card, id } };
  saveSupportCards(updated);
  return updated;
}

export function updateSupportCard(
  cards: Record<string, SupportCard>,
  card: SupportCard
): Record<string, SupportCard> {
  const updated = { ...cards, [card.id]: card };
  saveSupportCards(updated);
  return updated;
}

export function removeSupportCard(
  cards: Record<string, SupportCard>,
  cardId: string
): Record<string, SupportCard> {
  const updated = { ...cards };
  delete updated[cardId];
  saveSupportCards(updated);
  return updated;
}
