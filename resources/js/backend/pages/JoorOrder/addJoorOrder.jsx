import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAppContext } from '@/context/AppContext';

import { createJoorOrder } from './api';
import JoorOrderForm from './JoorOrderForm';
import { buildNestedOrderPayload, emptyOrderForm } from './nestedPayload';
import { validateJoorOrderForm } from './validation';

export default function AddJoorOrder() {
    const navigate = useNavigate();
    const { setPageTitle } = useAppContext();

    useEffect(() => {
        setPageTitle('Create JOOR Order');
    }, [setPageTitle]);

    const [form, setForm] = useState(emptyOrderForm);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestError, setRequestError] = useState('');

    function handleChange(name, value) {
        setForm((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => {
            if (!previous[name]) return previous;
            const next = { ...previous };
            delete next[name];
            return next;
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setRequestError('');

        const validationErrors = validateJoorOrderForm(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const payload = buildNestedOrderPayload(form, { includeDoor: false });

        setIsSubmitting(true);
        setErrors({});

        try {
            await createJoorOrder(payload);
            toast.success('Order created successfully in JOOR.', { style: { color: '#16a34a' } });
            navigate('/admin/joor-orders');
        } catch (error) {
            const joorErrors = error.payload?.errors;
            if (Array.isArray(joorErrors) && joorErrors.length > 0) {
                setRequestError(joorErrors.map((e) => e.message).join(' '));
            } else {
                setRequestError(error.message || 'Failed to create order in JOOR.');
            }
            toast.error(error.message || 'Failed to create order in JOOR.', { style: { color: '#dc2626' } });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-lg font-semibold text-zinc-900">Create JOOR Order</h1>
                <p className="text-sm text-zinc-500">Fields left blank are omitted from the request sent to JOOR.</p>
            </div>
            {requestError && <p className="text-sm text-destructive">{requestError}</p>}
            <JoorOrderForm
                form={form}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={() => navigate('/admin/joor-orders')}
                isSubmitting={isSubmitting}
                errors={errors}
                submitLabel="Create Order"
            />
        </div>
    );
}
