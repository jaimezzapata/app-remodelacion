"use client";

import React, { useRef, useState } from "react";
import type { ExpenseItem, ProjectConfig } from "../lib/types";
import { formatCOP } from "../lib/initial-data";
import { IconClose } from "./Icons";

interface ProjectSettingsModalProps {
  project: ProjectConfig;
  onClose: () => void;
  onSave: (project: ProjectConfig) => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportBackup: () => void;
  onImportBackup: (data: { project?: ProjectConfig; expenses: ExpenseItem[] }) => void;
  onResetData: () => void;
}

export function ProjectSettingsModal({
  project,
  onClose,
  onSave,
  onExportExcel,
  onExportPDF,
  onExportBackup,
  onImportBackup,
  onResetData,
}: ProjectSettingsModalProps) {
  const [name, setName] = useState(project.name);
  const [budgetStr, setBudgetStr] = useState(
    project.budget ? String(project.budget) : ""
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedBudget = Number(budgetStr.replace(/[^\d]/g, "")) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim() || "MI REMODELACIÓN",
      budget: parsedBudget > 0 ? parsedBudget : null,
    });
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.expenses)) {
          onImportBackup({
            project: parsed.project,
            expenses: parsed.expenses,
          });
          onClose();
        } else {
          setImportError("El archivo no es un respaldo válido.");
        }
      } catch {
        setImportError("No se pudo leer el archivo.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141413]/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#F6F5F2] border-t sm:border border-[#141413] max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#E2E0DA]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] block">
              Proyecto
            </span>
            <h2 className="text-base font-semibold text-[#141413]">
              Configuración y Descargas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-[#E2E0DA] text-[#141413] hover:bg-[#ECEAE4]"
            aria-label="Cerrar"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 pb-safe">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963] mb-1.5">
              Nombre del proyecto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm text-[#141413]"
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
              className="w-full h-11 px-3 bg-white border border-[#E2E0DA] focus:border-[#141413] outline-none text-sm font-mono tabular-nums text-[#141413]"
            />
            {parsedBudget > 0 && (
              <span className="block text-[11px] font-mono tabular-nums text-[#6B6963] mt-1">
                {formatCOP(parsedBudget)}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-[#141413] text-[#F6F5F2] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#2C4A52] transition-colors"
          >
            Guardar proyecto
          </button>

          {/* Descargas */}
          <div className="pt-3 border-t border-[#E2E0DA] space-y-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963]">
              Exportar reporte
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportExcel}
                className="h-11 bg-white border border-[#141413] text-xs font-medium uppercase tracking-[0.1em] text-[#141413] hover:bg-[#141413] hover:text-white transition-colors"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={onExportPDF}
                className="h-11 bg-white border border-[#B85D3B] text-xs font-medium uppercase tracking-[0.1em] text-[#B85D3B] hover:bg-[#B85D3B] hover:text-white transition-colors"
              >
                PDF (.pdf)
              </button>
            </div>
          </div>

          {/* Respaldo local */}
          <div className="pt-3 border-t border-[#E2E0DA] space-y-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-[#6B6963]">
              Respaldo en iPhone
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="h-10 bg-white border border-[#E2E0DA] text-[11px] font-medium uppercase tracking-[0.08em] text-[#141413] hover:border-[#141413]"
              >
                Guardar copia
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 bg-white border border-[#E2E0DA] text-[11px] font-medium uppercase tracking-[0.08em] text-[#141413] hover:border-[#141413]"
              >
                Cargar copia
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {importError && (
              <p className="text-[11px] text-[#B85D3B]">{importError}</p>
            )}
          </div>

          <div className="pt-3 border-t border-[#E2E0DA]">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full h-10 bg-white border border-[#E2E0DA] text-xs font-medium uppercase tracking-[0.1em] text-[#B85D3B] hover:border-[#B85D3B] transition-colors"
              >
                Reiniciar aplicación
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-10 bg-white border border-[#E2E0DA] text-xs text-[#6B6963]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    onClose();
                  }}
                  className="h-10 bg-[#B85D3B] text-white text-xs font-medium"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
