import { type ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EstadoCompra, ResultadoValidacion } from "@/lib/status-labels";

interface StatusDef {
  label: string;
  classes: string;
  icon: typeof CheckCircle2;
}

const COMPRA_STATUS: Record<EstadoCompra, StatusDef> = {
  aprobado:         { label: "Aprobado",   classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pendiente:        { label: "Pendiente",  classes: "bg-amber-50 text-amber-700 border-amber-200",      icon: Clock },
  rechazado:        { label: "Rechazado",  classes: "bg-rose-50 text-rose-700 border-rose-200",         icon: XCircle },
  payment_mismatch: { label: "En revisión",classes: "bg-yellow-50 text-yellow-800 border-yellow-300",   icon: AlertTriangle },
};

const VALIDACION_STATUS: Record<ResultadoValidacion, StatusDef> = {
  valido:             { label: "Válido",              classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  ya_usado:           { label: "Ya usado",            classes: "bg-amber-50 text-amber-700 border-amber-200",      icon: AlertTriangle },
  fecha_invalida:     { label: "Fecha inválida",      classes: "bg-amber-50 text-amber-700 border-amber-200",      icon: Clock },
  no_encontrado:      { label: "No encontrado",       classes: "bg-rose-50 text-rose-700 border-rose-200",         icon: XCircle },
  compra_no_aprobada: { label: "Compra no aprobada",  classes: "bg-rose-50 text-rose-700 border-rose-200",         icon: Ban },
  error:              { label: "Error",               classes: "bg-rose-50 text-rose-700 border-rose-200",         icon: XCircle },
};

interface StatusBadgeProps {
  kind: "compra" | "validacion";
  value: string;
  fallback?: ReactNode;
}

export function StatusBadge({ kind, value, fallback }: StatusBadgeProps) {
  const map = kind === "compra" ? COMPRA_STATUS : VALIDACION_STATUS;
  const def = (map as Record<string, StatusDef>)[value];
  if (!def) return <Badge variant="secondary">{fallback ?? value}</Badge>;
  const Icon = def.icon;
  return (
    <Badge className={`${def.classes} gap-1 border font-medium`}>
      <Icon className="h-3 w-3" />
      {def.label}
    </Badge>
  );
}

