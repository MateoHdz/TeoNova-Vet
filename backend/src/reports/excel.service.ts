import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

const SLATE = '1e293b';
const WHITE = 'ffffff';
const GRAY_BG = 'f8fafc';
const GRAY_BORDER = 'cbd5e1';
const GREEN_TEXT = '047857';
const GREEN_BG = 'ecfdf5';
const RED_TEXT = 'b91c1c';
const RED_BG = 'fef2f2';

const methodLabels: any = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '🏦 Transferencia',
  other: 'Otro'
};

@Injectable()
export class ExcelService {
  async generateReport(data: any): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'VetPOS';
    wb.modified = new Date();

    this.buildResumenFinanciero(wb, data);
    this.buildDetalleMovimientos(wb, data);
    this.buildTopProductos(wb, data);
    this.buildMetodosPago(wb, data);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ── Helper: Aplicar estilo de fuente general ─────────────────
  private applyBaseStyles(ws: ExcelJS.Worksheet) {
    ws.views = [{ showGridLines: true }];
    ws.eachRow(row => {
      row.eachCell(cell => {
        if (!cell.font) {
          cell.font = { name: 'Segoe UI', size: 10 };
        }
      });
    });
  }

  // ── Helper: Crear fila de cabecera moderna ───────────────────
  private createHeader(ws: ExcelJS.Worksheet, cols: { header: string; key: string; width?: number }[]) {
    ws.columns = cols.map(c => ({
      header: c.header,
      key: c.key,
      width: c.width || 12
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: WHITE }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: SLATE } }
      };
    });
  }

  // ── Helper: Auto-ajustar ancho de columnas ───────────────────
  private autofit(ws: ExcelJS.Worksheet) {
    ws.columns.forEach(column => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const val = cell.value;
        if (val !== null && val !== undefined) {
          let str = '';
          if (typeof val === 'number') {
            // Estimado de longitud formateado como moneda: $1.000.000 (aprox. 12 car.)
            str = `$${val.toLocaleString('es-CO')}`;
          } else {
            str = String(val);
          }
          if (str.length > maxLen) maxLen = str.length;
        }
      });
      column.width = Math.max(maxLen + 4, 12);
    });
  }

  // ── Hoja 1: Resumen Financiero ──────────────────────────────
  private buildResumenFinanciero(wb: ExcelJS.Workbook, data: any) {
    const ws = wb.addWorksheet('📊 Resumen Financiero');
    const { summary, from, to } = data;

    // Titulo Principal
    ws.mergeCells('A1:C1');
    const title = ws.getCell('A1');
    title.value = 'REPORTE FINANCIERO Y CONTABLE';
    title.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: WHITE } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // Subtitulo / Rango de fechas
    ws.mergeCells('A2:C2');
    const sub = ws.getCell('A2');
    sub.value = `Periodo del reporte: ${from} al ${to}`;
    sub.font = { name: 'Segoe UI', italic: true, size: 11, color: { argb: SLATE } };
    sub.alignment = { horizontal: 'center', vertical: 'middle' };
    sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_BG } };
    ws.getRow(2).height = 24;

    // Tarjetas de Datos KPIs (Layout de Control Contable)
    const netRevenue = Number(summary.totalRevenue || 0);
    const netExpenses = Number(summary.totalExpenses || 0);
    const netUtility = netRevenue - netExpenses;

    const items = [
      { label: 'INGRESOS TOTALES (VENTAS)', val: netRevenue, isMoney: true, bg: GREEN_BG, text: GREEN_TEXT },
      { label: 'EGRESOS TOTALES (GASTOS)', val: netExpenses, isMoney: true, bg: RED_BG, text: RED_TEXT },
      {
        label: 'UTILIDAD NETA DEL PERIODO',
        val: netUtility,
        isMoney: true,
        bg: netUtility >= 0 ? GREEN_BG : RED_BG,
        text: netUtility >= 0 ? GREEN_TEXT : RED_TEXT,
        isBold: true
      },
      { label: 'CANTIDAD DE VENTAS REALIZADAS', val: Number(summary.totalSales || 0), isMoney: false },
      { label: 'DESCUENTOS OTORGADOS', val: Number(summary.totalDiscounts || 0), isMoney: true },
      { label: 'FECHA DE GENERACIÓN', val: new Date().toLocaleDateString('es-CO'), isMoney: false }
    ];

    ws.addRow([]); // Espacio

    items.forEach((item, idx) => {
      const r = ws.addRow([item.label, '', item.val]);
      r.height = 26;
      ws.mergeCells(`A${r.number}:B${r.number}`);

      const labelCell = r.getCell(1);
      const valCell = r.getCell(3);

      labelCell.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: item.isBold ? item.text : SLATE } };
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      valCell.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: item.text || SLATE } };
      valCell.alignment = { vertical: 'middle', horizontal: 'right' };

      if (item.isMoney) {
        valCell.numFmt = '"$"#,##0';
      }

      // Aplicar bordes y fondos
      const cellFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: item.bg || (idx % 2 === 0 ? GRAY_BG : WHITE) }
      };

      labelCell.fill = cellFill;
      r.getCell(2).fill = cellFill;
      valCell.fill = cellFill;

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: GRAY_BORDER } },
        bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
        left: { style: 'thin', color: { argb: GRAY_BORDER } },
        right: { style: 'thin', color: { argb: GRAY_BORDER } }
      };

      labelCell.border = borderStyle;
      r.getCell(2).border = borderStyle;
      valCell.border = borderStyle;
    });

    ws.getColumn('A').width = 28;
    ws.getColumn('B').width = 8;
    ws.getColumn('C').width = 24;

    this.applyBaseStyles(ws);
  }

  // ── Hoja 2: Detalle de Movimientos (Unificado) ────────────────
  private buildDetalleMovimientos(wb: ExcelJS.Workbook, data: any) {
    const ws = wb.addWorksheet('💸 Detalle de Movimientos');
    const { sales, expenses } = data;

    // Unificar movimientos
    const movements: any[] = [];

    (sales || []).forEach((s: any) => {
      const soldAt = new Date(s.soldAt);
      const dateStr = s.soldAt ? new Date(s.soldAt).toISOString().split('T')[0] : '';
      const timeStr = s.soldAt ? new Date(s.soldAt).toTimeString().slice(0, 5) : '';
      const itemsList = s.items && s.items.length > 0
        ? s.items.map((i: any) => `${i.description} (x${Math.round(i.quantity)})`).join(', ')
        : 'Sin artículos';
      movements.push({
        date: dateStr,
        time: timeStr,
        type: 'Venta',
        description: `Cliente: ${s.customer?.name || 'Cliente general'} (${itemsList})`,
        category: 'Ventas del sistema',
        method: methodLabels[s.paymentMethod] || s.paymentMethod,
        entry: Number(s.total || 0),
        exit: 0,
        user: s.user?.name || '—',
        notes: s.notes || ''
      });
    });

    (expenses || []).forEach((e: any) => {
      const dateStr = e.date ? new Date(e.date).toISOString().split('T')[0] : '';
      const timeStr = e.createdAt ? new Date(e.createdAt).toTimeString().slice(0, 5) : '';
      movements.push({
        date: dateStr,
        time: timeStr,
        type: 'Gasto',
        description: e.description,
        category: e.category,
        method: '💵 Efectivo',
        entry: 0,
        exit: Number(e.amount || 0),
        user: e.user?.name || '—',
        notes: e.notes || ''
      });
    });

    // Ordenar por fecha y hora descendente
    movements.sort((a, b) => {
      const dtA = `${a.date}T${a.time}`;
      const dtB = `${b.date}T${b.time}`;
      return dtB.localeCompare(dtA);
    });

    // Definición de columnas
    this.createHeader(ws, [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Hora', key: 'time', width: 10 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Descripción', key: 'description', width: 32 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Método de Pago', key: 'method', width: 18 },
      { header: 'Entrada (Ingreso)', key: 'entry', width: 18 },
      { header: 'Salida (Egreso)', key: 'exit', width: 18 },
      { header: 'Responsable', key: 'user', width: 20 },
      { header: 'Observaciones', key: 'notes', width: 28 }
    ]);

    let totalEntries = 0;
    let totalExits = 0;

    movements.forEach((m, idx) => {
      const r = ws.addRow(m);
      r.height = 22;

      totalEntries += m.entry;
      totalExits += m.exit;

      // Estilo celdas individuales
      const isZebra = idx % 2 === 0;
      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = {
          bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
          left: { style: 'thin', color: { argb: GRAY_BORDER } },
          right: { style: 'thin', color: { argb: GRAY_BORDER } }
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZebra ? GRAY_BG : WHITE } };

        // Alineación
        if ([1, 2, 3, 5, 6].includes(colNum)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      // Resaltado de entradas y salidas
      const entryCell = r.getCell('G');
      const exitCell = r.getCell('H');

      entryCell.numFmt = '"$"#,##0';
      exitCell.numFmt = '"$"#,##0';
      entryCell.alignment = { horizontal: 'right', vertical: 'middle' };
      exitCell.alignment = { horizontal: 'right', vertical: 'middle' };

      if (m.entry > 0) {
        entryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };
        entryCell.font = { name: 'Segoe UI', bold: true, color: { argb: GREEN_TEXT } };
      } else {
        entryCell.font = { name: 'Segoe UI', color: { argb: '9ca3af' } }; // Gris claro para cero
      }

      if (m.exit > 0) {
        exitCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } };
        exitCell.font = { name: 'Segoe UI', bold: true, color: { argb: RED_TEXT } };
      } else {
        exitCell.font = { name: 'Segoe UI', color: { argb: '9ca3af' } }; // Gris claro para cero
      }
    });

    // Agregar Fila de Totales
    ws.addRow({}); // fila espaciadora
    const totalsRow = ws.addRow({
      description: 'TOTALES ACUMULADOS',
      entry: totalEntries,
      exit: totalExits
    });
    totalsRow.height = 24;
    totalsRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: WHITE }, size: 10.5 };
      cell.border = {
        top: { style: 'medium', color: { argb: SLATE } },
        bottom: { style: 'double', color: { argb: WHITE } }
      };
    });

    const totEntryCell = totalsRow.getCell('G');
    const totExitCell = totalsRow.getCell('H');

    totEntryCell.numFmt = '"$"#,##0';
    totExitCell.numFmt = '"$"#,##0';
    totEntryCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totExitCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Fila de Utilidad
    const utilityRow = ws.addRow({
      description: 'UTILIDAD NETA ACUMULADA',
      entry: totalEntries - totalExits
    });
    utilityRow.height = 24;
    ws.mergeCells(`G${utilityRow.number}:H${utilityRow.number}`);

    const uLabel = utilityRow.getCell('D');
    uLabel.value = 'UTILIDAD NETA ACUMULADA';
    uLabel.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: (totalEntries - totalExits) >= 0 ? GREEN_TEXT : RED_TEXT } };
    
    const uVal = utilityRow.getCell('G');
    uVal.value = totalEntries - totalExits;
    uVal.numFmt = '"$"#,##0';
    uVal.font = { name: 'Segoe UI', bold: true, size: 12, color: { argb: (totalEntries - totalExits) >= 0 ? GREEN_TEXT : RED_TEXT } };
    uVal.alignment = { horizontal: 'center', vertical: 'middle' };

    const uBg = (totalEntries - totalExits) >= 0 ? GREEN_BG : RED_BG;
    utilityRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: uBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: GRAY_BORDER } },
        bottom: { style: 'medium', color: { argb: GRAY_BORDER } }
      };
    });

    this.autofit(ws);
    this.applyBaseStyles(ws);
  }

  // ── Hoja 3: Top Productos (Performance) ─────────────────────
  private buildTopProductos(wb: ExcelJS.Workbook, data: any) {
    const ws = wb.addWorksheet('🏆 Rendimiento de Productos');
    const { topProducts } = data;

    this.createHeader(ws, [
      { header: 'Ranking', key: 'rank', width: 10 },
      { header: 'Producto / Servicio', key: 'name', width: 35 },
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Unidades Vendidas', key: 'qty', width: 18 },
      { header: 'Ingresos Totales', key: 'revenue', width: 20 },
      { header: 'Ganancia Estimada', key: 'profit', width: 20 }
    ]);

    let totalRevenue = 0;
    let totalProfit = 0;

    (topProducts || []).forEach((p: any, i: number) => {
      const isZebra = i % 2 === 0;
      const r = ws.addRow({
        rank: i + 1,
        name: p.name,
        type: p.type === 'service' ? '💇 Servicio' : '📦 Producto',
        qty: Number(p.totalQty || 0),
        revenue: Number(p.totalRevenue || 0),
        profit: Number(p.totalProfit || 0)
      });
      r.height = 22;

      totalRevenue += Number(p.totalRevenue || 0);
      totalProfit += Number(p.totalProfit || 0);

      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZebra ? GRAY_BG : WHITE } };
        cell.border = { bottom: { style: 'thin', color: { argb: GRAY_BORDER } } };
        
        if (colNum === 1 || colNum === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNum >= 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '"$"#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    ws.addRow({}); // Espacio
    const totRow = ws.addRow({ name: 'TOTALES ACUMULADOS', revenue: totalRevenue, profit: totalProfit });
    totRow.height = 24;
    totRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: WHITE } };
      if (colNum >= 5) {
        cell.numFmt = '"$"#,##0';
      }
    });

    this.autofit(ws);
    this.applyBaseStyles(ws);
  }

  // ── Hoja 4: Métodos de Pago ────────────────────────────────
  private buildMetodosPago(wb: ExcelJS.Workbook, data: any) {
    const ws = wb.addWorksheet('💳 Métodos de Pago');
    const { paymentMethods } = data;

    this.createHeader(ws, [
      { header: 'Método de Pago', key: 'method', width: 22 },
      { header: 'Transacciones', key: 'count', width: 16 },
      { header: 'Total Recaudado', key: 'total', width: 22 },
      { header: 'Participación', key: 'pct', width: 16 }
    ]);

    const grandTotal = (paymentMethods || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0);
    const grandCount = (paymentMethods || []).reduce((s: number, p: any) => s + Number(p.count || 0), 0);

    (paymentMethods || []).forEach((p: any, i: number) => {
      const pct = grandTotal > 0 ? ((Number(p.total || 0) / grandTotal) * 100).toFixed(1) + '%' : '0%';
      const isZebra = i % 2 === 0;
      const r = ws.addRow({
        method: methodLabels[p.method] || p.method,
        count: Number(p.count || 0),
        total: Number(p.total || 0),
        pct
      });
      r.height = 22;

      r.eachCell((cell, colNum) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZebra ? GRAY_BG : WHITE } };
        cell.border = { bottom: { style: 'thin', color: { argb: GRAY_BORDER } } };

        if (colNum === 1 || colNum === 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 2) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNum === 3) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '"$"#,##0';
        }
      });
    });

    ws.addRow({});
    const totRow = ws.addRow({
      method: 'TOTAL GENERAL',
      count: grandCount,
      total: grandTotal,
      pct: '100%'
    });
    totRow.height = 24;
    totRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: WHITE } };
      if (colNum === 3) {
        cell.numFmt = '"$"#,##0';
      }
    });

    this.autofit(ws);
    this.applyBaseStyles(ws);
  }
}
