import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import FormInput, { FormError } from '../components/common/FormInput.jsx';
import useSEO from '../hooks/useSEO.js';
import { authService } from '../services/authService.js';

export default function ForgotPassword() {
  useSEO({ title: 'Forgot Password', noindex: true, description: 'Reset your Animals Super Store password.' });

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const value = email.trim();
    if (!value) return setFieldError('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setFieldError('Please enter a valid email address');
    setFieldError('');

    setLoading(true);
    try {
      await authService.forgotPassword(value);
      setSent(true);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Forgot your password?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your account email and we will send you a link to set a new password.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {sent ? (
            <div role="status" className="space-y-3 text-center">
              <p className="text-base font-semibold text-gray-900">Check your email</p>
              <p className="text-sm text-gray-600">
                We have sent a password reset link to <span className="font-medium">{email.trim()}</span>. The link is
                valid for a short time, so please use it soon. Check your spam folder too.
              </p>
            </div>
          ) : (
            <>
              <FormError message={formError} />
              <form onSubmit={handleSubmit} noValidate className={formError ? 'mt-4' : ''}>
                <FormInput
                  label="Email"
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldError}
                />
                <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} disabled={loading}>
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  );
}
