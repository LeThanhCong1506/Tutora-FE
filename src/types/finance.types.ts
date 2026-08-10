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

// Bank account types moved to services/bankAccount.service.ts (BankAccount, SaveBankAccountRequest)
// — now shared across Tutor/Parent/Student, not tutor-specific.

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
    claimedAt: string | null;
    completionNote: string | null;
    rejectionReason: string | null;
    transactionId: string | null;
    paidAt: string | null;
    proofImageUrl: string | null;
}

/**
 * Request model for creating a withdrawal
 */
export interface CreateWithdrawalRequest {
    amount: number;
}
