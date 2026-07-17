import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './tutorProfile.service';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupAuthInterceptor(api);

interface RequestErrorLike {
  response?: { status?: number; data?: unknown };
  message?: string;
}

/** Log lỗi request theo cùng một định dạng. */
const logRequestError = (label: string, error: unknown): void => {
  const e = error as RequestErrorLike;
  console.error(label, {
    status: e.response?.status,
    data: e.response?.data,
    message: e.message,
  });
};

export interface WalletBalanceResponse {
  balance: number;
  frozenBalance: number;
  totalBalance: number;
  lastUpdated?: string;
}

// Nạp ví (dùng trong luồng "nạp bù rồi thanh toán booking")

/** Khớp `TopupResponse` của backend (dữ liệu tạo QR nạp tiền PayOS). */
export interface TopupResponse {
  paymentLinkId: string;
  orderCode: number;
  amount: number;
  currency: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  description: string;
  expiredAt: string | null;
}

/** Khớp `TopupStatusResponse` của backend. `walletCredited` là cờ FE dựa vào để auto-pay. */
export interface TopupStatusResponse {
  orderCode: number;
  bookingId: number;
  paymentPhase: string;
  status: string;
  walletCredited: boolean;
  amount: number;
  walletBalance: number;
}

/** Tạo QR nạp đúng phần thiếu của booking; backend tự tính số tiền từ payment summary và số dư ví. */
export const createTopup = async (bookingId: number): Promise<ApiResponse<TopupResponse>> => {
  try {
    const response = await api.post(`/bookings/${bookingId}/payment/wallet-shortfall`, undefined, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error creating booking shortfall topup:', error);
    throw error;
  }
};

/** Poll trạng thái lệnh nạp bù đã được ràng buộc với booking. */
export const getTopupStatus = async (
  bookingId: number,
  orderCode: number
): Promise<ApiResponse<TopupStatusResponse>> => {
  try {
    const response = await api.get(
      `/bookings/${bookingId}/payment/wallet-shortfall/${orderCode}/status`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error fetching booking shortfall topup status:', error);
    throw error;
  }
};

/** Dùng khoản nạp bù đã hoàn tất để thanh toán đúng booking và phase đã tạo QR. */
export const applyBookingShortfallTopup = async (
  bookingId: number,
  orderCode: number
): Promise<ApiResponse<unknown>> => {
  try {
    const response = await api.post(
      `/bookings/${bookingId}/payment/wallet-shortfall/${orderCode}/apply`,
      undefined,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error applying booking shortfall topup:', error);
    throw error;
  }
};
/**
 * Get wallet balance
 */
export const getWalletBalance = async (): Promise<ApiResponse<WalletBalanceResponse>> => {
  try {
    const response = await api.get('/wallet/balance', {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error fetching wallet balance:', error);
    throw error;
  }
};

export interface TransactionHistory {
  transactionId: number;
  amount: number;
  transactionType: string;
  description: string;
  referenceId: number | null;
  referenceTable: string | null;
  createdAt: string;
}

export interface TransactionHistoryPagedResponse {
  transactions: TransactionHistory[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Get wallet transactions
 */
export const getTransactions = async (
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<TransactionHistoryPagedResponse>> => {
  try {
    const response = await api.get('/wallet/transactions', {
      headers: getAuthHeaders(),
      params: { page, pageSize },
    });

    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error fetching transactions:', error);
    throw error;
  }
};

// Chi tiết giao dịch (hoá đơn booking / tranh chấp / rút tiền)

export interface BookingInvoiceDetail {
  bookingId: number;
  paymentCode: string | null;
  subjectName: string | null;
  tutorName: string | null;
  studentName: string | null;
  totalSessions: number | null;
  pricePerHour: number | null;
  totalAmount: number | null;
  depositAmount: number | null;
  remainingAmount: number | null;
  status: string | null;
  paymentStatus: string | null;
  startDate: string | null;
  createdAt: string | null;
}

export interface DisputeTransactionDetail {
  disputeId: number;
  bookingId: number | null;
  disputeType: string | null;
  reason: string | null;
  status: string | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  refundPercentage: number | null;
  createdAt: string | null;
  resolvedAt: string | null;
}

export interface WithdrawalTransactionDetail {
  withdrawalId: number;
  amount: number;
  status: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  requestedAt: string | null;
  processedAt: string | null;
  completionNote: string | null;
}

export interface TransactionDetail {
  transactionId: number;
  amount: number;
  transactionType: string;
  description: string;
  referenceId: number | null;
  referenceTable: string | null;
  createdAt: string;
  booking: BookingInvoiceDetail | null;
  dispute: DisputeTransactionDetail | null;
  withdrawal: WithdrawalTransactionDetail | null;
}

/**
 * Get detail of a single transaction (rendered as an invoice on the FE).
 */
export const getTransactionDetail = async (
  transactionId: number
): Promise<ApiResponse<TransactionDetail>> => {
  try {
    const response = await api.get(`/wallet/transactions/${transactionId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error fetching transaction detail:', error);
    throw error;
  }
};

// Rút tiền (phụ huynh)

export interface CreateWithdrawalRequest {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface WithdrawalDetail {
  withdrawalId: number;
  amount: number;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface WithdrawalItem {
  withdrawalId: number;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt: string | null;
}

export interface WithdrawalListResponse {
  items: WithdrawalItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Create a withdrawal request (parent enters the receiving bank account).
 */
export const createWithdrawal = async (
  request: CreateWithdrawalRequest
): Promise<ApiResponse<WithdrawalDetail>> => {
  try {
    const response = await api.post('/wallet/withdrawals', request, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error creating withdrawal:', error);
    throw error;
  }
};

/**
 * Get paged list of withdrawal requests.
 */
export const getWithdrawals = async (
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<WithdrawalListResponse>> => {
  try {
    const response = await api.get('/wallet/withdrawals', {
      headers: getAuthHeaders(),
      params: { page, pageSize },
    });
    return response.data;
  } catch (error: unknown) {
    logRequestError('❌ Error fetching withdrawals:', error);
    throw error;
  }
};
