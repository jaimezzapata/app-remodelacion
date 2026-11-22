import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import type { ExpenseItem, ProjectConfig } from "./types";
import { formatCOP, formatQty } from "./initial-data";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "remodelacion"
  );
}

function computeTotals(expenses: ExpenseItem[]) {
  let materiales = 0;
  let manoObra = 0;
  let transporte = 0;

  for (const item of expenses) {
    if (item.status !== "pagado") continue;
    if (item.kind === "Materiales") materiales += item.amount;
    else if (item.kind === "Mano de Obra") manoObra += item.amount;
    else if (item.kind === "Transporte") transporte += item.amount;
  }

  return {
    materiales,
    manoObra,
    transporte,
    granTotal: materiales + manoObra + transporte,
  };
}

export function exportToExcel(project: ProjectConfig, expenses: ExpenseItem[]) {
  const totals = computeTotals(expenses);
  const today = new Date().toISOString().slice(0, 10);

  // Hoja 1: Resumen
  const categoryMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();

  for (const item of expenses) {
    if (item.status === "pagado" && item.amount > 0) {
      categoryMap.set(
        item.category,
        (categoryMap.get(item.category) ?? 0) + item.amount
      );
      const pm = item.paymentMethod || "Otro";
      paymentMap.set(pm, (paymentMap.get(pm) ?? 0) + item.amount);
    }
  }

  const summaryRows: Array<Array<string | number>> = [
    ["PROYECTO", project.name],
    ["FECHA", today],
    [],
    ["RESUMEN GENERAL", "VALOR (COP)"],
    ["TOTAL MATERIALES", totals.materiales],
    ["TOTAL TRANSPORTE", totals.transporte],
    ["TOTAL MANO DE OBRA", totals.manoObra],
    ["GRAN TOTAL", totals.granTotal],
  ];

  if (project.budget && project.budget > 0) {
    summaryRows.push(["PRESUPUESTO ESTIMADO", project.budget]);
    summaryRows.push(["DIFERENCIA", project.budget - totals.granTotal]);
  }

  summaryRows.push([], ["POR CATEGORÍA", "VALOR (COP)"]);
  for (const [cat, val] of Array.from(categoryMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )) {
    summaryRows.push([cat, val]);
  }

  summaryRows.push([], ["POR MÉTODO DE PAGO", "VALOR (COP)"]);
  for (const [pm, val] of Array.from(paymentMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )) {
    summaryRows.push([pm, val]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 18 }];

  // Hoja 2: Detalle de gastos
  const detailRows: Array<Array<string | number>> = [
    [
      "CATEGORÍA",
      "RUBRO",
      "ÍTEM",
      "CANTIDAD",
      "UNIDAD",
      "VALOR (COP)",
      "MÉTODO DE PAGO",
      "ESTADO",
      "FECHA",
      "NOTA",
    ],
    ...expenses.map((e) => [
      e.category,
      e.kind,
      e.name,
      e.quantity ?? "",
      e.unit,
      e.status === "pagado" ? e.amount : 0,
      e.paymentMethod || "",
      e.status === "pagado" ? "Pagado" : "Pendiente",
      e.date,
      e.note ?? "",
    ]),
  ];

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail["!cols"] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 28 },
    { wch: 10 },
    { wch: 8 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsDetail, "Gastos");

  XLSX.writeFile(wb, `${slugify(project.name)}-${today}.xlsx`);
}

export function exportToPDF(project: ProjectConfig, expenses: ExpenseItem[]) {
  const totals = computeTotals(expenses);
  const today = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header arquitectónico
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 105, 99);
  doc.text("REPORTE DE REMODELACIÓN", margin, y);
  doc.text(today.toUpperCase(), pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 19);
  doc.text(project.name, margin, y);

  y += 4;
  doc.setDrawColor(20, 20, 19);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // Bloques de resumen
  y += 6;
  const boxWidth = (contentWidth - 6) / 4;
  const summaryBoxes = [
    { label: "MATERIALES", value: formatCOP(totals.materiales), dark: false },
    { label: "MANO DE OBRA", value: formatCOP(totals.manoObra), dark: false },
    { label: "TRANSPORTE", value: formatCOP(totals.transporte), dark: false },
    { label: "GRAN TOTAL", value: formatCOP(totals.granTotal), dark: true },
  ];

  summaryBoxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 2);
    if (box.dark) {
      doc.setFillColor(20, 20, 19);
      doc.rect(x, y, boxWidth, 16, "F");
      doc.setTextColor(246, 245, 242);
    } else {
      doc.setDrawColor(226, 224, 218);
      doc.setLineWidth(0.3);
      doc.rect(x, y, boxWidth, 16, "S");
      doc.setTextColor(107, 105, 99);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(box.label, x + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    if (!box.dark) doc.setTextColor(20, 20, 19);
    doc.text(box.value, x + 3, y + 12);
  });

  y += 23;

  // Tabla de detalle
  const drawTableHeader = (topY: number) => {
    doc.setFillColor(236, 234, 228);
    doc.rect(margin, topY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 19);
    doc.text("ÍTEM", margin + 2, topY + 4.8);
    doc.text("CATEGORÍA", margin + 62, topY + 4.8);
    doc.text("CANT.", margin + 96, topY + 4.8);
    doc.text("MÉTODO", margin + 118, topY + 4.8);
    doc.text("VALOR", pageWidth - margin - 2, topY + 4.8, { align: "right" });
    return topY + 7;
  };

  y = drawTableHeader(y);

  expenses.forEach((item, idx) => {
    if (y > pageHeight - 18) {
      doc.addPage();
      y = 16;
      y = drawTableHeader(y);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(250, 249, 247);
      doc.rect(margin, y, contentWidth, 6.5, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 19);

    const nameClipped =
      item.name.length > 34 ? item.name.slice(0, 32) + "…" : item.name;
    const catClipped =
      item.category.length > 18
        ? item.category.slice(0, 16) + "…"
        : item.category;
    const qtyStr = formatQty(item.quantity, item.unit);
    const pmStr =
      item.status === "pagado" ? item.paymentMethod || "—" : "Pendiente";
    const valStr =
      item.status === "pagado" ? formatCOP(item.amount) : "Pendiente";

    doc.text(nameClipped, margin + 2, y + 4.5);
    doc.setTextColor(107, 105, 99);
    doc.text(catClipped, margin + 62, y + 4.5);
    doc.text(qtyStr, margin + 96, y + 4.5);
    doc.text(pmStr.slice(0, 16), margin + 118, y + 4.5);

    if (item.status === "pagado") {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 19);
    } else {
      doc.setTextColor(184, 93, 59);
    }
    doc.text(valStr, pageWidth - margin - 2, y + 4.5, { align: "right" });

    doc.setDrawColor(226, 224, 218);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    y += 6.5;
  });

  // Numeración de páginas
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(158, 155, 147);
    doc.text(
      `Página ${p} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`${slugify(project.name)}-${fileDate}.pdf`);
}

export function exportBackupJSON(
  project: ProjectConfig,
  expenses: ExpenseItem[]
) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    expenses,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(project.name)}-respaldo.json`;
  a.click();
  URL.revokeObjectURL(url);
}
