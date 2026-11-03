import { forwardRef } from 'react';

export const Field = ({ label, error, hint, children, className = '', htmlFor }) => (
  <div className={className}>
    {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
    {children}
    {error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-brand-900/50">{hint}</p> : null}
  </div>
);

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input ${className}`} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`input min-h-[84px] resize-y ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%230B3B2E%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`} {...props}>
      {children}
    </select>
  );
});
