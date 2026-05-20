import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "admin" | "editor" | "control_entradas";

// Prioridad de roles (de mayor a menor privilegio).
// Si un usuario tiene varios roles asignados en user_roles, el hook devuelve
// el de mayor prioridad. La tabla `user_roles` tiene UNIQUE(user_id, role) — no
// UNIQUE(user_id) — así que múltiples filas por usuario son técnicamente
// válidas. Antes de este fix, .maybeSingle() rompía silenciosamente con N>1
// y dejaba al usuario sin rol.
const ROLE_PRIORITY: readonly AppRole[] = ["admin", "editor", "control_entradas"];

function getHighestRole(roles: AppRole[]): AppRole | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return null;
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        // Log controlado: no exponemos detalles al usuario, pero queda traza
        // para debug. No usamos toast porque este hook corre en muchas pantallas.
        console.error("useUserRole: error al leer user_roles", error.message);
        setRole(null);
      } else {
        const roles = (data ?? []).map((r) => r.role as AppRole);
        setRole(getHighestRole(roles));
      }
      setLoading(false);
    };

    fetchRole();
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isStaff: role === "control_entradas",
    isAdminOrEditor: role === "admin" || role === "editor",
    loading: authLoading || loading,
  };
}
