"use client";

import React, { useState } from "react";
import type { ExpenseItem, ExpenseKind, ExpenseStatus } from "../lib/types";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  formatCOP,
} from "../lib/initial-data";
import { IconClose, IconTrash } from "./Icons";

interface ExpenseModalProps {
  item: ExpenseItem | null;
  existingCategories: string[];
  existingPaymentMethods: string[];
  onClose: () => void;
  onSave: (item: ExpenseItem) => void;
  onDelete?: (id: string) => void;
}

const KINDS: ExpenseKind[] = ["Materiales", "Mano de Obra", "Transporte"];
const UNITS = ["m²", "und", "ml", "glb", "kg", "lt"];

export function ExpenseModal({
  item,
  existingCategories,
  existingPaymentMethods,
  onClose,
  onSave,
  onDelete,
}: ExpenseModalProps) {
  const isEditing = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<ExpenseKind>(item?.kind ?? "Materiales");
  const [category, setCategory] = useState(item?.category ?? "Pisos");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const [quantityStr, setQuantityStr] = useState(
    item?.quantity !== null && item?.quantity !== undefined
      ? String(item.quantity).replace(".", ",")
      : ""
  );
  const [unit, setUnit] = useState(item?.unit ?? "m²");

  const [amountStr, setAmountStr] = useState(
    item && item.amount > 0 ? String(item.amount) : ""
  );
  const [status, setStatus] = useState<ExpenseStatus>(item?.status ?? "pagado");
  const [paymentMethod, setPaymentMethod] = useState(
    item?.paymentMethod || "Transferencia"
  );
  const [date, setDate] = useState(
    item?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(item?.note ?? "");

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories])
  );
  const paymentMethods = Array.from(
    new Set([...DEFAULT_PAYMENT_METHODS, ...existingPaymentMethods].filter(Boolean))
  );

  const parsedAmount = Number(amountStr.replace(/[^\d]/g, "")) || 0;

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    setAmountStr(digits);
    if (Number(digits) > 0 && status === "pendiente") {
      setStatus("pagado");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) return;

    const finalCategory =
      showCustomCategory && customCategory.trim()
        ? customCategory.trim()
        : category;

    const cleanQty = quantityStr.trim().replace(",", ".");
    const parsedQty = cleanQty ? Number(cleanQty) : null;

    const finalStatus: ExpenseStatus =
      parsedAmount === 0 ? "pendiente" : status;

    onSave({
      id: item?.id ?? `exp-${Date.now()}`,
      name: finalName,
      category: finalCategory,
      kind,
      quantity: parsedQty !== null && !Number.isNaN(parsedQty) ? parsedQty : null,
      unit,
      amount: finalStatus === "pendiente" ? 0 : parsedAmount,
      paymentMethod:
        finalStatus === "pendiente" ? "" : paymentMethod.trim() || "Efectivo",
      status: finalStatus,
      date,
      note: note.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141413]/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#F6F5F2] border-t sm:border border-[#141413] max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#E2E0DA]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] block">
              {isEditing ? "Editar registro" : "Nuevo registro"}
            </span>
            <h2 className="text-base font-semibold text-[#141413] tracking-tight">
              {isEditing ? item?.name : "Agregar gasto"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && onDelete && item && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="w-10 h-10 flex items-center justify-center border border-[#E2E0DA] text-[#B85D3B] hover:bg-[#B85D3B] hover:text-white transition-colors"
                aria-label="Eliminar"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center border border-[#E2E0DA] text-[#141413] hover:bg-[#ECEAE4] transition-colors"
              aria-label="Cerrar"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-5 py-4 space-y-4 pb-safe"
        >
          {/* Nombre del item */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
              Concepto / Ítem
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Piso Baño 1, Cemento, Pintura..."
              className="w-full h-11 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm text-[#141413]"
            />
          </div>

          {/* Rubro / Tipo */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
              Rubro
            </label>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => {
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k);
                      if (k === "Mano de Obra") setCategory("Mano de Obra");
                      if (k === "Transporte") setCategory("Transporte");
                    }}
                    className={`h-10 text-xs font-medium border transition-colors ${
                      active
                        ? "bg-[#141413] text-[#F6F5F2] border-[#141413]"
                        : "bg-white text-[#141413] border-[#E2E0DA] hover:border-[#141413]"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963]">
                Categoría
              </label>
              <button
                type="button"
                onClick={() => setShowCustomCategory(!showCustomCategory)}
                className="text-[10px] uppercase tracking-[0.1em] text-[#B85D3B] font-medium"
              >
                {showCustomCategory ? "Elegir existente" : "+ Nueva"}
              </button>
            </div>
            {showCustomCategory ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nombre de la categoría"
                className="w-full h-11 px-3 bg-white border border-[#141413] outline-none text-sm text-[#141413]"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 h-8 text-xs border transition-colors ${
                        active
                          ? "bg-[#141413] text-[#F6F5F2] border-[#141413]"
                          : "bg-white text-[#6B6963] border-[#E2E0DA] hover:text-[#141413]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Valor & Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Valor (COP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm font-mono tabular-nums text-[#141413]"
              />
              {parsedAmount > 0 && (
                <span className="block text-[11px] font-mono tabular-nums text-[#6B6963] mt-1">
                  {formatCOP(parsedAmount)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Estado
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["pagado", "pendiente"] as ExpenseStatus[]).map((st) => {
                  const active = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`h-11 text-xs font-medium uppercase tracking-[0.08em] border transition-colors ${
                        active
                          ? st === "pagado"
                            ? "bg-[#141413] text-white border-[#141413]"
                            : "bg-[#B85D3B] text-white border-[#B85D3B]"
                          : "bg-white text-[#6B6963] border-[#E2E0DA]"
                      }`}
                    >
                      {st === "pagado" ? "Pagado" : "Pendiente"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cantidad & Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Cantidad
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                placeholder="Ej: 7,70"
                className="w-full h-11 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm font-mono tabular-nums text-[#141413]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Unidad
              </label>
              <div className="flex gap-1">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`flex-1 h-11 text-xs font-mono border transition-colors ${
                      unit === u
                        ? "bg-[#141413] text-white border-[#141413]"
                        : "bg-white text-[#6B6963] border-[#E2E0DA]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Método de pago */}
          {status === "pagado" && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Método de pago
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {paymentMethods.map((pm) => {
                  const active = paymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`px-3 h-8 text-xs border transition-colors ${
                        active
                          ? "bg-[#2C4A52] text-white border-[#2C4A52]"
                          : "bg-white text-[#6B6963] border-[#E2E0DA]"
                      }`}
                    >
                      {pm}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="O escribe otro método de pago"
                className="w-full h-10 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-xs text-[#141413]"
              />
            </div>
          )}

          {/* Fecha & Nota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-xs font-mono text-[#141413]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Proveedor, referencia..."
                className="w-full h-10 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-xs text-[#141413]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 bg-[#141413] text-[#F6F5F2] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#2C4A52] transition-colors"
            >
              {isEditing ? "Guardar cambios" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
