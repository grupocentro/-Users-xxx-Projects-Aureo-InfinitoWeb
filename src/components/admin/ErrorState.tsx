import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "No se pudo cargar la información",
  description = "Intentá nuevamente. Si el problema persiste, contactá al administrador.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 px-6 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-rose-700">{title}</p>
      <p className="max-w-md text-sm text-rose-600/80">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      )}
    </div>
  );
}
