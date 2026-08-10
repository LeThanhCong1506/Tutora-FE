import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

/** Tài khoản ngân hàng dùng chung Tutor/Parent/Student — 1 tài khoản/người. */
export interface BankAccount {
    bankName: string | null;
    accountNumber: string | null;
    accountHolderName: string | null;
    bankChangedAt: string | null;
}

export interface SaveBankAccountRequest {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
}

export interface BankAccountAuditLogItem {
    /** "created" | "updated" | "deleted" */
    action: 'created' | 'updated' | 'deleted';
    oldBankName: string | null;
    oldAccountNumber: string | null;
    oldAccountHolderName: string | null;
    newBankName: string | null;
    newAccountNumber: string | null;
    newAccountHolderName: string | null;
    changedAt: string;
}

/** Chưa lưu tài khoản ngân hàng nào → BE trả các field null (không phải 404). */
export const getBankAccount = async (): Promise<BankAccount> => {
    const { data } = await api.get('/bank-account');
    return data.content;
};

/** Lịch sử thay đổi tài khoản ngân hàng của chính người dùng, mới nhất trước. */
export const getBankAccountHistory = async (): Promise<BankAccountAuditLogItem[]> => {
    const { data } = await api.get('/bank-account/history');
    return data.content ?? [];
};

/** Gửi OTP xác thực tới SĐT riêng đã xác thực của chính người dùng qua Zalo ZNS. */
export const sendBankAccountOtp = async (): Promise<void> => {
    await api.post('/bank-account/otp/send');
};

/** Xác thực mã OTP. Đúng thì BE ghi cờ duyệt cho phép lưu/xoá tài khoản ngân hàng ngay sau. */
export const verifyBankAccountOtp = async (code: string): Promise<void> => {
    await api.post('/bank-account/otp/verify', { code });
};

/** Lưu (thêm mới hoặc sửa) — BẮT BUỘC đã xác thực OTP ngay trước đó (xem useBankAccountOtp). */
export const saveBankAccount = async (request: SaveBankAccountRequest): Promise<BankAccount> => {
    const { data } = await api.put('/bank-account', request);
    return data.content;
};

/** Xoá tài khoản ngân hàng đã lưu — cùng yêu cầu OTP như lưu. */
export const deleteBankAccount = async (): Promise<void> => {
    await api.delete('/bank-account');
};
