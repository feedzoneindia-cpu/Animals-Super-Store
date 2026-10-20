import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import useDialogA11y from '../../hooks/useDialogA11y.js';
import { useToast } from '../../context/ToastContext.jsx';
import { reportService } from '../../services/reportService.js';
import { REPORT_REASONS, MAX_REPORT_DESCRIPTION_LENGTH } from '../../constants/reports.js';

/**
 * Modal form for reporting a listing. Focus is trapped inside while open,
 * Escape closes, and focus returns to the trigger element on close.
 */
export default function ReportListingDialog({ open, listing, onClose }) {
  const { toast } = useToast();
  const dialogRef = useRef(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useDialogA11y(open, onClose, dialogRef);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setReason('');
      setDescription('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reason) {
      setError('Please choose a reason for the report.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await reportService.createReport({
        listing: listing._id,
        reason,
        description: description.trim(),
      });
      toast('Report submitted. Our admins will review it.');
      onClose();
    } catch (err) {
      // 409 means this user already has an active report for this listing.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="report-dialog-title" className="text-lg font-semibold text-gray-900">
          Report this listing
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          “{listing.title}” — tell us what's wrong and our admins will take a look.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700">
              Reason <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
            >
              <option value="" disabled>
                Choose a reason…
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="report-description"
              rows={3}
              maxLength={MAX_REPORT_DESCRIPTION_LENGTH}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add any details that help us understand the problem"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={submitting} disabled={submitting}>
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
