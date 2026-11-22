"use client";

import React, { useState } from "react";
import type { ProjectConfig } from "../lib/types";
import { formatCOP } from "../lib/initial-data";

interface OnboardingScreenProps {
  onStartBlank: (project: ProjectConfig) => void;
}

export function OnboardingScreen({ onStartBlank }: OnboardingScreenProps) {
  const [name, setName] = useState("");
  const [budgetStr, setBudgetStr] = useState("");

  const parsedBudget = Number(budgetStr.replace(/[^\d]/g, "")) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onStartBlank({
      name: name.trim() || "MI REMODELACIÓN",
      budget: parsedBudget > 0 ? parsedBudget : null,
    });
  }

  return (
    <div className="min-h-dvh bg-[#F6F5F2] text-[#141413] flex flex-col justify-between px-5 py-8 pt-safe pb-safe">
      {/* Top architectural mark */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#141413] flex items-center justify-center">
            <div className="w-3 h-3 border border-[#F6F5F2] relative">
              <div className="w-1.5 h-1.5 bg-[#B85D3B] absolute top-0 right-0" />
            </div>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#141413]">
            Obra
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#9E9B93]">
          Nuevo proyecto
        </span>
      </div>

      {/* Center Form */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="mb-8">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#B85D3B] font-medium block mb-2">
            Control de gastos
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#141413] leading-tight">
            Organiza cada peso de tu remodelación
          </h1>
          <p className="text-xs text-[#6B6963] mt-2 leading-relaxed">
            Registra materiales, mano de obra y transporte desde tu celular.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E2E0DA] p-5 space-y-4"
        >
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
              Nombre del espacio o proyecto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi Apartamento, Casa, Cocina..."
              autoFocus
              className="w-full h-12 px-3 bg-[#F6F5F2] border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm text-[#141413]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
              Presupuesto estimado (opcional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Ej: 15000000"
              className="w-full h-12 px-3 bg-[#F6F5F2] border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm font-mono tabular-nums text-[#141413]"
            />
            {parsedBudget > 0 && (
              <span className="block text-[11px] font-mono tabular-nums text-[#6B6963] mt-1">
                {formatCOP(parsedBudget)}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-[#141413] text-[#F6F5F2] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#2C4A52] transition-colors"
          >
            Comenzar proyecto
          </button>
        </form>
      </div>

      {/* Bottom minimal note */}
      <div className="max-w-md w-full mx-auto text-center">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#9E9B93]">
          Tus datos se guardan en este dispositivo
        </span>
      </div>
    </div>
  );
}
