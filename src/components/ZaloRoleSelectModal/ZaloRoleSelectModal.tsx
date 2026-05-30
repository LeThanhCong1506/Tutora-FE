import { useState } from 'react';
import './ZaloRoleSelectModal.css';

interface Props {
  onSelect: (role: 'Parent' | 'Student' | 'Tutor') => void;
  onCancel: () => void;
}

const ROLES = [
  { value: 'Parent' as const, label: 'Phụ huynh', icon: '👨‍👩‍👧', desc: 'Tìm gia sư cho con' },
  { value: 'Student' as const, label: 'Học sinh', icon: '🎓', desc: 'Tìm gia sư cho bản thân' },
  { value: 'Tutor' as const, label: 'Gia sư', icon: '📚', desc: 'Đăng ký dạy học' },
];

export default function ZaloRoleSelectModal({ onSelect, onCancel }: Props) {
  const [selected, setSelected] = useState<'Parent' | 'Student' | 'Tutor' | null>(null);

  return (
    <div className="zrs-overlay">
      <div className="zrs-modal">
        <h3 className="zrs-title">Bạn là ai?</h3>
        <p className="zrs-subtitle">Chọn vai trò để tiếp tục đăng nhập bằng Zalo</p>
        <div className="zrs-options">
          {ROLES.map(r => (
            <button
              key={r.value}
              className={`zrs-option${selected === r.value ? ' zrs-option--active' : ''}`}
              onClick={() => setSelected(r.value)}
            >
              <span className="zrs-option-icon">{r.icon}</span>
              <span className="zrs-option-label">{r.label}</span>
              <span className="zrs-option-desc">{r.desc}</span>
            </button>
          ))}
        </div>
        <div className="zrs-actions">
          <button className="zrs-btn zrs-btn--cancel" onClick={onCancel}>Hủy</button>
          <button
            className="zrs-btn zrs-btn--confirm"
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
