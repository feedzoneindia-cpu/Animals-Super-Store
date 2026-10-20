import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';
import Button from '../components/common/Button.jsx';
import FormInput, { FormError } from '../components/common/FormInput.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useSEO from '../hooks/useSEO.js';

const MAIL = (
  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
);
const LOCK = (
  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
);
const USER = (
  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
);
const PHONE = (
  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  useSEO({
    title: 'Create an Account', noindex: true,
    description: 'Sign up to post listings and discover Animals-related products and items.',
  });

  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validate = () => {
    const errors = {};
    if (!values.name.trim()) {
      errors.name = 'Name is required';
    } else if (values.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!values.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (values.phone && !/^[0-9+\-\s]{7,15}$/.test(values.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }
    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (values.confirmPassword !== values.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-brand-50 bg-cover bg-[70%_center] bg-no-repeat lg:bg-left"
      style={{ backgroundImage: "url('/auth-bg.webp')" }}
    >
      {/* Soft white fade on the right so the card stays readable over the photo */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-white/50 via-white/10 to-transparent" aria-hidden="true" />

      <div className="mx-auto grid min-h-[calc(100vh-16rem)] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:py-16">
        {/* Left: welcome copy + pets illustration (desktop only) */}
        <div className="relative hidden min-h-[28rem] self-stretch lg:block">
           <Link to="/" className="flex h-20 w-25 items-center justify-center mx-auto" aria-label="Animals Super Store home">
              <img src="/animals-super-store-logo.png" alt="logo" />
            </Link>
          <div className="pt-10">
            <h1 className="text-4xl text-center font-extrabold tracking-tight text-brand-700 xl:text-5xl">Create Your Account</h1>
            <p className="mt-4 mx-25 max-w-xs text-center text-lg leading-relaxed text-gray-700">
              Join Animals Super Store to post and manage listings.
            </p>
          </div>
        </div>

        {/* Right: sign-up card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl shadow-brand-900/10 backdrop-blur-md sm:p-8">
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-700">Sign Up for Animals Super Store</h2>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500" aria-live="polite">
                <Spinner size="sm" label="Creating account" /> Creating your account…
              </div>
            )}
            <div className="mt-5">
              <FormError message={formError} />
            </div>
            <form onSubmit={handleSubmit} noValidate className={formError ? 'mt-4' : ''}>
              <div className="space-y-4">
                <FormInput
                  label="Full name"
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Your name"
                  icon={USER}
                  value={values.name}
                  onChange={setField('name')}
                  error={fieldErrors.name}
                />
                <FormInput
                  label="Email"
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  icon={MAIL}
                  value={values.email}
                  onChange={setField('email')}
                  error={fieldErrors.email}
                />
                <FormInput
                  label="Phone (optional)"
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Your contact number"
                  icon={PHONE}
                  value={values.phone}
                  onChange={setField('phone')}
                  error={fieldErrors.phone}
                />
                <FormInput
                  label="Password"
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="At least 8 characters"
                  icon={LOCK}
                  value={values.password}
                  onChange={setField('password')}
                  error={fieldErrors.password}
                />
                <FormInput
                  label="Confirm password"
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter your password"
                  icon={LOCK}
                  value={values.confirmPassword}
                  onChange={setField('confirmPassword')}
                  error={fieldErrors.confirmPassword}
                />
              </div>
              <Button type="submit" size="lg" className="mt-5 w-full" loading={loading} disabled={loading}>
                Create Account
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
              <span className="h-px flex-1 bg-brand-200" />
              or continue with
              <span className="h-px flex-1 bg-brand-200" />
            </div>

            <GoogleSignInButton
              onSuccess={() => navigate('/', { replace: true })}
              onError={setFormError}
            />
          </div>

          <p className="mt-6 text-center text-sm font-medium text-gray-700 drop-shadow-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
