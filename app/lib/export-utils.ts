import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import type { ExpenseItem, ProjectConfig } from "./types";
import {
  ARCHITECTURAL_PALETTE,
  KIND_COLORS,
  formatCOP,
  formatPaymentBadge,
  formatQty,
} from "./initial-data";

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

interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

function renderDonutChartBase64(
  title: string,
  slices: ChartSlice[]
): string | null {
  if (typeof document === "undefined") return null;
  const valid = slices.filter((s) => s.value > 0);
  const total = valid.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const width = 560;
  const height = 280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fondo blanco con borde arquitectónico
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#E2E0DA";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Título
  ctx.fillStyle = "#6B6963";
  ctx.font = "600 12px sans-serif";
  ctx.fillText(title.toUpperCase(), 20, 28);

  // Donut
  const cx = 125;
  const cy = 155;
  const outerR = 82;
  const innerR = 50;
  let startAngle = -Math.PI / 2;

  valid.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += angle;
  });

  // Centro hueco
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.fillStyle = "#6B6963";
  ctx.font = "500 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TOTAL", cx, cy - 6);

  ctx.fillStyle = "#141413";
  ctx.font = "700 13px monospace";
  ctx.fillText(formatCOP(total), cx, cy + 12);
  ctx.textAlign = "left";

  // Leyenda derecha
  let ly = 64;
  valid.slice(0, 7).forEach((slice) => {
    const pct = ((slice.value / total) * 100).toFixed(0);
    ctx.fillStyle = slice.color;
    ctx.fillRect(245, ly - 9, 10, 10);

    ctx.fillStyle = "#141413";
    ctx.font = "500 12px sans-serif";
    const label =
      slice.label.length > 18 ? slice.label.slice(0, 16) + "…" : slice.label;
    ctx.fillText(label, 263, ly);

    ctx.fillStyle = "#141413";
    ctx.font = "600 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${formatCOP(slice.value)} (${pct}%)`, width - 20, ly);
    ctx.textAlign = "left";

    ly += 28;
  });

  return canvas.toDataURL("image/png").split(",")[1] ?? null;
}

function renderBarChartBase64(
  title: string,
  items: ChartSlice[]
): string | null {
  if (typeof document === "undefined") return null;
  const valid = items.filter((s) => s.value > 0);
  const total = valid.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const width = 560;
  const height = 280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#E2E0DA";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = "#6B6963";
  ctx.font = "600 12px sans-serif";
  ctx.fillText(title.toUpperCase(), 20, 28);

  let y = 58;
  const barMaxWidth = width - 40;
  valid.slice(0, 6).forEach((item) => {
    const pct = (item.value / total) * 100;
    ctx.fillStyle = "#141413";
    ctx.font = "600 12px sans-serif";
    ctx.fillText(item.label, 20, y);

    ctx.font = "600 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${formatCOP(item.value)} (${pct.toFixed(0)}%)`, width - 20, y);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ECEAE4";
    ctx.fillRect(20, y + 6, barMaxWidth, 10);

    ctx.fillStyle = item.color;
    ctx.fillRect(20, y + 6, (barMaxWidth * pct) / 100, 10);

    y += 35;
  });

  return canvas.toDataURL("image/png").split(",")[1] ?? null;
}

