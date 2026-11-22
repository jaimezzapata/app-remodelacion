export const DEFAULT_CATEGORIES = [
  "Pisos",
  "Baños",
  "Cocina",
  "Pintura",
  "Eléctricos",
  "Carpintería",
  "Mano de Obra",
  "Transporte",
  "Otros Materiales",
];

export const DEFAULT_PAYMENT_METHODS = [
  "TC",
  "Addi",
  "Sistecredito",
  "Transferencia",
  "Efectivo",
  "Nequi",
];

export function formatPaymentBadge(method: string, owner?: string): string {
  if (!method) return "";
  if (!owner || owner === "Propio") return `${method} · Propio`;
  return `${method} · ${owner}`;
}

export const ARCHITECTURAL_PALETTE = [
  "#141413", // Charcoal Ink
  "#B85D3B", // Terracotta
  "#2C4A52", // Blueprint Slate
  "#C28840", // Brass / Oak
  "#5A6B5C", // Architectural Sage
  "#7D7A72", // Warm Concrete
  "#8A3F2B", // Deep Brick
  "#3F5E66", // Steel Slate
];

export const KIND_COLORS: Record<string, string> = {
  Materiales: "#141413",
  "Mano de Obra": "#B85D3B",
  Transporte: "#2C4A52",
};

export function formatCOP(value: number): string {
  const rounded = Math.round(value || 0);
  return "$ " + rounded.toLocaleString("es-CO");
}

export function formatQty(qty: number | null, unit: string): string {
  if (qty === null || qty === undefined || Number.isNaN(qty)) return "—";
  const formatted = qty.toLocaleString("es-CO", {
    minimumFractionDigits: qty % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}
