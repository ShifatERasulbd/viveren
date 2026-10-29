import { useEffect, useState } from 'react';
import { CheckCircle2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAppContext } from '@/context/AppContext';
import { requestJson } from '@/lib/apiClient';
import { isProfileIncomplete } from '@/lib/customerProfile';

const cardCls = 'rounded-xl border border-[#dccfae] bg-white p-5 shadow-sm sm:p-6';
const inputCls = 'h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-900';

function Field({ id, label, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export default function EditProfile() {
    const { setPageTitle, user, setUser } = useAppContext();

    const [form, setForm] = useState(() => ({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
    }));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { setPageTitle('Edit Profile'); }, [setPageTitle]);

    const incomplete = isProfileIncomplete(user);
    const unchanged = form.first_name.trim() === (user?.first_name || '').trim()
        && form.last_name.trim() === (user?.last_name || '').trim();

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = {};
        if (!form.first_name.trim()) nextErrors.first_name = 'First name is required.';
        if (!form.last_name.trim()) nextErrors.last_name = 'Last name is required.';
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setSaving(true);
        try {
            const payload = await requestJson('/api/customer/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                }),
            });

            setUser(payload.user);
            setForm({ first_name: payload.user.first_name || '', last_name: payload.user.last_name || '' });
            toast.success(payload.message || 'Profile updated.');
        } catch (error) {
            const fieldErrors = error.payload?.errors || {};
            setErrors({
                first_name: fieldErrors.first_name?.[0] || '',
                last_name: fieldErrors.last_name?.[0] || '',
            });
            toast.error(error.message || 'Could not update your profile.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <section className="rounded-xl bg-gradient-to-r from-[#f6efe0] via-[#e8d6a8] to-[#cdae6a] px-6 py-8 sm:px-8">
                <h1 className="font-serif text-3xl text-zinc-900 sm:text-4xl">Edit Profile</h1>
                <p className="mt-1 text-sm text-zinc-800">Keep your details up to date for faster checkout and accurate invoices.</p>
            </section>

            {incomplete && (
                <section className="rounded-xl border border-[#b89b5e] bg-[#fbf7ee] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <UserCircle2 className="mt-0.5 size-5 shrink-0 text-[#b89b5e]" />
                        <div>
                            <h2 className="font-serif text-lg text-zinc-900">Complete your profile</h2>
                            <p className="mt-1 text-sm text-zinc-700">
                                Your account was created with your email only. Add your name so it appears on your orders and invoices and is filled in for you at checkout.
                            </p>
                            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-800">
                                <li>Enter your first and last name below.</li>
                                <li>Click <span className="font-semibold">Save changes</span>.</li>
                            </ol>
                        </div>
                    </div>
                </section>
            )}

            <form onSubmit={handleSubmit} noValidate className={cardCls}>
                <h2 className="font-serif text-lg text-zinc-900">Personal details</h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field id="first_name" label="First name" error={errors.first_name}>
                        <input
                            id="first_name"
                            type="text"
                            autoComplete="given-name"
                            maxLength={100}
                            value={form.first_name}
                            onChange={(event) => updateField('first_name', event.target.value)}
                            className={`${inputCls} ${errors.first_name ? 'border-red-400' : 'border-zinc-300'}`}
                        />
                    </Field>

                    <Field id="last_name" label="Last name" error={errors.last_name}>
                        <input
                            id="last_name"
                            type="text"
                            autoComplete="family-name"
                            maxLength={100}
                            value={form.last_name}
                            onChange={(event) => updateField('last_name', event.target.value)}
                            className={`${inputCls} ${errors.last_name ? 'border-red-400' : 'border-zinc-300'}`}
                        />
                    </Field>

                    <div className="sm:col-span-2">
                        <Field id="email" label="Email">
                            <input
                                id="email"
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                className={`${inputCls} cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-500 focus:border-zinc-200`}
                            />
                        </Field>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                            {user?.email_verified_at && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                            {user?.email_verified_at ? 'Verified. ' : ''}You sign in with this email, so it can&apos;t be changed here.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || unchanged}
                        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
