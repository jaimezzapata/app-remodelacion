"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ActiveTab, ExpenseItem, ProjectConfig } from "../lib/types";
import {
  ARCHITECTURAL_PALETTE,
  KIND_COLORS,
  formatCOP,
  formatQty,
} from "../lib/initial-data";
import { DonutChart } from "./DonutChart";
import { ExpenseModal } from "./ExpenseModal";
import { OnboardingScreen } from "./OnboardingScreen";
import { ProjectSettingsModal } from "./ProjectSettingsModal";
import {
  exportBackupJSON,
  exportToExcel,
  exportToPDF,
} from "../lib/export-utils";
import {
  IconChevronRight,
  IconList,
  IconOverview,
  IconPie,
  IconPlus,
  IconSearch,
  IconSliders,
} from "./Icons";

const STORAGE_EXPENSES_KEY = "tierralta318_expenses_v1";
const STORAGE_PROJECT_KEY = "tierralta318_project_v1";
const STORAGE_ONBOARDED_KEY = "tierralta318_onboarded_v1";
const STORAGE_EVENT = "tierralta318-storage";

function subscribeStorage(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getOnboardedSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_ONBOARDED_KEY) ?? "";
  } catch {
    return "";
  }
}

function getOnboardedServerSnapshot(): string {
  return "pending";
}

function getExpensesSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_EXPENSES_KEY) ?? "";
  } catch {
    return "";
  }
}

function getProjectSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_PROJECT_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

