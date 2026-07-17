/**
 * Financial summary for tutor dashboard
 */
export interface FinanceSummary {
    availableBalance: number;
    frozenBalance: number;
    totalBalance: number;
    totalEarned: number;
    pendingSettlement: number;
    lastWithdrawalAt: string | null;
}

/**
 * Earnings data for charts
 */
export interface EarningsItem {
    date: string;
    amount: number;
}

export interface EarningsResponse {
    items: EarningsItem[];
}

/**
 * Individual transaction record
 */
export interface TutorTransaction {
    transactionId: number;
    amount: number;
    transactionType: string;
    description: string;
    referenceId: number | null;
    referenceTable: string | null;
    createdAt: string;
}

/**
 * Paged transaction history response
 */
export interface TransactionPagedResponse {
    transactions: TutorTransaction[];
    totalCount: number;
    page: number;
    pageSize: number;
}

/**
 * Tutor bank information
 */
export interface BankInfo {
    bankName: string | null;
    accountNumber: string | null;
    accountHolderName: string | null;
    bankChangedAt: string | null;
}

/**
 * List of supported banks
 */
export interface BankListItem {
    code: string;
    shortName: string;
    fullName: string;
    logoUrl: string | null;
    bin: string | null;
    supportsInstantTransfer: boolean;
}

/**
 * Individual withdrawal request item
 */
export interface WithdrawalItem {
    withdrawalId: number;
    amount: number;
    status: string;
    requestedAt: string;
    processedAt: string | null;
}

/**
 * Paged list of withdrawal requests
 */
export interface WithdrawalListResponse {
    items: WithdrawalItem[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Detailed withdrawal request information
 */
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

/**
 * Request model for creating a withdrawal
 */
export interface CreateWithdrawalRequest {
    amount: number;
}

/**
 * Request model for updating bank info
 */
export interface UpdateBankInfoRequest {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
}
