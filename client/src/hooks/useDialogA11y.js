import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog accessibility behaviour: focus moves into the dialog when it opens,
 * Tab is trapped inside, Escape closes, the page behind stops scrolling, and
 * focus returns to the trigger when the dialog closes.
 *
 * `dialogRef` must point at the dialog's outermost element (give it
 * tabIndex={-1} so it can receive focus).
 */
export default function useDialogA11y(open, onClose, dialogRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef?.current;

    // Move focus into the dialog — the container itself first, so the very
    // first Tab lands on the first control.
    dialog?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && dialog) {
        const items = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
