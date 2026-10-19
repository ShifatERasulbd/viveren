import { useAppContext } from '@/context/AppContext';
import AdminOrders from './AdminOrders';
import CustomerOrders from './CustomerOrders';

export default function Orders() {
    const { user } = useAppContext();
    if (!user) return null;
    return user.user_type === 'customer' ? <CustomerOrders /> : <AdminOrders />;
}