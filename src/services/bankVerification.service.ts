/* eslint-disable no-useless-catch */
import axios from 'axios';
import { getCurrentUser } from './auth.service';
import type {
    BankVerificationStatus,
    BankListItem
} from '../types/finance.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
    (config) => {
        const user = getCurrentUser();
        if (user?.accessToken) {
            config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Step 1: Request bank verification (triggers micro-transfer)
 */
export const requestVerification = async (params: {
    bankCode: string;
    accountNumber: string;
}): Promise<any> => {
    try {
        const { data } = await api.post('/tutor/bank-verification/request', params);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Step 2: Confirm verification with code from transfer description
 */
export const confirmVerification = async (params: {
    verificationCode: string;
}): Promise<any> => {
    try {
        const { data } = await api.post('/tutor/bank-verification/confirm', params);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get current verification status
 */
export const getVerificationStatus = async (): Promise<BankVerificationStatus> => {
    try {
        const { data } = await api.get('/tutor/bank-verification/status');
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get list of supported banks for dropdown
 */
export const getBankList = async (): Promise<BankListItem[]> => {
    try {
        const { data } = await api.get('/banks');
        return data.content;
    } catch (error) {
        throw error;
    }
};
