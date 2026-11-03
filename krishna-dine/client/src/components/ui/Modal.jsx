import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-brand-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-3xl bg-white shadow-lift sm:animate-pop sm:rounded-3xl ${width}`}>
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-brand-950">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-brand-900/60">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="-mr-2 rounded-xl p-2 text-brand-900/60 hover:bg-cream-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-cream-200 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
