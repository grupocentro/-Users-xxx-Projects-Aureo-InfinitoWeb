import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Cargando...", className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className ?? ""}`}>
      <Loader2 className="h-7 w-7 animate-spin text-water-500" />
      <p className="text-sm text-app-muted">{message}</p>
    </div>
  );
}
