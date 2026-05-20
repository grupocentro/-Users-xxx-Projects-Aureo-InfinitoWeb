import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  loading?: boolean;
}

const VARIANT_BG: Record<NonNullable<MetricCardProps["variant"]>, string> = {
  default: "from-water-300 to-water-500",
  primary: "from-water-500 to-water-700",
  success: "from-emerald-400 to-emerald-600",
  warning: "from-amber-400 to-amber-600",
  danger:  "from-rose-400 to-rose-600",
};

export function MetricCard({ label, value, hint, icon: Icon, variant = "default", loading }: MetricCardProps) {
  return (
    <Card className="overflow-hidden border-water-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-app-muted">{label}</CardTitle>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${VARIANT_BG[variant]} text-white shadow-sm`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-water-100/60" />
        ) : (
          <div className="text-2xl font-bold text-water-800 sm:text-3xl">{value}</div>
        )}
        {hint && <p className="mt-1 text-xs text-app-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
}
