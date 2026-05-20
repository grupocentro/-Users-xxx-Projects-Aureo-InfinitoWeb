import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "card" | "inline";
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, variant = "card" }: EmptyStateProps) {
  const wrapper =
    variant === "card"
      ? "flex flex-col items-center justify-center gap-3 rounded-2xl border border-water-100 bg-gradient-to-br from-white via-water-50/30 to-white px-6 py-12 text-center"
      : "flex flex-col items-center justify-center gap-3 px-4 py-10 text-center";
  return (
    <div className={wrapper}>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-water-100/60 text-water-600">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-water-800">{title}</p>
      {description && <p className="max-w-md text-sm text-app-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
