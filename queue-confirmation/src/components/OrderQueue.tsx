/* eslint-disable @typescript-eslint/no-use-before-define */
// src/components/OrderQueue.tsx
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import ConnectionStatus from "./ConnectionStatus";

interface Item {
    name: string;
    status: 'pending' | 'unavailable' | 'complete';
}

interface Order {
    id: number;
    items: Item[];
}

const fetcher = (url: string) => axios.get(url).then(res => res.data);

const OrderQueue: React.FC = () => {
    const { data: fetchedOrders, mutate } = useSWR<Order[]>('/api/orders', fetcher, {
        fallbackData: [],
    });
    const [orders, setOrders] = useState<Order[]>([]);
    const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
    const [cachedChanges, setCachedChanges] = useState<{ orderId: number; itemIndex: number; status: string }[]>([]);
    const [isServerOnline, setIsServerOnline] = useState(true);

    useEffect(() => {
        const handleOnline = async () => {
            const cachedChanges = JSON.parse(localStorage.getItem('orderChanges') || '[]');
            for (const change of cachedChanges) {
                await axios.post(`/api/orders/${change.orderId}/items/${change.itemIndex}/status`, { status: change.status });
            }
            localStorage.removeItem('orderChanges');
            setCachedChanges([]);
            mutate(); // Refresh orders from the server
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [mutate]);

    useEffect(() => {
        const syncOrders = async () => {
            if (navigator.onLine && isServerOnline) {
                try {
                    await axios.post('/api/orders/sync', { orders });
                } catch (error) {
                    console.error('Error synchronizing orders:', error);
                }
            }
        };

        const intervalId = setInterval(syncOrders, 1000);

        return () => clearInterval(intervalId);
    }, [orders, isServerOnline]);

    useEffect(() => {
        const checkServerStatus = async () => {
            try {
                await axios.get('/api/health');
                setIsServerOnline(true);
            } catch (error) {
                setIsServerOnline(false);
            }
        };

        const intervalId = setInterval(checkServerStatus, 1000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const cached = JSON.parse(localStorage.getItem('orderChanges') || '[]');
        setCachedChanges(cached);
    }, []);

    useEffect(() => {
        const savedOrderId = localStorage.getItem('currentOrderId');
        if (savedOrderId !== null) {
            //setCurrentOrderId(Number(savedOrderId));
        }
    }, []);

    useEffect(() => {
        if (currentOrderId !== null) {
            localStorage.setItem('currentOrderId', currentOrderId.toString());
        }
    }, [currentOrderId]);

    useEffect(() => {
        const fetchInitialOrders = async () => {
            const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            if (savedOrders.length > 0) {
                setOrders(savedOrders);
                if (currentOrderId === null && savedOrders.length > 0) {
                    setCurrentOrderId(savedOrders[0].id);
                }
            } else {
                try {
                    const response = await axios.get('/api/orders');
                    setOrders(response.data);
                    if (response.data.length > 0) {
                        setCurrentOrderId(response.data[0].id);
                    }
                } catch (error) {
                    console.error('Error fetching initial orders:', error);
                }
            }
        };

        fetchInitialOrders();
    }, [fetchedOrders]);

    useEffect(() => {
        if (orders.length > 0) {
            localStorage.setItem('orders', JSON.stringify(orders));
        }
    }, [orders]);

    const handleItemStatusChange = async (orderId: number, itemIndex: number, status: 'unavailable' | 'complete') => {
        if (!orders) return;

        // Update the state immediately
        const updatedOrders = orders.map(order =>
            order.id === orderId
                ? {
                    ...order,
                    items: order.items.map((item, index) =>
                        index === itemIndex ? { ...item, status } : item
                    ),
                }
                : order
        );
        setOrders(updatedOrders);
        console.log("now");
        await new Promise(resolve => setTimeout(resolve, 1000));
        mutate(updatedOrders, false);

        try {
            await axios.post(`/api/orders/${orderId}/items/${itemIndex}/status`, { status });
        } catch (error) {
            const cachedChanges = JSON.parse(localStorage.getItem('orderChanges') || '[]');
            cachedChanges.push({ orderId, itemIndex, status });
            localStorage.setItem('orderChanges', JSON.stringify(cachedChanges));
            setCachedChanges(cachedChanges);
        }

        // Check if all items in the current order are either 'complete' or 'unavailable'
        const currentOrder = updatedOrders.find(order => order.id === orderId);
        if (currentOrder && currentOrder.items.every(item => item.status !== 'pending')) {
            const nextOrder = orders.find(order => order.id !== orderId && order.items.some(item => item.status === 'pending'));
            if (nextOrder) {
                setCurrentOrderId(nextOrder.id);
            }
        }
    };

    const handleReset = async () => {
        // Send a request to the server to reset orders
        try {
            await axios.post('/api/orders/reset');
        } catch (error) {
            console.error('Error resetting orders on the server:', error);
        }

        // Reset the local state
        setCurrentOrderId(null);
        setOrders([]);
        setCachedChanges([]);
        localStorage.removeItem('orders');
        localStorage.removeItem('currentOrderId');
        localStorage.removeItem('orderChanges');

        // Fetch initial orders from the server
        try {
            const response = await axios.get('/api/orders');
            const initialOrders = response.data.map((order: Order) => ({
                ...order,
                items: order.items.map(item => ({ ...item, status: 'pending' }))
            }));
            setOrders(initialOrders);
        } catch (error) {
            console.error('Error fetching initial orders:', error);
        }

        // Refresh orders from the server
        mutate();
    };

    const handleDeleteOrder = (orderId: number) => {
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    };

    const currentOrder = orders.find(order => order.id === currentOrderId);
    
    if (!orders || !orders.length || !currentOrder) return <div>Loading...</div>;


    const pendingOrders = orders.filter(order => order.items.some(item => item.status === 'pending'));
    const completedOrders = orders.filter(order => order.items.every(item => item.status !== 'pending'));

    return (
        <div className="p-4">
            <div className="mb-4">
                <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
                    Login
                </button>
                <button className="bg-red-500 text-white px-4 py-2 rounded">
                    Sign Out
                </button>
            </div>
            <ConnectionStatus onStatusChange={(isOnline, isServerOnline) => {
                if (isServerOnline) {
                    completedOrders.forEach(order => handleDeleteOrder(order.id));
                }
            }} />
            <h1 className="text-2xl font-bold mb-4">Order Queue</h1>
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
                onClick={handleReset}
            >
                Reset
            </button>
            <button
                className="bg-yellow-500 text-white px-4 py-2 rounded mb-4"
                onClick={() => { /* Functionality to get new orders will be implemented later */ }}
            >
                Get New Orders
            </button>
            <div className="bg-white shadow-md rounded p-4 mb-4">
                <h2 className="text-xl font-semibold">Order #{currentOrder.id}</h2>
                <ul>
                    {currentOrder.items.map((item, index) => (
                        <li key={index} className="mb-2">
                            {item.name} - {item.status}
                            <div className="mt-2">
                                <button
                                    className="bg-red-500 text-white px-2 py-1 rounded mr-2"
                                    onClick={() => handleItemStatusChange(currentOrder.id, index, 'unavailable')}
                                >
                                    Unavailable
                                </button>
                                <button
                                    className="bg-green-500 text-white px-2 py-1 rounded"
                                    onClick={() => handleItemStatusChange(currentOrder.id, index, 'complete')}
                                >
                                    Complete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="bg-gray-100 p-4 rounded mb-4">
                <h2 className="text-xl font-semibold">Pending Orders</h2>
                <ul>
                    {pendingOrders.map((order, index) => (
                        <li key={index}>Order #{order.id}</li>
                    ))}
                </ul>
            </div>
            <div className="bg-gray-100 p-4 rounded">
                <h2 className="text-xl font-semibold">Pending sync completed orders</h2>
                <ul>
                    {completedOrders.map((order, index) => (
                        <li key={index}>Order #{order.id}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default OrderQueue;