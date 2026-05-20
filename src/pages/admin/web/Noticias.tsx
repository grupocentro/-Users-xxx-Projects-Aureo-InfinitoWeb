import { Newspaper } from "lucide-react";
import { PhasePlaceholder } from "@/components/admin/PhasePlaceholder";

export default function Noticias() {
  return (
    <PhasePlaceholder
      title="Noticias"
      description="El CRUD completo de noticias estará disponible en la próxima fase. La tabla ya está creada en la base de datos y lista para recibir contenido."
      icon={Newspaper}
      badge="Fase 3"
    />
  );
}
