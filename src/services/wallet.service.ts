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

export interface WalletBalanceResponse {
  balance: number;
  frozenBalance: number;
  totalBalance: number;
  lastUpdated?: string;
}

/**
 * Get wallet balance
 */
export const getWalletBalance = async (): Promise<ApiResponse<WalletBalanceResponse>> => {
  try {
    const response = await api.get('/wallet/balance', {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching wallet balance:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  };
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
  } catch (error: any) {
    console.error('❌ Error fetching transactions:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};
