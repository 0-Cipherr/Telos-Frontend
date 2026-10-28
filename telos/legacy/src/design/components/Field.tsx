import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  meta?: ReactNode;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, meta, hint, children }: FieldProps) {
  return (
    <div className="tl-field">
      <div className="tl-field__head">
        <label htmlFor={htmlFor}>{label}</label>
        {meta ? <span>{meta}</span> : null}
      </div>
      {children}
      {hint ? <p className="tl-field__hint">{hint}</p> : null}
    </div>
  );
}

type SelectProps = {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

export function Select({ id, value, options, onChange }: SelectProps) {
  return (
    <div className="tl-select-wrap">
      <select
        id={id}
        className="tl-input tl-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="tl-select-arrow" aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

type PanelBarProps = {
  label: string;
  meta?: string;
};

export function PanelBar({ label, meta }: PanelBarProps) {
  return (
    <div className="tl-panel__bar">
      <span className="tl-label">{label}</span>
      {meta ? <span className="tl-panel__meta">{meta}</span> : null}
    </div>
  );
}
