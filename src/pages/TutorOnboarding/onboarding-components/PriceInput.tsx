import React from 'react';
import { InputNumber } from 'antd';
import styles from '../styles.module.css';
import { formatPrice } from './constants';

interface PriceInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string; // mặc định 'VND / giờ'
  presets?: number[];
}

// Quick presets + ô nhập tay. Không giới hạn trên — gia sư tự định giá theo năng lực.
// Min = 1000 để chặn giá âm hoặc quá nhỏ vô tình nhập sai.
const MIN_PRICE = 1000;

const PriceInput: React.FC<PriceInputProps> = ({ value, onChange, suffix = 'VND / giờ', presets = [] }) => {
  const fmtPreset = (n: number) =>
    n >= 1_000_000 ? `${Math.round(n / 100_000) / 10}tr` : `${Math.round(n / 1000)}k`;

  return (
    <div className={styles.pricePicker}>
      <div className={styles.priceDisplay}>
        {value != null ? formatPrice(value) : '—'} <span>{suffix}</span>
      </div>

      {presets.length > 0 && (
        <div className={styles.pricePresetRow}>
          <span className={styles.priceInputLabel}>Chọn nhanh:</span>
          <div className={styles.pricePresetList}>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`${styles.pricePresetBtn} ${value === preset ? styles.activePricePreset : ''}`}
                onClick={() => onChange(preset)}
              >
                {fmtPreset(preset)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.priceInputRow}>
        <span className={styles.priceInputLabel}>Hoặc nhập giá tùy ý:</span>
        <InputNumber<number>
          min={MIN_PRICE}
          step={10_000}
          value={value ?? undefined}
          onChange={(v) => onChange(v ?? null)}
          formatter={(v) => (v ? formatPrice(Number(v)) : '')}
          parser={(v) => (v ? Number(v.replace(/\D/g, '')) : 0)}
          addonAfter="VND"
          style={{ width: 200 }}
          placeholder="Nhập số tiền"
        />
      </div>
    </div>
  );
};

export default PriceInput;
