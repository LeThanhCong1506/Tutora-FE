import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * This page is the PayOS return URL target. After PayOS payment completes,
 * this page is loaded in the new tab. It saves the payment result to
 * localStorage so the original page (PaymentModal) can detect it, then
 * auto-closes the tab.
 */
const PaymentCallback = () => {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const status = searchParams.get('status');
        const code = searchParams.get('code');
        const orderCode = searchParams.get('orderCode');
        const cancel = searchParams.get('cancel');
        const isPaid = status === 'PAID' && code === '00';

        console.log('[PaymentCallback] Received:', { status, code, orderCode, cancel, isPaid });

        // Save result to localStorage - the original tab listens for this
        localStorage.setItem('payos_payment_result', JSON.stringify({
            type: 'PAYOS_PAYMENT_RESULT',
            isPaid,
            cancel: cancel === 'true',
            status,
            orderCode,
            timestamp: Date.now(),
        }));

        // Auto-close this tab after a short delay
        setTimeout(() => {
            window.close();
            // Fallback nếu window.close() thất bại (tab không phải popup)
            setTimeout(() => {
                window.location.href = '/parent-portal/booking';
            }, 500);
        }, 1500);
    }, [searchParams]);

    const isPaid = searchParams.get('status') === 'PAID' && searchParams.get('code') === '00';
    const isCancelled = searchParams.get('cancel') === 'true';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            background: '#f9fafb',
            textAlign: 'center',
            padding: 20,
        }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
                {isPaid ? '✅' : isCancelled ? '❌' : '⏳'}
            </div>
            <h2 style={{ color: '#1a2238', margin: '0 0 8px' }}>
                {isPaid
                    ? 'Thanh toán thành công!'
                    : isCancelled
                        ? 'Thanh toán đã bị hủy'
                        : 'Đang xử lý...'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
                Tab này sẽ tự động đóng...
            </p>
        </div>
    );
};

export default PaymentCallback;
