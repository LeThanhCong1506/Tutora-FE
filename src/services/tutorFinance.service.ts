/* eslint-disable no-useless-catch */
import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import type {
    FinanceSummary,
    EarningsResponse,
    TransactionPagedResponse,
    TutorTransaction,
    BankInfo,
    WithdrawalListResponse,
    WithdrawalDetail,
    CreateWithdrawalRequest
} from '../types/finance.types';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

/** Check if error is a 404 (wallet/resource not found) */
const is404 = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.response?.status === 404;

/** Default empty summary for tutors without a wallet */
const EMPTY_SUMMARY: FinanceSummary = {
    balance: 0,
    frozenBalance: 0,
    totalEarned: 0,
    pendingSettlement: 0,
    lastWithdrawalAt: null,
};

/**
 * Get financial summary (balances, total earned)
 * Returns empty summary if tutor wallet doesn't exist yet
 */
export const getFinanceSummary = async (): Promise<FinanceSummary> => {
    try {
        const { data } = await api.get('/tutor/finance/summary');
        return data.content;
    } catch (error) {
        if (is404(error)) return EMPTY_SUMMARY;
        throw error;
    }
};

/**
 * Get earnings history for charts
 * @param period - 'week', 'month', 'year'
 */
export const getEarnings = async (
    period: string = 'month',
    from?: string,
    to?: string
): Promise<EarningsResponse> => {
    try {
        const { data } = await api.get('/tutor/finance/earnings', {
            params: { period, from, to },
        });
        return data.content;
    } catch (error) {
        if (is404(error)) return { items: [] };
        throw error;
    }
};

/**
 * Get paged transaction history
 */
export const getTransactions = async (params: {
    page?: number;
    pageSize?: number;
    type?: string;
    from?: string;
    to?: string;
}): Promise<TransactionPagedResponse> => {
    try {
        const { data } = await api.get('/tutor/finance/transactions', { params });
        return data.content;
    } catch (error) {
        if (is404(error)) return { transactions: [], totalCount: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 20 };
        throw error;
    }
};

/**
 * Get transaction detail
 */
export const getTransactionDetail = async (id: number): Promise<TutorTransaction> => {
    try {
        const { data } = await api.get(`/tutor/finance/transactions/${id}`);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get current bank info
 */
export const getBankInfo = async (): Promise<BankInfo> => {
    try {
        const { data } = await api.get('/tutor/bank');
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Update bank info
 */
export const updateBankInfo = async (request: Partial<BankInfo>): Promise<BankInfo> => {
    const { data } = await api.put('/tutor/bank', request);
    return data.content;
};

/**
 * Create a withdrawal request
 */
export const createWithdrawal = async (request: CreateWithdrawalRequest): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/tutor/withdrawals', request);
    return data;
};

/**
 * Get paged list of withdrawals
 */
export const getWithdrawals = async (page: number = 1, pageSize: number = 20): Promise<WithdrawalListResponse> => {
    try {
        const { data } = await api.get('/tutor/withdrawals', {
            params: { page, pageSize },
        });
        return data.content;
    } catch (error) {
        if (is404(error)) return { items: [], total: 0, page, pageSize };
        throw error;
    }
};

/**
 * Get withdrawal details
 */
export const getWithdrawalDetail = async (id: number): Promise<WithdrawalDetail> => {
    try {
        const { data } = await api.get(`/tutor/withdrawals/${id}`);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Cancel a pending/delayed withdrawal
 */
export const cancelWithdrawal = async (id: number): Promise<void> => {
    try {
        await api.delete(`/tutor/withdrawals/${id}`);
    } catch (error) {
        throw error;
    }
};
