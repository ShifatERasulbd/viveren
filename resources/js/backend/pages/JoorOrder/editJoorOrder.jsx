import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAppContext } from '@/context/AppContext';

import { fetchJoorOrders, updateJoorOrder } from './api';
import JoorOrderForm from './JoorOrderForm';
import { buildNestedOrderPayload, emptyOrderForm, mapOrderToForm } from './nestedPayload';
import { validateJoorOrderForm } from './validation';

export default function EditJoorOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setPageTitle } = useAppContext();

    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [form, setForm] = useState(emptyOrderForm);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestError, setRequestError] = useState('');

    useEffect(() => {
        setPageTitle('Edit JOOR Order');
    }, [setPageTitle]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        fetchJoorOrders({ order_ids: id })
            .then((data) => {
                if (cancelled) return;
                const order = Array.isArray(data?.orders) ? data.orders[0] : null;
                if (!order) {
                    setLoadError('Order not found in JOOR.');
                    return;
                }
                setForm(mapOrderToForm(order));
            })
            .catch((err) => {
                if (cancelled) return;
                setLoadError(err.message || 'Failed to load order from JOOR.');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [id]);

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

        const payload = buildNestedOrderPayload(form, { includeDoor: true });

        setIsSubmitting(true);
        setErrors({});

        try {
            await updateJoorOrder(id, payload);
            toast.success('Order updated successfully in JOOR.', { style: { color: '#16a34a' } });
            navigate('/admin/joor-orders');
        } catch (error) {
            const joorErrors = error.payload?.errors;
            if (Array.isArray(joorErrors) && joorErrors.length > 0) {
                setRequestError(joorErrors.map((e) => e.message).join(' '));
            } else {
                setRequestError(error.message || 'Failed to update order in JOOR.');
            }
            toast.error(error.message || 'Failed to update order in JOOR.', { style: { color: '#dc2626' } });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return <p className="text-sm text-zinc-500">Loading order…</p>;
    }

    if (loadError) {
        return <p className="text-sm text-destructive">{loadError}</p>;
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-lg font-semibold text-zinc-900">Edit JOOR Order #{id}</h1>
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
                submitLabel="Save Changes"
                showDoor
            />
        </div>
    );
}
