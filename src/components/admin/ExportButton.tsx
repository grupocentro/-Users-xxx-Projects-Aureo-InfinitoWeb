import { useState } from "react";
import { Download, FileText, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv, csvFilename, type CsvRow } from "@/lib/export-csv";
import { exportToPdf, pdfFilename, type ExportPdfOptions } from "@/lib/export-pdf";

interface ExportButtonProps {
  // Datos / formato
  filenamePrefix: string;
  title: string;             // título usado por el PDF
  subtitle?: string;
  meta?: Record<string, string>;
  // CSV
  csvHeaders: Record<string, string>; // map key → label (define orden y columnas)
  rows: CsvRow[];
  // Lo mostramos como botón secundario / primary
  disabled?: boolean;
}

export function ExportButton({
  filenamePrefix,
  title,
  subtitle,
  meta,
  csvHeaders,
  rows,
  disabled,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "csv" | "pdf">(null);

  const handleCsv = async () => {
    if (busy) return;
    setBusy("csv");
    try {
      exportToCsv({ filename: csvFilename(filenamePrefix), rows, headers: csvHeaders });
      toast({ title: "CSV generado", description: `${rows.length} filas exportadas` });
    } catch (err) {
      toast({
        title: "No se pudo exportar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (busy) return;
    setBusy("pdf");
    try {
      // Construimos rows en el orden definido por csvHeaders.
      const columns = Object.values(csvHeaders);
      const tableRows = rows.map((r) =>
        Object.keys(csvHeaders).map((k) => {
          const v = r[k];
          if (v === null || v === undefined) return "";
          return typeof v === "string" ? v : String(v);
        }),
      );
      const options: ExportPdfOptions = {
        filename: pdfFilename(filenamePrefix),
        title,
        subtitle,
        meta,
        columns,
        rows: tableRows,
      };
      await exportToPdf(options);
      toast({ title: "PDF generado", description: `${rows.length} filas exportadas` });
    } catch (err) {
      toast({
        title: "No se pudo exportar",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const isDisabled = disabled || busy !== null || rows.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="gap-2 rounded-xl border-water-200 bg-white hover:bg-water-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="text-sm font-medium text-water-700">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCsv} disabled={busy !== null} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span className="text-sm">CSV ({rows.length})</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf} disabled={busy !== null} className="gap-2">
          <FileText className="h-4 w-4 text-rose-600" />
          <span className="text-sm">PDF ({rows.length})</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
