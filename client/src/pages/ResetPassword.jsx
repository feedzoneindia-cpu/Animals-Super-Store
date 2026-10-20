import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import FormInput, { FormError } from '../components/common/FormInput.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { authService } from '../services/authService.js';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useSEO({ title: 'Reset Password', noindex: true, description: 'Choose a new Animals Super Store password.' });

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = {};
    if (!values.password) errors.password = 'Password is required';
    else if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await authService.resetPassword(token, values.password);
      toast('Password updated. Please log in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Set a new password</h1>
          <p className="mt-2 text-sm text-gray-600">Choose a password with at least 8 characters.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <FormError message={formError} />
          {formError && (
            <p className="mt-3 text-sm text-gray-600">
              <Link to="/forgot-password" className="font-semibold text-brand-700 hover:text-brand-800">
                Request a new reset link
              </Link>
            </p>
          )}
          <form onSubmit={handleSubmit} noValidate className={formError ? 'mt-4' : ''}>
            <div className="space-y-5">
              <FormInput
                label="New password"
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="At least 8 characters"
                value={values.password}
                onChange={setField('password')}
                error={fieldErrors.password}
              />
              <FormInput
                label="Confirm new password"
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Re-enter your new password"
                value={values.confirmPassword}
                onChange={setField('confirmPassword')}
                error={fieldErrors.confirmPassword}
              />
            </div>
            <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} disabled={loading}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
