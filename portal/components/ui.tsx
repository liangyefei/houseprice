import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = '' }: Props) {
  return <section className={`portal-card rounded-[2rem] p-6 sm:p-8 ${className}`}>{children}</section>;
}

export function PanelTitle({ children, className = '' }: Props) {
  return <h2 className={`text-2xl font-semibold text-white ${className}`}>{children}</h2>;
}

export function PanelLead({ children, className = '' }: Props) {
  return <p className={`mt-1 text-sm text-slate-300 ${className}`}>{children}</p>;
}

export function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function TextField({ label, error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-100">{label}</span>
      <input
        {...props}
        className="portal-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition placeholder:text-slate-500"
      />
      {error ? <span className="mt-2 block text-xs text-red-300">{error}</span> : <span className="mt-2 block text-xs text-transparent">.</span>}
    </label>
  );
}

export function SelectField({ label, error, children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-100">{label}</span>
      <select {...props} className="portal-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition">
        {children}
      </select>
      {error ? <span className="mt-2 block text-xs text-red-300">{error}</span> : <span className="mt-2 block text-xs text-transparent">.</span>}
    </label>
  );
}