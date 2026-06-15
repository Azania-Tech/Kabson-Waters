import type { ReactNode } from "react";
import { KwIcon, type KwIconName } from "./icons";

type Tone = "blue" | "sky" | "cyan" | "emerald" | "amber" | "rose" | "violet" | "indigo" | "slate";

const toneStyles: Record<Tone, { card: string; icon: string; value: string }> = {
  blue:    { card: "metric-tone-blue",    icon: "bg-blue-100 text-blue-600",    value: "text-blue-700" },
  sky:     { card: "metric-tone-sky",     icon: "bg-sky-100 text-sky-600",      value: "text-sky-700" },
  cyan:    { card: "metric-tone-cyan",    icon: "bg-cyan-100 text-cyan-600",    value: "text-cyan-700" },
  emerald: { card: "metric-tone-emerald", icon: "bg-emerald-100 text-emerald-600", value: "text-emerald-700" },
  amber:   { card: "metric-tone-amber",   icon: "bg-amber-100 text-amber-600",  value: "text-amber-700" },
  rose:    { card: "metric-tone-rose",    icon: "bg-rose-100 text-rose-600",    value: "text-rose-700" },
  violet:  { card: "metric-tone-violet",  icon: "bg-violet-100 text-violet-600", value: "text-violet-700" },
  indigo:  { card: "metric-tone-indigo",  icon: "bg-indigo-100 text-indigo-600", value: "text-indigo-700" },
  slate:   { card: "metric-tone-slate",   icon: "bg-slate-100 text-slate-600",  value: "text-slate-700" },
};

export function PageLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`page-body page-stack fade-in ${wide ? "max-w-[1600px]" : ""}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  tone = "blue",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tone?: Tone;
}) {
  const eyebrowColors: Record<Tone, string> = {
    blue: "text-blue-600", sky: "text-sky-600", cyan: "text-cyan-600",
    emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600",
    violet: "text-violet-600", indigo: "text-indigo-600", slate: "text-slate-600",
  };
  return (
    <div className="page-header">
      <div className="min-w-0">
        <p className={`section-label mb-1.5 ${eyebrowColors[tone]}`}>{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: KwIconName;
}) {
  const s = toneStyles[tone];
  return (
    <div className={`metric-card ${s.card}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="metric-label">{label}</p>
        {icon && (
          <span className={`metric-icon ${s.icon}`}>
            <KwIcon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className={`metric-value num ${s.value}`}>{value}</p>
      {sub && <p className="metric-sub">{sub}</p>}
    </div>
  );
}

export function MetricGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const cls = cols === 2 ? "metric-grid-2" : cols === 3 ? "metric-grid-3" : cols === 5 ? "metric-grid-5" : "metric-grid-4";
  return <div className={`metric-grid ${cls}`}>{children}</div>;
}

export function Panel({
  title,
  eyebrow,
  children,
  actions,
  className,
  padding = true,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section className={`panel ${className ?? ""}`}>
      {(title || eyebrow || actions) && (
        <div className={`panel-head ${padding ? "" : "px-6 pt-6"}`}>
          <div>
            {eyebrow && <p className="section-label mb-1">{eyebrow}</p>}
            {title && <h2 className="panel-title">{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      <div className={padding ? "panel-body" : ""}>{children}</div>
    </section>
  );
}

export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: KwIconName }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="tabs-root flex-wrap">
      {tabs.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`tab ${active === key ? "active" : ""}`}
        >
          {icon && <KwIcon name={icon} size={16} />}
          {label}
        </button>
      ))}
    </div>
  );
}

export function AlertBanner({
  tone = "amber",
  children,
}: {
  tone?: "amber" | "emerald" | "rose" | "blue";
  children: ReactNode;
}) {
  const styles = {
    amber: "alert-banner alert-amber",
    emerald: "alert-banner alert-emerald",
    rose: "alert-banner alert-rose",
    blue: "alert-banner alert-blue",
  };
  return <div className={styles[tone]}>{children}</div>;
}
