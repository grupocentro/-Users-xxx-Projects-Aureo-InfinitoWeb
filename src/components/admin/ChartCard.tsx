import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  height?: number;
  children: ReactNode;
}

export function ChartCard({ title, description, action, height = 280, children }: ChartCardProps) {
  return (
    <Card className="overflow-hidden border-water-100">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-water-800">{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-app-muted">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}
