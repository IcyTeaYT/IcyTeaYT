// Field.tsx — label above, hint below, error replaces hint and says how to fix it. No placeholder-as-label.
import {useId, type InputHTMLAttributes, type TextareaHTMLAttributes} from 'react';

type Base = {label: string; hint?: string; error?: string};

export function Field({label, hint, error, multiline, ...rest}: Base &
  ({multiline?: false} & InputHTMLAttributes<HTMLInputElement> | {multiline: true} & TextareaHTMLAttributes<HTMLTextAreaElement>)) {
  const id = useId();
  const describedBy = error || hint ? `${id}-desc` : undefined;
  const cls =
    'w-full rounded-md bg-surface-1 px-4 py-3 text-fg placeholder:text-fg-4 edge outline-none transition-shadow focus-visible:shadow-[0_0_0_2px_rgb(255_255_255/0.6)]' +
    (error ? ' shadow-[0_0_0_1px_rgb(255_120_120/0.8)]' : '');
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm text-fg-2">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={!!error} rows={4} className={`${cls} resize-none`} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input id={id} aria-describedby={describedBy} aria-invalid={!!error} className={cls} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {(error || hint) && (
        <p id={describedBy} className={`text-sm ${error ? 'text-[rgb(255_140_140)]' : 'text-fg-3'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
