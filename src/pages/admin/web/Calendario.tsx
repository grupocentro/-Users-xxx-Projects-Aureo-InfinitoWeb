import { CalendarDays } from "lucide-react";
import { PhasePlaceholder } from "@/components/admin/PhasePlaceholder";

export default function Calendario() {
  return (
    <PhasePlaceholder
      title="Calendario"
      description="La vista de calendario con etiquetas y modificadores de precio estará disponible en la próxima fase. La tabla ya está creada en la base de datos."
      icon={CalendarDays}
      badge="Fase 3"
    />
  );
}
