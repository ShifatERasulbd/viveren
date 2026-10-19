import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { HeaderCard } from '@/components/dashboard/Header-Card';
import { StockOverviewChart } from '@/components/dashboard/chart';
import { LowStockAlertTable } from '@/components/dashboard/low-stock-alertTable';
import { useAppContext } from '@/context/AppContext';
import { requestJson } from '@/lib/apiClient';

const EMPTY_CARDS = [
    { title: 'Total Purchase', amount: 0, format: 'currency', description: 'From all checkout orders' },
    { title: 'Total Sell', amount: 0, format: 'count', description: 'Items sold across all orders' },
    { title: 'Total Revenue', amount: 0, format: 'currency', description: 'Gross revenue from checkout totals' },
];

export default function Dashboard() {
    const { setPageTitle, user } = useAppContext();
    const [headerCards, setHeaderCards] = useState([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);

    const isCustomer = user?.user_type === 'customer';

    useEffect(() => {
        setPageTitle('Dashboard');
    }, [setPageTitle]);

    useEffect(() => {
        if (!user || isCustomer) {
            return;
        }

        let ignore = false;

        async function loadSummary() {
            setIsSummaryLoading(true);

            try {
                const payload = await requestJson('/api/orders?per_page=1000');
                const orders = Array.isArray(payload?.data) ? payload.data : [];

                const totalPurchase = orders.reduce((sum, order) => sum + Number(order?.subtotal || 0), 0);
                const totalSell = orders.reduce((sum, order) => sum + Number(order?.items_count || 0), 0);
                const totalRevenue = orders.reduce((sum, order) => sum + Number(order?.total || 0), 0);

                if (!ignore) {
                    setHeaderCards([
                        { ...EMPTY_CARDS[0], amount: totalPurchase },
                        { ...EMPTY_CARDS[1], amount: totalSell },
                        { ...EMPTY_CARDS[2], amount: totalRevenue },
                    ]);
                }
            } catch {
                if (!ignore) {
                    setHeaderCards(EMPTY_CARDS);
                }
            } finally {
                if (!ignore) {
                    setIsSummaryLoading(false);
                }
            }
        }

        loadSummary();

        return () => {
            ignore = true;
        };
    }, [user, isCustomer]);

    if (!user) {
        return <div className="text-sm text-zinc-500">Loading dashboard...</div>;
    }

    // Customers have their own dashboard.
    if (isCustomer) {
        return <Navigate to="/user/dashboard" replace />;
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <HeaderCard items={headerCards} loading={isSummaryLoading} />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <LowStockAlertTable />
                <StockOverviewChart />
            </div>
        </div>
    );
}