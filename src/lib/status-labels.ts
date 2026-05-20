// Etiquetas centralizadas para estados de la app.
// Mantiene consistencia visual y textual entre Ventas, Tickets, Validaciones
// y Reportes (incluyendo exports CSV/PDF).

export type EstadoCompra = "aprobado" | "pendiente" | "rechazado" | "payment_mismatch";
export type ResultadoValidacion =
  | "valido"
  | "ya_usado"
  | "no_encontrado"
  | "compra_no_aprobada"
  | "fecha_invalida"
  | "error";

const COMPRA_LABELS: Record<EstadoCompra, string> = {
  aprobado:         "Aprobado",
  pendiente:        "Pendiente",
  rechazado:        "Rechazado",
  payment_mismatch: "En revisión",
};

const VALIDACION_LABELS: Record<ResultadoValidacion, string> = {
  valido:             "Válido",
  ya_usado:           "Ya usado",
  fecha_invalida:     "Fecha inválida",
  no_encontrado:      "No encontrado",
  compra_no_aprobada: "Compra no aprobada",
  error:              "Error",
};

export function statusLabel(kind: "compra" | "validacion", value: string): string {
  const map = kind === "compra" ? COMPRA_LABELS : VALIDACION_LABELS;
  return (map as Record<string, string>)[value] ?? value;
}
