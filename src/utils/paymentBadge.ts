/**
 * Shared payment-badge resolver used by booking list / detail pages
 * (StudentBooking, ParentBooking/Details, …).
 *
 * Centralises two rules that several pages got wrong:
 *
 *   1. Hide the payment badge entirely for "dead" bookings (cancelled /
 *      rejected / payment_timeout). The booking has terminated, so its
 *      payment state is irrelevant noise — showing "Pending" next to a
 *      cancelled booking is what BUG-010 reported.
 *
 *   2. Never render a raw English BE value in the UI. A page that maps
 *      only some statuses and lets the rest fall through will leak
 *      "DepositEscrowed" etc. to the screen. We map every status BE
 *      actually assigns, and return null for anything else so callers
 *      hide the badge rather than printing the raw string.
 */

export type PaymentBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface PaymentBadgeDisplay {
    /** Vietnamese label shown to users */
    label: string;
    /** Semantic tone — callers map this to their own colors / icons */
    tone: PaymentBadgeTone;
}

/**
 * Booking statuses where the payment badge should be hidden.
 * These are terminal states — no further payment will ever happen.
 */
const TERMINAL_BOOKING_STATUSES = new Set([
    'cancelled',
    'rejected',
    'payment_timeout',
]);

/**
 * Map of every payment status BE may return to its Vietnamese label + tone.
 *
 * Chỉ 3 giá trị này tồn tại: PaymentStatus.cs khai báo thêm Holding/Paid nhưng
 * không code nào gán chúng, còn "DepositPaid" là BookingStatus ("deposit_paid")
 * chứ không phải payment status — bản trước map nhầm cả hai nhóm.
 * Tra cứu `.toLowerCase()` vì BE trộn PascalCase với lowercase.
 */
const PAYMENT_STATUS_MAP: Record<string, PaymentBadgeDisplay> = {
    // Chưa trả đồng nào — gán lúc tạo booking.
    pending: { label: 'Chưa thanh toán', tone: 'warning' },

    // Trả xong buổi 1, còn nợ phần còn lại.
    depositescrowed: { label: 'Đã thanh toán buổi 1', tone: 'success' },

    // Đã trả đủ 100%.
    escrowed: { label: 'Đã thanh toán đủ', tone: 'success' },
};

/**
 * Resolve a booking's payment state into a badge to render, or null when
 * no badge should be shown.
 *
 * @param bookingStatus  Top-level booking status (lowercase snake_case from BE)
 * @param paymentStatus  Payment status (Booking.Paymentstatus, PascalCase from BE)
 * @returns Display info, or `null` if the badge must be hidden
 */
export function getPaymentBadge(
    bookingStatus: string | null | undefined,
    paymentStatus: string | null | undefined,
): PaymentBadgeDisplay | null {
    // Empty / nullish payment status → nothing to show.
    if (!paymentStatus) return null;

    // Booking is dead — payment is moot.
    if (bookingStatus && TERMINAL_BOOKING_STATUSES.has(bookingStatus)) return null;

    // Unknown status → hide rather than leaking raw BE strings to UX.
    return PAYMENT_STATUS_MAP[paymentStatus.toLowerCase()] ?? null;
}

/**
 * Nhãn tiếng Việt cho trạng thái thanh toán
 */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
    pending: 'Chưa thanh toán',
    depositescrowed: 'Đã thanh toán buổi 1',
    escrowed: 'Đã thanh toán đủ',
};

/**
 * Nhãn tiếng Việt cho vòng đời escrow của booking
 */
const ESCROW_STATUS_LABELS: Record<string, string> = {
    holding: 'Đang giữ',
    released: 'Đã giải ngân',
    refunded: 'Đã hoàn tiền',
};

/** Nhãn thanh toán dạng text; `fallback` khi không có giá trị hoặc chưa map. */
export function getPaymentStatusLabel(status?: string | null, fallback = '—'): string {
    if (!status) return fallback;
    return PAYMENT_STATUS_LABELS[status.toLowerCase()] ?? fallback;
}

/** Nhãn escrow dạng text; `fallback` khi không có giá trị hoặc chưa map. */
export function getEscrowStatusLabel(status?: string | null, fallback = '—'): string {
    if (!status) return fallback;
    return ESCROW_STATUS_LABELS[status.toLowerCase()] ?? fallback;
}
