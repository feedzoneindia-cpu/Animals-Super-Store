import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const sec = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useSEO({ title: 'Log In', noindex: true, description: 'Log in to your Animals Super Store account.' });

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  // Timestamp (ms) until which this email is locked out by the server, or null.
  const [lockedUntil, setLockedUntil] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lockTotal, setLockTotal] = useState(30);
  const isLocked = lockedUntil !== null;
  const contentRef = useRef(null);

  // `inert` keeps keyboard focus out of the blurred form while locked.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (isLocked) {
      el.setAttribute('inert', '');
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    } else {
      el.removeAttribute('inert');
    }
  }, [isLocked]);

  useEffect(() => {
    if (lockedUntil === null) return undefined;
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(null);
        setSecondsLeft(0);
        setValues((prev) => ({ ...prev, password: '' }));
        setFormError('');
      } else {
        setSecondsLeft(left);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validate = () => {
    const errors = {};
    if (!values.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!values.password) {
      errors.password = 'Password is required';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (isLocked || Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await login(values);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        setLockTotal(err.retryAfter);
        setLockedUntil(Date.now() + err.retryAfter * 1000);
        setFormError('');
      } else {
        setFormError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-brand-50 bg-cover bg-[70%_center] bg-no-repeat lg:bg-left py-6.5"
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
            <h1 className="text-4xl text-center font-extrabold tracking-tight text-brand-700 xl:text-5xl">Welcome Back</h1>
            <p className="mt-4 text-center mx-25 max-w-xs text-lg leading-relaxed text-gray-700">
              Sign in to continue your journey with happy and healthy pets.
            </p>
          </div>
        </div>

        {/* Right: login card */}
        <div className="mx-auto w-full max-w-md">
          <div className="relative">
          <div
            ref={contentRef}
            aria-hidden={isLocked}
            className={`rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl shadow-brand-900/10 backdrop-blur-md transition duration-300 sm:p-8 ${isLocked ? 'pointer-events-none select-none blur-md' : ''}`}
          >
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-700">Login to Your Account</h2>
            <p className="mt-1 text-sm text-gray-600">Welcome back! Please enter your details.</p>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500" aria-live="polite">
                <Spinner size="sm" label="Signing in" /> Signing you in…
              </div>
            )}
            <div className="mt-5">
              <FormError message={formError} />
            </div>
            <form onSubmit={handleSubmit} noValidate className={formError ? 'mt-4' : ''}>
              <div className="space-y-5">
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
                  label="Password"
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                  icon={LOCK}
                  value={values.password}
                  onChange={setField('password')}
                  error={fieldErrors.password}
                />
                <div className="-mt-3 text-right">
                  <Link to="/forgot-password" className="text-xs font-semibold text-brand-500 hover:text-brand-700">
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" size="lg" className="mt-5 w-full" loading={loading} disabled={loading}>
                Login
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
              <span className="h-px flex-1 bg-brand-200" />
              or continue with
              <span className="h-px flex-1 bg-brand-200" />
            </div>

            <GoogleSignInButton
              onSuccess={() => navigate(location.state?.from ?? '/', { replace: true })}
              onError={setFormError}
            />
          </div>

            {isLocked && (
              <div
                role="alert"
                aria-live="polite"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/60 p-6 text-center backdrop-blur-sm"
              >
                <div className="relative h-28 w-28">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-brand-100" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="stroke-brand-600 transition-[stroke-dashoffset] duration-300 ease-linear"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(secondsLeft, lockTotal) / lockTotal)}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tabular-nums text-brand-700">
                    {formatCountdown(secondsLeft)}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-brand-700">Too many attempts</h2>
                <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-gray-700">
                  Please wait <span className="font-semibold tabular-nums">{formatCountdown(secondsLeft)}</span> before trying again.
                </p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm font-medium text-gray-700 drop-shadow-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
