import React, { useEffect, useRef, useState } from 'react';
import { Select } from 'antd';
import { toast } from 'react-toastify';
import { getBankList } from '../../services/bankVerification.service';
import type { BankListItem } from '../../types/finance.types';
import { getApiErrorMessage } from '../../utils/apiError';

interface Props {
  value?: string;
  onChange?: (value: string, bank: BankListItem) => void;
  placeholder?: string;
  disabled?: boolean;
  initialBankName?: string;
}

interface BankOptionContentProps {
  bank: BankListItem;
  selected?: boolean;
}

const BankLogo: React.FC<{ bank: BankListItem }> = ({ bank }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const initials =
    bank.shortName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || 'NH';

  return (
    <span className="finance-bank-option__logo" aria-hidden="true">
      {bank.logoUrl && !imageFailed ? (
        <img src={bank.logoUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <span className="finance-bank-option__logo-fallback">{initials}</span>
      )}
    </span>
  );
};

const BankOptionContent: React.FC<BankOptionContentProps> = ({ bank, selected = false }) => (
  <div className={`finance-bank-option${selected ? ' finance-bank-option--selected' : ''}`}>
    <BankLogo key={bank.logoUrl ?? bank.code} bank={bank} />

    <span className="finance-bank-option__copy">
      <span className="finance-bank-option__name">{bank.shortName}</span>
      <span className="finance-bank-option__full-name">{bank.fullName}</span>
    </span>

    {bank.supportsInstantTransfer && <span className="finance-bank-option__badge">24/7</span>}
  </div>
);

const BankSelectDropdown: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'Chọn ngân hàng',
  disabled,
  initialBankName,
}) => {
  const [banks, setBanks] = useState<BankListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const initialSelectionApplied = useRef(false);

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true);
      try {
        const data = await getBankList();
        // Sort: Instant transfer first, then by short name
        const sortedBanks = data.sort((a, b) => {
          if (a.supportsInstantTransfer !== b.supportsInstantTransfer) {
            return a.supportsInstantTransfer ? -1 : 1;
          }
          return a.shortName.localeCompare(b.shortName);
        });
        setBanks(sortedBanks);
      } catch (error) {
        console.error('Failed to fetch banks:', error);
        toast.error(getApiErrorMessage(error, 'Không tải được danh sách ngân hàng. Vui lòng thử lại.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  useEffect(() => {
    if (initialSelectionApplied.current || value || !initialBankName || banks.length === 0) return;

    const normalizedName = initialBankName.trim().toLowerCase();
    const existingBank = banks.find(
      (bank) => bank.shortName.toLowerCase() === normalizedName || bank.fullName.toLowerCase() === normalizedName,
    );

    if (existingBank && onChange) {
      initialSelectionApplied.current = true;
      onChange(existingBank.code, existingBank);
    }
  }, [banks, initialBankName, onChange, value]);

  const handleChange = (val: string) => {
    const selectedBank = banks.find((b) => b.code === val);
    if (selectedBank && onChange) {
      onChange(val, selectedBank);
    }
  };

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      optionFilterProp="label"
      loading={loading}
      disabled={disabled || loading}
      onChange={handleChange}
      size="large"
      className="finance-bank-select"
      classNames={{ popup: { root: 'finance-bank-select-dropdown' } }}
      listHeight={320}
      virtual={false}
      style={{ width: '100%' }}
      labelRender={({ value: selectedValue, label }) => {
        const selectedBank = banks.find((bank) => bank.code === selectedValue);

        return selectedBank ? <BankOptionContent bank={selectedBank} selected /> : label;
      }}
      filterOption={(input, option) => {
        const label = (option?.label as string) || '';
        return label.toLowerCase().includes(input.toLowerCase());
      }}
    >
      {banks.map((bank) => (
        <Select.Option key={bank.code} value={bank.code} label={`${bank.shortName} - ${bank.fullName}`}>
          <BankOptionContent bank={bank} />
        </Select.Option>
      ))}
    </Select>
  );
};

export default BankSelectDropdown;
