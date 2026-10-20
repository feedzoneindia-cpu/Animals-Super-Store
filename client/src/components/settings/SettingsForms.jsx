import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import FormInput, { FormError } from '../common/FormInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { authService } from '../../services/authService.js';

/**
 * Settings forms shared by the customer Settings page (/settings) and the
 * admin panel (/admin/settings): account details, password, appearance and
 * account deletion. They only use the signed-in user's own endpoints.
 */

/** Maps the API's [{ field, message }] validation errors to { field: message }. */
const toFieldErrors = (errors = []) =>
  Object.fromEntries(errors.map((e) => [e.field, e.message]));

/** Name and phone for the signed-in user; email is shown read-only. */
export function AccountForm() {
  const { user, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setValue = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = {};
    if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (form.phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) {
      errors.phone = 'Please provide a valid phone number';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      toast('Account updated');
    } catch (err) {
      setFieldErrors(toFieldErrors(err.errors));
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(user?.role === 'ADMIN' ? '/admin/login' : '/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-5">
        <FormError message={formError} />
        <FormInput
          id="accountName"
          label="Full name"
          value={form.name}
          onChange={setValue('name')}
          error={fieldErrors.name}
          autoComplete="name"
        />
        <FormInput
          id="accountEmail"
          label="Email"
          type="email"
          value={user?.email ?? ''}
          readOnly
          disabled
          hint="Your email is your login and can't be changed here."
        />
        <FormInput
          id="accountPhone"
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={setValue('phone')}
          error={fieldErrors.phone}
          autoComplete="tel"
        />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>

      <div className="border-t border-gray-200 pt-5">
        <p className="text-sm text-gray-500">Done for now? Sign out of your account on this device.</p>
        <Button variant="outline" className="mt-3" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}

/** Lets the signed-in user change their own password. */
export function PasswordForm() {
  const { toast } = useToast();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setValue = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current password is required';
    if (form.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(empty);
      toast('Password updated');
    } catch (err) {
      setFieldErrors(toFieldErrors(err.errors));
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-5">
      <FormError message={formError} />
      <FormInput
        id="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={setValue('currentPassword')}
        error={fieldErrors.currentPassword}
      />
      <FormInput
        id="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={setValue('newPassword')}
        error={fieldErrors.newPassword}
        hint="At least 8 characters."
      />
      <FormInput
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={form.confirmPassword}
        onChange={setValue('confirmPassword')}
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" variant="outline" loading={saving}>
        Update password
      </Button>
    </form>
  );
}

const THEME_CHOICES = [
  { value: 'light', label: 'Light', hint: 'Bright, cream surfaces', icon: '☀️' },
  { value: 'dark', label: 'Dark', hint: 'Easy on the eyes at night', icon: '🌙' },
  { value: 'system', label: 'System', hint: 'Match your device setting', icon: '💻' },
];

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
        {THEME_CHOICES.map((choice) => {
          const active = theme === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(choice.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active
                  ? 'border-brand-700 bg-brand-50 ring-2 ring-brand-700/20'
                  : 'border-gray-200 bg-white hover:border-brand-300'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">{choice.icon}</span>
              <span className="mt-2 block text-sm font-semibold text-gray-900">{choice.label}</span>
              <span className="block text-xs text-gray-500">{choice.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Saved on this browser and applied across the whole site.
      </p>
    </div>
  );
}

export function DeleteAccountPanel() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setFormError('');
    try {
      await authService.deleteAccount(password);
      setConfirming(false);
      await logout();
      toast('Your account has been deleted');
      navigate('/', { replace: true });
    } catch (err) {
      setConfirming(false);
      setFormError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-md space-y-5">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">This can't be undone.</p>
        <p className="mt-1">
          {isAdmin
            ? "Your admin account will be removed permanently. Listings and blog posts you created are kept and handed over to another admin. You can't delete the only admin account."
            : 'Your account and profile will be removed permanently. Past orders are kept by the store for its records, but are no longer linked to you.'}
        </p>
      </div>
      <FormError message={formError} />
      <FormInput
        id="deletePassword"
        label="Confirm with your password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="Leave blank only if you sign in with Google."
      />
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete my account
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Delete your account?"
        message="This permanently deletes your account and signs you out."
        confirmLabel="Delete account"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

