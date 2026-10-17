import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';

function readCookie(name) {
    const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
}

function formatTime(totalSeconds) {
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export default function AuthLoginForm() {
    const [step, setStep] = useState('email'); // 'email' or 'otp'
    const [form, setForm] = useState({ email: '', otp: '', remember: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotResetUrl, setForgotResetUrl] = useState('');
    const [showForgotForm, setShowForgotForm] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [otpCountdown, setOtpCountdown] = useState(0);

    // Resend cooldown timer (1 minute)
    useEffect(() => {
        if (resendCountdown <= 0) return undefined;

        const timer = setTimeout(() => {
            setResendCountdown((seconds) => seconds - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // OTP validity timer (5 minutes)
    useEffect(() => {
        if (otpCountdown <= 0) return undefined;

        const timer = setTimeout(() => {
            setOtpCountdown((seconds) => seconds - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [otpCountdown]);

    function updateField(field, value) {
        setForm((previous) => ({ ...previous, [field]: value }));
    }

    async function getCsrfAndHeaders() {
        await fetch('/sanctum/csrf-cookie', {
            credentials: 'include',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        const xsrfToken = readCookie('XSRF-TOKEN');
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
        };
    }

    async function handleSendOtp(event) {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            const headers = await getCsrfAndHeaders();

            const response = await fetch('/api/login/send-otp', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    email: form.email.trim(),
                }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                setErrorMessage(payload?.message || 'Unable to send verification code.');
                return;
            }

            setSuccessMessage(payload?.message || 'Verification code sent to your email.');
            updateField('otp', ''); // clear any old code
            setResendCountdown(60); // 1 minute before the next resend
            setOtpCountdown(300); // code is valid for 5 minutes
            setStep('otp'); // Switch to OTP verification view
        } catch {
            setErrorMessage('Unable to reach the server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleVerifyOtp(event) {
        event.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);

        try {
            const headers = await getCsrfAndHeaders();

            const response = await fetch('/api/login/verify-otp', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    email: form.email.trim(),
                    otp: form.otp.trim(),
                    remember: form.remember,
                }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                setErrorMessage(payload?.message || 'Invalid or expired verification code.');
                return;
            }

            window.location.assign(await resolveRedirectPath(payload?.user));
        } catch {
            setErrorMessage('Unable to reach the server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function resolveRedirectPath(userFromPayload) {
    let userType = userFromPayload?.user_type;

    // Fallback (e.g. Google login): ask the API who just logged in
    if (!userType) {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await response.json().catch(() => null);
            userType = data?.user_type;
        } catch {
            // keep default
        }
    }

    return userType === 'customer' ? '/user/dashboard' : '/admin/dashboard';
}



    async function handleGoogleSuccess(credentialResponse) {
        setErrorMessage('');
        setIsGoogleSubmitting(true);

        try {
            const headers = await getCsrfAndHeaders();

            const response = await fetch('/api/auth/google/callback', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                setErrorMessage(payload?.message || 'Google login failed. Please try again.');
                return;
            }

            window.location.assign(await resolveRedirectPath(payload?.user));
        } catch {
            setErrorMessage('Unable to complete Google login. Please try again.');
        } finally {
            setIsGoogleSubmitting(false);
        }
    }

    function handleGoogleError() {
        setErrorMessage('Google login was cancelled or failed. Please try again.');
    }

    async function handleForgotPassword(event) {
        event.preventDefault();
        setErrorMessage('');
        setForgotMessage('');
        setForgotResetUrl('');
        setIsForgotSubmitting(true);

        try {
            const headers = await getCsrfAndHeaders();
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ email: forgotEmail.trim() }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                setErrorMessage(payload?.message || 'Unable to send reset link.');
                return;
            }

            setForgotMessage(payload?.message || 'Password reset link sent to your email.');
            setForgotResetUrl(payload?.reset_url || '');
        } catch {
            setErrorMessage('Unable to send reset link right now. Please try again.');
        } finally {
            setIsForgotSubmitting(false);
        }
    }

    if (showForgotForm) {
        return (
            <form className="mt-5 space-y-3" onSubmit={handleForgotPassword}>
                <label className="block text-[0.9rem] font-semibold text-zinc-900">Send reset link to email</label>
                <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full border border-zinc-200 bg-[#ebeff4] px-3.5 text-[0.95rem] text-zinc-900 outline-none transition-colors placeholder:text-slate-400 focus:border-zinc-900"
                    required
                />

                {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
                {forgotMessage ? <p className="text-sm text-emerald-700">{forgotMessage}</p> : null}
                {forgotResetUrl ? (
                    <p className="text-sm text-zinc-700">
                        Local reset link:{' '}
                        <a href={forgotResetUrl} className="underline underline-offset-2" target="_self" rel="noreferrer">
                            Open reset page
                        </a>
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="inline-flex h-11 w-full items-center justify-center bg-black px-5 text-[0.82rem] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isForgotSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setShowForgotForm(false);
                        setErrorMessage('');
                        setForgotMessage('');
                    }}
                    className="text-[0.88rem] text-slate-500 underline underline-offset-2 transition-colors hover:text-zinc-800"
                >
                    Back to login
                </button>
            </form>
        );
    }

    return (
        <div>
            {/* Step 1: Enter Email to request OTP */}
            {step === 'email' ? (
                <form className="mt-5 space-y-3" onSubmit={handleSendOtp}>
                    <div>
                        <label className="text-[0.9rem] font-semibold text-zinc-900">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => updateField('email', event.target.value)}
                            placeholder="Example@email.com"
                            className="mt-1.5 h-11 w-full border border-zinc-200 bg-[#ebeff4] px-3.5 text-[0.95rem] text-zinc-900 outline-none transition-colors placeholder:text-slate-400 focus:border-zinc-900"
                            required
                        />
                    </div>

                    <label className="inline-flex items-center gap-2 text-[0.88rem] text-zinc-700">
                        <input
                            type="checkbox"
                            checked={form.remember}
                            onChange={(event) => updateField('remember', event.target.checked)}
                            className="size-4 border-zinc-300"
                        />
                        <span>Remember me</span>
                    </label>

                    {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

                    <button
                        type="submit"
                        disabled={isSubmitting || isGoogleSubmitting}
                        className="inline-flex h-11 w-full items-center justify-center bg-black px-5 text-[0.86rem] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Sending Code...' : 'Continue with Email'}
                    </button>

                    <div className="relative flex items-center gap-3 py-0.5">
                        <div className="h-px flex-1 bg-zinc-200" />
                        <span className="text-[0.8rem] uppercase tracking-[0.1em] text-zinc-400">or</span>
                        <div className="h-px flex-1 bg-zinc-200" />
                    </div>

                    <div className={`flex w-full justify-center transition-opacity ${isGoogleSubmitting ? 'pointer-events-none opacity-60' : ''}`}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            width="100%"
                            text="signin_with"
                            shape="rectangular"
                            theme="outline"
                            size="large"
                        />
                    </div>
                </form>
            ) : (
                /* Step 2: Enter OTP Code */
                <form className="mt-5 space-y-3" onSubmit={handleVerifyOtp}>
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-[0.9rem] font-semibold text-zinc-900">Verification Code</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('email');
                                    setErrorMessage('');
                                    setSuccessMessage('');
                                    setResendCountdown(0);
                                    setOtpCountdown(0);
                                }}
                                className="text-xs text-slate-500 underline hover:text-zinc-800"
                            >
                                Change email
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">We sent a 6-digit code to <span className="font-medium text-zinc-800">{form.email}</span></p>
                        <input
                            type="text"
                            maxLength="6"
                            value={form.otp}
                            onChange={(event) => updateField('otp', event.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="mt-1.5 h-11 w-full border border-zinc-200 bg-[#ebeff4] px-3.5 text-center text-[1.2rem] font-mono tracking-widest text-zinc-900 outline-none transition-colors placeholder:text-slate-400 focus:border-zinc-900"
                            required
                        />
                    </div>

                    {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

                    {successMessage ? (
                        <div className="space-y-1">
                            <p className="text-sm text-emerald-700">{successMessage}</p>
                            <p className="text-xs text-slate-500">Can't find? Check Spam or Junk.</p>
                        </div>
                    ) : null}

                    {otpCountdown > 0 ? (
                        <p className="text-xs text-slate-500">
                            This code is valid for 5 minutes. Expires in{' '}
                            <span className="font-medium tabular-nums text-zinc-800">{formatTime(otpCountdown)}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-red-600">This code has expired. Please request a new one.</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || form.otp.length < 6 || otpCountdown <= 0}
                        className="inline-flex h-11 w-full items-center justify-center bg-black px-5 text-[0.86rem] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
                    </button>

                    <div className="text-center pt-2">
                        {resendCountdown > 0 ? (
                            <p className="text-[0.85rem] text-slate-400">
                                Resend code in{' '}
                                <span className="font-medium tabular-nums text-zinc-700">
                                    {formatTime(resendCountdown)}
                                </span>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={isSubmitting}
                                className="text-[0.85rem] text-slate-500 underline underline-offset-2 transition-colors hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Didn't receive code? Resend
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}