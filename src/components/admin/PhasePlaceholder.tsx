import { type LucideIcon, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PhasePlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
}

export function PhasePlaceholder({ title, description, icon: Icon = Sparkles, badge }: PhasePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-water-800">{title}</h1>
        {badge && (
          <span className="rounded-full border border-water-200 bg-water-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-water-700">
            {badge}
          </span>
        )}
      </div>
      <Card className="overflow-hidden border-water-100 bg-gradient-to-br from-white via-water-50/40 to-white">
        <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-water-200 to-water-400 shadow-lg shadow-water-300/30">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-water-800">Próximamente</h2>
          <p className="max-w-md text-sm text-app-muted">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
