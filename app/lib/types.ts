export type ExpenseKind = "Materiales" | "Mano de Obra" | "Transporte";

export type ExpenseStatus = "pagado" | "pendiente";

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  kind: ExpenseKind;
  quantity: number | null;
  unit: string;
  amount: number;
  paymentMethod: string;
  status: ExpenseStatus;
  date: string;
  note?: string;
}

export interface ProjectConfig {
  name: string;
  budget: number | null;
}

export type ActiveTab = "resumen" | "gastos" | "analisis";
