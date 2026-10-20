import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import FormInput, { FormError } from '../../components/common/FormInput.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import {
  AccountForm,
  PasswordForm,
  AppearanceForm,
  DeleteAccountPanel,
} from '../../components/settings/SettingsForms.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { adminService } from '../../services/adminService.js';
import useSEO from '../../hooks/useSEO.js';
import { formatPrice } from '../../utils/format.js';

/** Maps the API's [{ field, message }] validation errors to { field: message }. */
const toFieldErrors = (errors = []) =>
  Object.fromEntries(errors.map((e) => [e.field, e.message]));

function Section({ children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

/** Shipping rules and the order on/off switch. */
function StoreSettingsForm({ initial, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    shippingFee: String(initial.shippingFee),
    freeShippingThreshold: String(initial.freeShippingThreshold),
    acceptingOrders: initial.acceptingOrders,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setValue = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = {};
    ['shippingFee', 'freeShippingThreshold'].forEach((name) => {
      const value = form[name].trim();
      if (value === '' || Number.isNaN(Number(value)) || Number(value) < 0) {
        errors[name] = 'Enter a valid amount (0 or more)';
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const saved = await adminService.updateSettings({
        shippingFee: Number(form.shippingFee),
        freeShippingThreshold: Number(form.freeShippingThreshold),
        acceptingOrders: form.acceptingOrders,
      });
      onSaved(saved);
      toast('Settings saved');
    } catch (err) {
      setFieldErrors(toFieldErrors(err.errors));
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={formError} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormInput
          id="shippingFee"
          label="Shipping fee (₹)"
          type="number"
          inputMode="decimal"
          min="0"
          value={form.shippingFee}
          onChange={setValue('shippingFee')}
          error={fieldErrors.shippingFee}
          hint="Charged on orders below the free-shipping amount."
        />
        <FormInput
          id="freeShippingThreshold"
          label="Free shipping above (₹)"
          type="number"
          inputMode="decimal"
          min="0"
          value={form.freeShippingThreshold}
          onChange={setValue('freeShippingThreshold')}
          error={fieldErrors.freeShippingThreshold}
          hint="Orders at or above this subtotal ship free."
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-brand-300">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
          checked={form.acceptingOrders}
          onChange={(event) =>
            setForm((current) => ({ ...current, acceptingOrders: event.target.checked }))
          }
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900">Accept new orders</span>
          <span className="block text-sm text-gray-500">
            Turn off to pause checkout, for example during holidays or stock-taking. Customers
            will see a message instead of being able to place an order.
          </span>
        </span>
      </label>

      <p className="text-sm text-gray-500">
        Preview: orders under {formatPrice(Number(form.freeShippingThreshold) || 0)} pay{' '}
        {formatPrice(Number(form.shippingFee) || 0)} shipping; larger orders ship free.
      </p>

      <Button type="submit" loading={saving}>
        Save settings
      </Button>
    </form>
  );
}

function StoreSection() {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    adminService
      .getSettings()
      .then((data) => active && setSettings(data))
      .catch((err) => active && setLoadError(err.message));
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <FormError message={loadError} />;
  if (!settings) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  return <StoreSettingsForm initial={settings} onSaved={setSettings} />;
}

const SECTIONS = {
  account: {
    title: 'Account',
    description: 'Your name and contact details.',
    render: () => <AccountForm />,
  },
  password: {
    title: 'Change password',
    description: "Use a strong password you don't use elsewhere.",
    render: () => <PasswordForm />,
  },
  appearance: {
    title: 'Appearance',
    description: 'Choose how the site looks to you.',
    render: () => <AppearanceForm />,
  },
  store: {
    title: 'Shipping & orders',
    description: 'These values apply to the cart, checkout and every new order.',
    render: () => <StoreSection />,
  },
  delete: {
    title: 'Delete account',
    description: 'Permanently remove your admin account.',
    render: () => <DeleteAccountPanel />,
  },
};

export default function AdminSettings() {
  const { section } = useParams();
  const current = SECTIONS[section];
  useSEO({ title: current ? `${current.title} · Settings` : 'Settings', noindex: true });

  if (!current) return <Navigate to="/admin/settings/account" replace />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{current.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{current.description}</p>
      </div>
      <Section key={section}>{current.render()}</Section>
    </div>
  );
}
