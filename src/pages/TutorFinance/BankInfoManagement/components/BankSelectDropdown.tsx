import React, { useEffect, useState } from 'react';
import { Select, Avatar, Space } from 'antd';
import { getBankList } from '../../../../services/bankVerification.service';
import type { BankListItem } from '../../../../types/finance.types';

interface Props {
    value?: string;
    onChange?: (value: string, bank: BankListItem) => void;
    placeholder?: string;
    disabled?: boolean;
}

const BankSelectDropdown: React.FC<Props> = ({ value, onChange, placeholder = 'Chọn ngân hàng', disabled }) => {
    const [banks, setBanks] = useState<BankListItem[]>([]);
    const [loading, setLoading] = useState(false);

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
            } finally {
                setLoading(false);
            }
        };

        fetchBanks();
    }, []);

    const handleChange = (val: string) => {
        const selectedBank = banks.find(b => b.code === val);
        if (selectedBank && onChange) {
            onChange(val, selectedBank);
        }
    };

    return (
        <Select
            showSearch
            value={value}
            placeholder={placeholder}
            optionFilterProp="children"
            loading={loading}
            disabled={disabled || loading}
            onChange={handleChange}
            style={{ width: '100%' }}
            filterOption={(input, option) => {
                const label = (option?.label as string) || '';
                return label.toLowerCase().includes(input.toLowerCase());
            }}
        >
            {banks.map((bank) => (
                <Select.Option key={bank.code} value={bank.code} label={`${bank.shortName} - ${bank.fullName}`}>
                    <Space>
                        {bank.logoUrl ? (
                            <Avatar src={bank.logoUrl} size="small" shape="square" />
                        ) : (
                            <Avatar size="small" shape="square">{bank.shortName[0]}</Avatar>
                        )}
                        <div>
                            <div style={{ fontWeight: 500 }}>{bank.shortName}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{bank.fullName}</div>
                        </div>
                        {bank.supportsInstantTransfer && (
                            <span style={{ fontSize: '10px', background: '#e6f7ff', color: '#1890ff', padding: '0 4px', borderRadius: '2px' }}>
                                24/7
                            </span>
                        )}
                    </Space>
                </Select.Option>
            ))}
        </Select>
    );
};

export default BankSelectDropdown;
