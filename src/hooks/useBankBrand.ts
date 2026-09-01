import { useEffect, useMemo, useState } from 'react';
import { getBankList } from '../services/bankVerification.service';
import type { BankListItem } from '../types/finance.types';
import { slugifyBankName } from '../utils/bankTheme';

/**
 * Tra item ngân hàng (chủ yếu để lấy `logoUrl` thật) từ tên đã lưu trong tài khoản nhận tiền.
 *
 * Vì sao cần gọi API: bảng BankAccount chỉ lưu `bankName`, không lưu logo. Danh sách ngân hàng
 * `/banks` là nguồn duy nhất có logo — chính endpoint mà dropdown chọn ngân hàng đang dùng, BE
 * đã cache 2 lớp (memory + Redis, xem BankListService) và không giới hạn role.
 *
 * Cache promise ở cấp module: mọi thẻ / mọi lần điều hướng trong một session chỉ fetch một lần.
 * Lỗi thì xoá cache để lần sau thử lại, và KHÔNG toast — logo là trang trí, mất logo thì thẻ
 * vẫn hiển thị đủ thông tin, không có gì để người dùng phải xử lý.
 */

let bankListPromise: Promise<BankListItem[]> | null = null;

const loadBankList = (): Promise<BankListItem[]> => {
  bankListPromise ??= getBankList().catch((error) => {
    bankListPromise = null;
    throw error;
  });
  return bankListPromise;
};

/** Khớp theo shortName / fullName / code đã chuẩn hoá — `bankName` vốn được lưu từ shortName. */
const matchBank = (banks: BankListItem[], bankName: string): BankListItem | null => {
  const slug = slugifyBankName(bankName);
  if (!slug) return null;

  return (
    banks.find(
      (bank) =>
        slugifyBankName(bank.shortName) === slug ||
        slugifyBankName(bank.fullName) === slug ||
        slugifyBankName(bank.code) === slug,
    ) ?? null
  );
};

export const useBankBrand = (bankName: string | null | undefined): BankListItem | null => {
  // State giữ CẢ danh sách (dữ liệu chung, không phụ thuộc `bankName`) chứ không giữ kết quả
  // khớp — nhờ vậy đổi ngân hàng chỉ cần tính lại phép khớp, không phải reset state trong effect.
  const [banks, setBanks] = useState<BankListItem[] | null>(null);

  useEffect(() => {
    if (!bankName || banks) return;

    let active = true;
    loadBankList()
      .then((list) => {
        if (active) setBanks(list);
      })
      .catch((error) => {
        console.warn('[useBankBrand] không tải được danh sách ngân hàng:', error);
      });

    return () => {
      active = false;
    };
  }, [bankName, banks]);

  return useMemo(() => (bankName && banks ? matchBank(banks, bankName) : null), [banks, bankName]);
};
