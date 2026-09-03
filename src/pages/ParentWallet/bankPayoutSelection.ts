import type { TransactionHistory } from '../../services/wallet.service';

/**
 * Tham số `bankPayout` của TransactionDetailModal cho một dòng "Chuyển tiền ngân hàng".
 */
export const toBankPayoutProps = (tx: TransactionHistory) => {
  if (tx.source !== 'Payment' || tx.referenceId == null) return undefined;

  return {
    withdrawalId: tx.referenceId,
    amount: tx.amount,
    createdAt: tx.createdAt,
    description: tx.description,
  };
};
