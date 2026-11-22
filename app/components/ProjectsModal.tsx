"use client";

import React, { useState } from "react";
import { formatCOP } from "../lib/initial-data";
import { IconClose, IconPlus, IconTrash } from "./Icons";

export interface ProjectSummary {
  id: string;
  name: string;
  budget: number | null;
  expenseCount: number;
  totalSpent: number;
  updatedAt: string;
}

interface ProjectsModalProps {
  projects: ProjectSummary[];
  activeProjectId: string;
  loading: boolean;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectsModal({
  projects,
  activeProjectId,
  loading,
  onClose,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
}: ProjectsModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141413]/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#F6F5F2] border-t sm:border border-[#141413] max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-[#E2E0DA]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6B6963] block">
              Espacios
            </span>
            <h2 className="text-base font-semibold text-[#141413]">
              Proyectos iniciados ({projects.length})
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

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
          {loading && projects.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#9E9B93]">
              Cargando proyectos...
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-[#E2E0DA] p-8 text-center text-xs text-[#9E9B93]">
              No hay proyectos iniciados aún
            </div>
          ) : (
            projects.map((p) => {
              const isActive = p.id === activeProjectId;
              const isConfirming = confirmDeleteId === p.id;
              return (
                <div
                  key={p.id}
                  className={`bg-white border transition-colors ${
                    isActive ? "border-[#141413]" : "border-[#E2E0DA]"
                  }`}
                >
                  <div className="flex items-center justify-between p-4 gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#141413] truncate">
                          {p.name}
                        </span>
                        {isActive && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] bg-[#141413] text-[#F6F5F2]">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B6963]">
                        <span className="font-mono tabular-nums">
                          {p.expenseCount}{" "}
                          {p.expenseCount === 1 ? "registro" : "registros"}
                        </span>
                        <span>·</span>
                        <span className="font-mono font-semibold tabular-nums text-[#141413]">
                          {formatCOP(p.totalSpent)}
                        </span>
                      </div>
                    </button>

                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="w-9 h-9 shrink-0 flex items-center justify-center border border-[#E2E0DA] text-[#9E9B93] hover:text-[#B85D3B] hover:border-[#B85D3B] transition-colors"
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 h-8 text-[10px] uppercase border border-[#E2E0DA] text-[#6B6963]"
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(p.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 h-8 text-[10px] uppercase bg-[#B85D3B] text-white font-medium"
                        >
                          Sí
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E2E0DA] pb-safe">
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full h-11 bg-[#141413] text-[#F6F5F2] text-xs font-medium uppercase tracking-[0.14em] flex items-center justify-center gap-2 hover:bg-[#B85D3B] transition-colors"
          >
            <IconPlus className="w-4 h-4" />
            <span>Crear nuevo proyecto</span>
          </button>
        </div>
      </div>
    </div>
  );
}