export function RenovationApp() {
  const onboardedState = useSyncExternalStore(
    subscribeStorage,
    getOnboardedSnapshot,
    getOnboardedServerSnapshot
  );
  const expensesRaw = useSyncExternalStore(
    subscribeStorage,
    getExpensesSnapshot,
    getServerSnapshot
  );
  const projectRaw = useSyncExternalStore(
    subscribeStorage,
    getProjectSnapshot,
    getServerSnapshot
  );

  const expenses: ExpenseItem[] = useMemo(() => {
    if (!expensesRaw) return [];
    try {
      const parsed = JSON.parse(expensesRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [expensesRaw]);

  const project: ProjectConfig = useMemo(() => {
    if (!projectRaw) return { name: "MI REMODELACIÓN", budget: null };
    try {
      const parsed = JSON.parse(projectRaw);
      return parsed && typeof parsed.name === "string"
        ? parsed
        : { name: "MI REMODELACIÓN", budget: null };
    } catch {
      return { name: "MI REMODELACIÓN", budget: null };
    }
  }, [projectRaw]);

  function startBlankProject(newProject: ProjectConfig) {
    try {
      localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(newProject));
      localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify([]));
      localStorage.setItem(STORAGE_ONBOARDED_KEY, "1");
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      // Ignore storage errors
    }
  }

  function updateExpenses(updater: (prev: ExpenseItem[]) => ExpenseItem[]) {
    const next = updater(expenses);
    try {
      localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      // Ignore storage errors
    }
  }

  function updateProject(next: ProjectConfig) {
    try {
      localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      // Ignore storage errors
    }
  }

  const [activeTab, setActiveTab] = useState<ActiveTab>("resumen");

  // Filters in Gastos tab
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pagado" | "pendiente">("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Derived Totals
  const totals = useMemo(() => {
    let materiales = 0;
    let manoObra = 0;
    let transporte = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const item of expenses) {
      if (item.status === "pagado") {
        paidCount += 1;
        if (item.kind === "Materiales") materiales += item.amount;
        else if (item.kind === "Mano de Obra") manoObra += item.amount;
        else if (item.kind === "Transporte") transporte += item.amount;
      } else {
        pendingCount += 1;
      }
    }

    const granTotal = materiales + manoObra + transporte;
    return {
      materiales,
      manoObra,
      transporte,
      granTotal,
      paidCount,
      pendingCount,
      totalCount: expenses.length,
    };
  }, [expenses]);

  const existingCategories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category))),
    [expenses]
  );

  const existingPaymentMethods = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.paymentMethod).filter(Boolean))),
    [expenses]
  );

  // Analytics Data
  const kindSlices = useMemo(
    () => [
      { label: "Materiales", value: totals.materiales, color: KIND_COLORS.Materiales },
      { label: "Mano de Obra", value: totals.manoObra, color: KIND_COLORS["Mano de Obra"] },
      { label: "Transporte", value: totals.transporte, color: KIND_COLORS.Transporte },
    ],
    [totals]
  );

  const categorySlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of expenses) {
      if (item.status === "pagado" && item.amount > 0) {
        map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], idx) => ({
        label,
        value,
        color: ARCHITECTURAL_PALETTE[idx % ARCHITECTURAL_PALETTE.length],
      }));
  }, [expenses]);

  const paymentMethodStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const item of expenses) {
      if (item.status === "pagado" && item.amount > 0) {
        const key = item.paymentMethod || "Otro";
        const prev = map.get(key) ?? { total: 0, count: 0 };
        map.set(key, { total: prev.total + item.amount, count: prev.count + 1 });
      }
    }
    return Array.from(map.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const topExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "pagado" && e.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6),
    [expenses]
  );

  const pendingItems = useMemo(
    () => expenses.filter((e) => e.status === "pendiente"),
    [expenses]
  );

  const recentPaidItems = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "pagado" && e.amount > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [expenses]
  );

  // Filtered list for Gastos tab
  const groupedFilteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = expenses.filter((item) => {
      if (statusFilter !== "todos" && item.status !== statusFilter) return false;
      if (categoryFilter !== "Todas" && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.name} ${item.category} ${item.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const groups = new Map<string, ExpenseItem[]>();
    for (const item of filtered) {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
      subtotal: items.reduce((sum, i) => sum + (i.status === "pagado" ? i.amount : 0), 0),
    }));
  }, [expenses, search, statusFilter, categoryFilter]);

  function openNewModal() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditModal(item: ExpenseItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleSaveExpense(saved: ExpenseItem) {
    updateExpenses((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      if (exists) {
        return prev.map((e) => (e.id === saved.id ? saved : e));
      }
      return [saved, ...prev];
    });
    setModalOpen(false);
    setEditingItem(null);
  }

  function handleDeleteExpense(id: string) {
    updateExpenses((prev) => prev.filter((e) => e.id !== id));
    setModalOpen(false);
    setEditingItem(null);
  }

  function handleImportBackup(data: {
    project?: ProjectConfig;
    expenses: ExpenseItem[];
  }) {
    updateExpenses(() => data.expenses);
    if (data.project && typeof data.project.name === "string") {
      updateProject(data.project);
    }
  }

  function handleResetData() {
    try {
      localStorage.removeItem(STORAGE_EXPENSES_KEY);
      localStorage.removeItem(STORAGE_PROJECT_KEY);
      localStorage.removeItem(STORAGE_ONBOARDED_KEY);
      window.dispatchEvent(new Event(STORAGE_EVENT));
      setActiveTab("resumen");
      setSearch("");
      setStatusFilter("todos");
      setCategoryFilter("Todas");
    } catch {
      // Ignore storage errors
    }
  }

  const budgetPct =
    project.budget && project.budget > 0
      ? Math.min(100, Math.round((totals.granTotal / project.budget) * 100))
      : null;

  if (onboardedState === "pending") {
    return <div className="min-h-dvh bg-[#F6F5F2]" />;
  }

  if (onboardedState !== "1") {
    return <OnboardingScreen onStartBlank={startBlankProject} />;
  }

  return (
    <div className="min-h-dvh bg-[#F6F5F2] text-[#141413] flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-[#E2E0DA]">
        <div className="p-6 border-b border-[#E2E0DA]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#6B6963]">
              Remodelación
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 text-[#6B6963] hover:text-[#141413] border border-transparent hover:border-[#E2E0DA]"
              aria-label="Configuración"
            >
              <IconSliders className="w-4 h-4" />
            </button>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-[#141413] mt-1 truncate">
            {project.name}
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {(
            [
              { id: "resumen", label: "Resumen", Icon: IconOverview },
              { id: "gastos", label: "Gastos", Icon: IconList },
              { id: "analisis", label: "Análisis", Icon: IconPie },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3.5 h-11 text-xs font-medium uppercase tracking-[0.12em] border transition-colors ${
                  active
                    ? "bg-[#141413] text-[#F6F5F2] border-[#141413]"
                    : "bg-transparent text-[#6B6963] border-transparent hover:bg-[#F6F5F2] hover:text-[#141413]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E0DA] space-y-3">
          <div className="bg-[#F6F5F2] border border-[#E2E0DA] p-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] block">
              Gran Total
            </span>
            <span className="text-lg font-mono font-semibold tabular-nums text-[#141413] mt-0.5 block">
              {formatCOP(totals.granTotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="w-full h-11 bg-[#B85D3B] text-white text-xs font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-2 hover:bg-[#141413] transition-colors"
          >
            <IconPlus className="w-4 h-4" />
            <span>Nuevo gasto</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#F6F5F2] border-b border-[#E2E0DA] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-[0.16em] text-[#6B6963] block leading-none">
              Remodelación
            </span>
            <h1 className="text-sm font-semibold tracking-tight text-[#141413] truncate mt-1">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right mr-1">
              <span className="text-[9px] uppercase tracking-[0.14em] text-[#6B6963] block leading-none">
                Total
              </span>
              <span className="text-xs font-mono font-semibold tabular-nums text-[#141413] block mt-1">
                {formatCOP(totals.granTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 bg-white border border-[#E2E0DA] flex items-center justify-center text-[#141413]"
              aria-label="Configuración"
            >
              <IconSliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          {/* TAB 1: RESUMEN */}
          {activeTab === "resumen" && (
            <div className="space-y-5">
              {/* Hero Gran Total */}
              <section className="bg-white border border-[#E2E0DA] p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#6B6963] block">
                      Gran Total Invertido
                    </span>
                    <div className="text-3xl sm:text-4xl font-mono font-semibold tabular-nums tracking-tight text-[#141413] mt-1">
                      {formatCOP(totals.granTotal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#6B6963] block">
                        Pagados
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#141413]">
                        {totals.paidCount}
                      </span>
                    </div>
                    <div className="w-px h-7 bg-[#E2E0DA]" />
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#6B6963] block">
                        Pendientes
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#B85D3B]">
                        {totals.pendingCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proportional Flat Split Bar */}
                {totals.granTotal > 0 && (
                  <div className="mt-5">
                    <div className="h-2.5 w-full bg-[#ECEAE4] flex overflow-hidden">
                      <div
                        style={{
                          width: `${(totals.materiales / totals.granTotal) * 100}%`,
                          backgroundColor: KIND_COLORS.Materiales,
                        }}
                      />
                      <div
                        style={{
                          width: `${(totals.manoObra / totals.granTotal) * 100}%`,
                          backgroundColor: KIND_COLORS["Mano de Obra"],
                        }}
                      />
                      <div
                        style={{
                          width: `${(totals.transporte / totals.granTotal) * 100}%`,
                          backgroundColor: KIND_COLORS.Transporte,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Optional Budget Progress */}
                {budgetPct !== null && project.budget && (
                  <div className="mt-4 pt-4 border-t border-[#E2E0DA]">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="uppercase tracking-[0.12em] text-[#6B6963]">
                        Presupuesto ({formatCOP(project.budget)})
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#141413]">
                        {budgetPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#ECEAE4]">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${budgetPct}%`,
                          backgroundColor: budgetPct >= 95 ? "#B85D3B" : "#141413",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 3 Macro Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E2E0DA] border border-[#E2E0DA] mt-5">
                  {[
                    {
                      label: "Total Materiales",
                      value: totals.materiales,
                      color: KIND_COLORS.Materiales,
                    },
                    {
                      label: "Total Mano de Obra",
                      value: totals.manoObra,
                      color: KIND_COLORS["Mano de Obra"],
                    },
                    {
                      label: "Total Transporte",
                      value: totals.transporte,
                      color: KIND_COLORS.Transporte,
                    },
                  ].map((block) => {
                    const pct =
                      totals.granTotal > 0
                        ? ((block.value / totals.granTotal) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <div key={block.label} className="bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 inline-block"
                              style={{ backgroundColor: block.color }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.12em] text-[#6B6963]">
                              {block.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-[#9E9B93]">
                            {pct}%
                          </span>
                        </div>
                        <div className="text-lg font-mono font-semibold tabular-nums text-[#141413] mt-1.5">
                          {formatCOP(block.value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Two-column lists or Clean Empty State */}
              {expenses.length === 0 ? (
                <section className="bg-white border border-[#E2E0DA] p-8 sm:p-10 text-center">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#9E9B93] block">
                    Proyecto listo
                  </span>
                  <h2 className="text-base font-semibold text-[#141413] mt-1.5">
                    Registra tu primer gasto
                  </h2>
                  <p className="text-xs text-[#6B6963] mt-1 max-w-xs mx-auto">
                    Anota materiales, mano de obra o transporte y lleva el control total desde aquí.
                  </p>
                  <button
                    type="button"
                    onClick={openNewModal}
                    className="mt-5 px-6 h-11 bg-[#141413] text-[#F6F5F2] text-xs font-medium uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:bg-[#B85D3B] transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span>Agregar gasto</span>
                  </button>
                </section>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Pending items quick registration */}
                <section className="bg-white border border-[#E2E0DA]">
                  <div className="px-5 py-3.5 border-b border-[#E2E0DA] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] font-medium">
                      Por registrar ({pendingItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("pendiente");
                        setActiveTab("gastos");
                      }}
                      className="text-[10px] uppercase tracking-[0.12em] text-[#B85D3B] font-medium"
                    >
                      Ver todos
                    </button>
                  </div>
                  {pendingItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#9E9B93]">
                      Todos los ítems tienen valor registrado
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E0DA]">
                      {pendingItems.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#F6F5F2] transition-colors"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-sm font-medium text-[#141413] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#6B6963] mt-0.5">
                              {item.category} · {formatQty(item.quantity, item.unit)}
                            </div>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] border border-[#B85D3B] text-[#B85D3B] font-medium">
                            Registrar
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Recent Paid */}
                <section className="bg-white border border-[#E2E0DA]">
                  <div className="px-5 py-3.5 border-b border-[#E2E0DA] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] font-medium">
                      Últimos pagos
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("pagado");
                        setActiveTab("gastos");
                      }}
                      className="text-[10px] uppercase tracking-[0.12em] text-[#141413] font-medium"
                    >
                      Ver historial
                    </button>
                  </div>
                  {recentPaidItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#9E9B93]">
                      Aún no hay pagos registrados
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E0DA]">
                      {recentPaidItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-[#F6F5F2] transition-colors"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-sm font-medium text-[#141413] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#6B6963] mt-0.5">
                              {item.category}
                              {item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono font-semibold tabular-nums text-[#141413]">
                              {formatCOP(item.amount)}
                            </span>
                            <IconChevronRight className="w-3.5 h-3.5 text-[#9E9B93]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              )}
            </div>
          )}

          {/* TAB 2: GASTOS */}
          {activeTab === "gastos" && (
            <div className="space-y-4">
              {/* Search & Status Filters */}
              <div className="bg-white border border-[#E2E0DA] p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <IconSearch className="w-4 h-4 text-[#9E9B93] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar ítem, categoría o método..."
                      className="w-full h-10 pl-9 pr-3 bg-[#F6F5F2] border border-[#E2E0DA] focus:border-[#141413] outline-none text-xs text-[#141413]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                    {(
                      [
                        { id: "todos", label: "Todos" },
                        { id: "pagado", label: "Pagados" },
                        { id: "pendiente", label: "Pendientes" },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`h-10 text-[11px] uppercase tracking-[0.08em] font-medium border transition-colors ${
                          statusFilter === st.id
                            ? "bg-[#141413] text-white border-[#141413]"
                            : "bg-white text-[#6B6963] border-[#E2E0DA]"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {["Todas", ...existingCategories].map((cat) => {
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`shrink-0 px-3 h-8 text-xs border transition-colors ${
                          active
                            ? "bg-[#2C4A52] text-white border-[#2C4A52]"
                            : "bg-[#F6F5F2] text-[#6B6963] border-[#E2E0DA] hover:text-[#141413]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grouped Expense List */}
              {groupedFilteredExpenses.length === 0 ? (
                <div className="bg-white border border-[#E2E0DA] p-10 text-center">
                  <p className="text-xs text-[#6B6963]">
                    {expenses.length === 0
                      ? "Aún no tienes gastos registrados"
                      : "No hay registros con estos filtros"}
                  </p>
                  {expenses.length === 0 && (
                    <button
                      type="button"
                      onClick={openNewModal}
                      className="mt-4 px-5 h-10 bg-[#141413] text-[#F6F5F2] text-[11px] font-medium uppercase tracking-[0.12em] inline-flex items-center gap-2"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Agregar gasto</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedFilteredExpenses.map((group) => (
                    <section
                      key={group.category}
                      className="bg-white border border-[#E2E0DA]"
                    >
                      <div className="px-4 sm:px-5 py-3 bg-[#ECEAE4] border-b border-[#E2E0DA] flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#141413]">
                          {group.category}
                        </span>
                        <span className="text-xs font-mono font-semibold tabular-nums text-[#141413]">
                          {formatCOP(group.subtotal)}
                        </span>
                      </div>

                      <div className="divide-y divide-[#E2E0DA]">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#F6F5F2] transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="text-sm font-medium text-[#141413] truncate">
                                {item.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-[#6B6963]">
                                <span className="font-mono tabular-nums">
                                  {formatQty(item.quantity, item.unit)}
                                </span>
                                {item.paymentMethod && (
                                  <>
                                    <span>·</span>
                                    <span className="uppercase tracking-[0.06em] text-[#2C4A52] font-medium">
                                      {item.paymentMethod}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {item.status === "pagado" ? (
                                <span className="text-sm font-mono font-semibold tabular-nums text-[#141413]">
                                  {formatCOP(item.amount)}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] bg-[#F6F5F2] border border-[#E2E0DA] text-[#B85D3B] font-medium">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANÁLISIS */}
          {activeTab === "analisis" && (
            <div className="space-y-5">
              {/* Two Pie/Donut Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <DonutChart
                  title="Distribución por rubro"
                  slices={kindSlices}
                />
                <DonutChart
                  title="Distribución por categoría"
                  slices={categorySlices}
                />
              </div>

              {/* Payment Methods + Completion & Top Expenses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Métodos de pago */}
                <section className="bg-white border border-[#E2E0DA] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B6963]">
                      Por método de pago
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-[#9E9B93]">
                      {paymentMethodStats.length}{" "}
                      {paymentMethodStats.length === 1 ? "medio" : "medios"}
                    </span>
                  </div>

                  {paymentMethodStats.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#9E9B93]">
                      Sin pagos registrados
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {paymentMethodStats.map((pm, idx) => {
                        const pct =
                          totals.granTotal > 0
                            ? (pm.total / totals.granTotal) * 100
                            : 0;
                        return (
                          <div key={pm.method}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-[#141413]">
                                {pm.method}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold tabular-nums text-[#141413]">
                                  {formatCOP(pm.total)}
                                </span>
                                <span className="font-mono tabular-nums text-[10px] text-[#6B6963] w-9 text-right">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-[#ECEAE4]">
                              <div
                                className="h-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    ARCHITECTURAL_PALETTE[
                                      idx % ARCHITECTURAL_PALETTE.length
                                    ],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Avance & Top Gastos */}
                <section className="bg-white border border-[#E2E0DA] p-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B6963]">
                        Avance de partidas
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-[#141413]">
                        {totals.paidCount} / {totals.totalCount}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#ECEAE4]">
                      <div
                        className="h-full bg-[#5A6B5C]"
                        style={{
                          width:
                            totals.totalCount > 0
                              ? `${(totals.paidCount / totals.totalCount) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E2E0DA]">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B6963] block mb-3">
                      Mayores gastos
                    </span>
                    {topExpenses.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#9E9B93]">
                        Sin gastos registrados aún
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {topExpenses.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="font-mono text-[10px] text-[#9E9B93] w-4">
                                0{idx + 1}
                              </span>
                              <span className="text-[#141413] truncate font-medium">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-mono font-semibold tabular-nums text-[#141413] shrink-0">
                              {formatCOP(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (iPhone 17 Pro Safe Area) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E2E0DA] pb-safe">
        <div className="grid grid-cols-4 h-16 items-center px-2">
          {(
            [
              { id: "resumen", label: "Resumen", Icon: IconOverview },
              { id: "gastos", label: "Gastos", Icon: IconList },
              { id: "analisis", label: "Análisis", Icon: IconPie },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center h-full gap-1 transition-colors ${
                  active ? "text-[#141413]" : "text-[#9E9B93]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium uppercase tracking-[0.08em]">
                  {label}
                </span>
              </button>
            );
          })}

          <div className="flex items-center justify-center h-full px-1.5">
            <button
              type="button"
              onClick={openNewModal}
              className="w-full h-11 bg-[#141413] text-[#F6F5F2] flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] active:bg-[#B85D3B]"
              aria-label="Nuevo gasto"
            >
              <IconPlus className="w-4 h-4" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Modals */}
      {modalOpen && (
        <ExpenseModal
          item={editingItem}
          existingCategories={existingCategories}
          existingPaymentMethods={existingPaymentMethods}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveExpense}
          onDelete={handleDeleteExpense}
        />
      )}

      {settingsOpen && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setSettingsOpen(false)}
          onSave={updateProject}
          onExportExcel={() => exportToExcel(project, expenses)}
          onExportPDF={() => exportToPDF(project, expenses)}
          onExportBackup={() => exportBackupJSON(project, expenses)}
          onImportBackup={handleImportBackup}
          onResetData={handleResetData}
        />
      )}
    </div>
  );
}
