import { Tag } from "lucide-react";
import { PhasePlaceholder } from "@/components/admin/PhasePlaceholder";

export default function Ofertas() {
  return (
    <PhasePlaceholder
      title="Ofertas y promociones"
      description="El gestor de ofertas con vigencias y descuentos estará disponible en la próxima fase. La tabla ya está creada en la base de datos."
      icon={Tag}
      badge="Fase 3"
    />
  );
}
