export interface ExportPdfOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  meta?: Record<string, string>; // info de cabecera (rango fechas, filtros, etc)
}

// Export PDF con jsPDF + autoTable. Lazy-loaded para no inflar el bundle inicial.
export async function exportToPdf({
  filename,
  title,
  subtitle,
  columns,
  rows,
  meta,
}: ExportPdfOptions): Promise<void> {
  if (rows.length === 0) {
    throw new Error("No hay datos para exportar");
  }

  // Lazy import: estos paquetes pesan ~250kb y sólo se cargan al primer export.
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Banda superior
  doc.setFillColor(2, 62, 138); // water-700
  doc.rect(0, 0, pageW, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Infinito Water Park", 40, 28);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Panel Ticketera", 40, 46);

  // Título del reporte (debajo de la banda)
  doc.setTextColor(3, 4, 94); // water-800
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 40, 90);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 100, 130);
    doc.text(subtitle, 40, 108);
  }

  // Meta info
  let yMeta = subtitle ? 124 : 108;
  if (meta && Object.keys(meta).length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    for (const [k, v] of Object.entries(meta)) {
      doc.text(`${k}: ${v}`, 40, yMeta);
      yMeta += 12;
    }
  }

  const generatedAt = new Date().toLocaleString("es-AR");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generado: ${generatedAt}`, pageW - 40, 28, { align: "right" });

  // Tabla
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: yMeta + 8,
    theme: "striped",
    headStyles: {
      fillColor: [0, 119, 182], // water-600
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: 40 },
    alternateRowStyles: { fillColor: [235, 248, 255] }, // water-50
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Página ${data.pageNumber} / ${pageCount}`,
        pageW - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: "right" },
      );
    },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// Helper: genera nombre de archivo con timestamp.
export function pdfFilename(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}_${ts}.pdf`;
}
