import Papa from "papaparse";

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

interface ExportCsvOptions {
  filename: string;
  rows: CsvRow[];
  headers?: Record<string, string>; // map de key → label legible
}

// Convierte filas a CSV y dispara descarga en el navegador.
// Maneja BOM UTF-8 para que Excel abra acentos correctamente.
export function exportToCsv({ filename, rows, headers }: ExportCsvOptions): void {
  if (rows.length === 0) {
    throw new Error("No hay datos para exportar");
  }

  // Aplicar el mapping de headers si está provisto
  const data = headers
    ? rows.map((row) => {
        const renamed: CsvRow = {};
        for (const [key, label] of Object.entries(headers)) {
          renamed[label] = row[key];
        }
        return renamed;
      })
    : rows;

  const csv = Papa.unparse(data, {
    quotes: true,
    delimiter: ",",
    newline: "\r\n",
  });

  // BOM para Excel
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper: genera nombre de archivo con timestamp.
export function csvFilename(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${prefix}_${ts}.csv`;
}