export async function exportToExcel(
  project: ProjectConfig,
  expenses: ExpenseItem[]
) {
  const totals = computeTotals(expenses);
  const today = new Date().toISOString().slice(0, 10);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Obra";
  wb.created = new Date();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E0DA" } },
    left: { style: "thin", color: { argb: "FFE2E0DA" } },
    bottom: { style: "thin", color: { argb: "FFE2E0DA" } },
    right: { style: "thin", color: { argb: "FFE2E0DA" } },
  };

  // ============================================================================
  // HOJA 1: DETALLE DE GASTOS (CON FILTROS Y SUBTOTAL DINÁMICO)
  // ============================================================================
  const wsDetail = wb.addWorksheet("Detalle de Gastos", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  wsDetail.mergeCells("A1:K1");
  const titleCell = wsDetail.getCell("A1");
  titleCell.value = `${project.name} — DETALLE DE GASTOS`;
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFF6F5F2" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF141413" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  wsDetail.getRow(1).height = 30;

  wsDetail.mergeCells("A2:E2");
  wsDetail.getCell("A2").value = `Generado el ${today} · Usa los filtros de la fila 4 para analizar por medio, titular o categoría`;
  wsDetail.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: "FF6B6963" } };

  const lastDataRow = Math.max(5, 4 + expenses.length);
  wsDetail.getCell("E3").value = "TOTAL FILTRADO:";
  wsDetail.getCell("E3").font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF6B6963" } };
  wsDetail.getCell("E3").alignment = { horizontal: "right", vertical: "middle" };

  const subtotalCell = wsDetail.getCell("F3");
  subtotalCell.value = { formula: `SUBTOTAL(109,F5:F${lastDataRow})` };
  subtotalCell.numFmt = '"$ "#,##0';
  subtotalCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF141413" } };
  subtotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECEAE4" } };
  subtotalCell.border = thinBorder;
  wsDetail.getRow(3).height = 24;

  const headers = [
    "Categoría",
    "Rubro",
    "Ítem",
    "Cantidad",
    "Unidad",
    "Valor (COP)",
    "Medio de Pago",
    "Titular",
    "Estado",
    "Fecha",
    "Nota",
  ];

  const headerRow = wsDetail.getRow(4);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFF6F5F2" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C4A52" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 5 || idx === 3 ? "right" : "left",
    };
  });

  // AutoFilter en fila 4
  wsDetail.autoFilter = "A4:K4";

  expenses.forEach((item, index) => {
    const rowIdx = 5 + index;
    const row = wsDetail.getRow(rowIdx);
    row.height = 22;
    const isPaid = item.status === "pagado";

    const values = [
      item.category,
      item.kind,
      item.name,
      item.quantity ?? null,
      item.unit,
      isPaid ? item.amount : 0,
      isPaid ? item.paymentMethod || "—" : "—",
      isPaid ? item.paymentOwner || "Propio" : "—",
      isPaid ? "Pagado" : "Pendiente",
      item.date,
      item.note ?? "",
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: colIdx === 5 && isPaid,
        color: {
          argb:
            colIdx === 8 && !isPaid
              ? "FFB85D3B"
              : "FF141413",
        },
      };
      if (index % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F5F2" } };
      }
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };

      if (colIdx === 3 && val !== null) {
        cell.numFmt = "#,##0.00";
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (colIdx === 5) {
        cell.numFmt = '"$ "#,##0';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
  });

  wsDetail.columns = [
    { width: 18 },
    { width: 15 },
    { width: 30 },
    { width: 11 },
    { width: 9 },
    { width: 17 },
    { width: 16 },
    { width: 16 },
    { width: 12 },
    { width: 13 },
    { width: 26 },
  ];

  // ============================================================================
  // HOJA 2: RESUMEN Y GRÁFICOS
  // ============================================================================
  const wsSummary = wb.addWorksheet("Resumen y Gráficos");
  wsSummary.views = [{ showGridLines: false }];

  wsSummary.mergeCells("A1:D1");
  const sumTitle = wsSummary.getCell("A1");
  sumTitle.value = `${project.name} — RESUMEN EJECUTIVO`;
  sumTitle.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFF6F5F2" } };
  sumTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF141413" } };
  sumTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  wsSummary.getRow(1).height = 32;

  wsSummary.getCell("A2").value = `Fecha de corte: ${today}`;
  wsSummary.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: "FF6B6963" } };

  const addSummarySection = (
    startRow: number,
    sectionTitle: string,
    rows: Array<{ label: string; value: number | { formula: string }; pct?: number; highlight?: boolean }>
  ) => {
    const hRow = wsSummary.getRow(startRow);
    hRow.height = 24;
    wsSummary.getCell(`A${startRow}`).value = sectionTitle;
    wsSummary.getCell(`B${startRow}`).value = "VALOR (COP)";
    wsSummary.getCell(`C${startRow}`).value = "%";

    ["A", "B", "C"].forEach((col, i) => {
      const c = wsSummary.getCell(`${col}${startRow}`);
      c.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFF6F5F2" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C4A52" } };
      c.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    });

    rows.forEach((r, idx) => {
      const curRow = startRow + 1 + idx;
      const rowObj = wsSummary.getRow(curRow);
      rowObj.height = 22;

      const cLabel = wsSummary.getCell(`A${curRow}`);
      const cVal = wsSummary.getCell(`B${curRow}`);
      const cPct = wsSummary.getCell(`C${curRow}`);

      cLabel.value = r.label;
      cVal.value = r.value;
      cVal.numFmt = '"$ "#,##0';
      cPct.value = r.pct !== undefined ? r.pct : null;
      if (r.pct !== undefined) cPct.numFmt = "0.0%";

      const bg = r.highlight
        ? "FF141413"
        : idx % 2 === 1
        ? "FFF6F5F2"
        : "FFFFFFFF";
      const fg = r.highlight ? "FFF6F5F2" : "FF141413";

      [cLabel, cVal, cPct].forEach((c, ci) => {
        c.font = {
          name: "Calibri",
          size: 10,
          bold: r.highlight || ci === 1,
          color: { argb: fg },
        };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = thinBorder;
        c.alignment = { vertical: "middle", horizontal: ci === 0 ? "left" : "right" };
      });
    });

    return startRow + rows.length + 2;
  };

  let nextRow = 4;
  const gt = totals.granTotal || 1;
  nextRow = addSummarySection(nextRow, "RESUMEN GENERAL", [
    {
      label: "Total Materiales",
      value: { formula: `SUMIFS('Detalle de Gastos'!F5:F${lastDataRow},'Detalle de Gastos'!B5:B${lastDataRow},"Materiales",'Detalle de Gastos'!I5:I${lastDataRow},"Pagado")` },
      pct: totals.granTotal > 0 ? totals.materiales / gt : 0,
    },
    {
      label: "Total Mano de Obra",
      value: { formula: `SUMIFS('Detalle de Gastos'!F5:F${lastDataRow},'Detalle de Gastos'!B5:B${lastDataRow},"Mano de Obra",'Detalle de Gastos'!I5:I${lastDataRow},"Pagado")` },
      pct: totals.granTotal > 0 ? totals.manoObra / gt : 0,
    },
    {
      label: "Total Transporte",
      value: { formula: `SUMIFS('Detalle de Gastos'!F5:F${lastDataRow},'Detalle de Gastos'!B5:B${lastDataRow},"Transporte",'Detalle de Gastos'!I5:I${lastDataRow},"Pagado")` },
      pct: totals.granTotal > 0 ? totals.transporte / gt : 0,
    },
    {
      label: "GRAN TOTAL",
      value: { formula: `SUM(B5:B7)` },
      pct: totals.granTotal > 0 ? 1 : 0,
      highlight: true,
    },
  ]);

  // Agrupaciones
  const categoryMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();
  const ownerMap = new Map<string, number>();

  for (const item of expenses) {
    if (item.status === "pagado" && item.amount > 0) {
      categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + item.amount);
      const pm = item.paymentMethod || "Otro";
      paymentMap.set(pm, (paymentMap.get(pm) ?? 0) + item.amount);
      const own = item.paymentOwner || "Propio";
      ownerMap.set(own, (ownerMap.get(own) ?? 0) + item.amount);
    }
  }

  const categoryEntries = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  const paymentEntries = Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1]);
  const ownerEntries = Array.from(ownerMap.entries()).sort((a, b) => b[1] - a[1]);

  if (categoryEntries.length > 0) {
    nextRow = addSummarySection(
      nextRow,
      "POR CATEGORÍA",
      categoryEntries.map(([label, val]) => ({
        label,
        value: val,
        pct: val / gt,
      }))
    );
  }

  if (paymentEntries.length > 0) {
    nextRow = addSummarySection(
      nextRow,
      "POR MEDIO DE PAGO",
      paymentEntries.map(([label, val]) => ({
        label,
        value: val,
        pct: val / gt,
      }))
    );
  }

  if (ownerEntries.length > 0) {
    addSummarySection(
      nextRow,
      "POR TITULAR (PROPIO VS TERCEROS)",
      ownerEntries.map(([label, val]) => ({
        label,
        value: val,
        pct: val / gt,
      }))
    );
  }

  wsSummary.columns = [
    { width: 32 },
    { width: 20 },
    { width: 10 },
    { width: 4 },
    { width: 16 },
  ];

  // Incrustar Gráficos PNG de alta resolución en columnas E..K
  const chartConfigs = [
    {
      b64: renderDonutChartBase64("Distribución por Rubro", [
        { label: "Materiales", value: totals.materiales, color: KIND_COLORS.Materiales },
        { label: "Mano de Obra", value: totals.manoObra, color: KIND_COLORS["Mano de Obra"] },
        { label: "Transporte", value: totals.transporte, color: KIND_COLORS.Transporte },
      ]),
      row: 3,
    },
    {
      b64: renderDonutChartBase64(
        "Distribución por Categoría",
        categoryEntries.map(([label, value], i) => ({
          label,
          value,
          color: ARCHITECTURAL_PALETTE[i % ARCHITECTURAL_PALETTE.length],
        }))
      ),
      row: 18,
    },
    {
      b64: renderBarChartBase64(
        "Por Medio de Pago",
        paymentEntries.map(([label, value], i) => ({
          label,
          value,
          color: ARCHITECTURAL_PALETTE[i % ARCHITECTURAL_PALETTE.length],
        }))
      ),
      row: 33,
    },
    {
      b64: renderDonutChartBase64(
        "Por Titular / Responsable",
        ownerEntries.map(([label, value], i) => ({
          label,
          value,
          color: label === "Propio" ? "#141413" : ARCHITECTURAL_PALETTE[(i + 1) % ARCHITECTURAL_PALETTE.length],
        }))
      ),
      row: 48,
    },
  ];

  chartConfigs.forEach((cfg) => {
    if (!cfg.b64) return;
    const imgId = wb.addImage({ base64: cfg.b64, extension: "png" });
    wsSummary.addImage(imgId, {
      tl: { col: 4, row: cfg.row },
      ext: { width: 480, height: 240 },
    });
  });

  // Descargar archivo .xlsx
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(project.name)}-${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
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

  const drawTableHeader = (topY: number) => {
    doc.setFillColor(236, 234, 228);
    doc.rect(margin, topY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 19);
    doc.text("ÍTEM", margin + 2, topY + 4.8);
    doc.text("CATEGORÍA", margin + 58, topY + 4.8);
    doc.text("CANT.", margin + 90, topY + 4.8);
    doc.text("MEDIO / TITULAR", margin + 110, topY + 4.8);
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
      item.name.length > 30 ? item.name.slice(0, 28) + "…" : item.name;
    const catClipped =
      item.category.length > 16
        ? item.category.slice(0, 14) + "…"
        : item.category;
    const qtyStr = formatQty(item.quantity, item.unit);
    const pmStr =
      item.status === "pagado"
        ? formatPaymentBadge(item.paymentMethod || "—", item.paymentOwner)
        : "Pendiente";
    const valStr =
      item.status === "pagado" ? formatCOP(item.amount) : "Pendiente";

    doc.text(nameClipped, margin + 2, y + 4.5);
    doc.setTextColor(107, 105, 99);
    doc.text(catClipped, margin + 58, y + 4.5);
    doc.text(qtyStr, margin + 90, y + 4.5);
    doc.text(pmStr.slice(0, 22), margin + 110, y + 4.5);

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
