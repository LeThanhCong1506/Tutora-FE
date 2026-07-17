/* eslint-disable no-useless-catch */
import axios from 'axios';
import { getCurrentUser } from './auth.service';
import type { BankListItem } from '../types/finance.types';

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
