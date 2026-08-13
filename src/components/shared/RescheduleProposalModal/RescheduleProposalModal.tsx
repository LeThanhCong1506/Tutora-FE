import React, { useEffect, useState } from 'react';
import { Modal, Button, DatePicker } from 'antd';
import { toast } from 'react-toastify';
import dayjs, { type Dayjs } from 'dayjs';

export interface RescheduleProposalModalProps {
    open: boolean;
    /** Giờ bắt đầu hiện tại của buổi học (ISO) — hiển thị để đối chiếu, không cho chọn trùng. */
    currentScheduledStart: string;
    onSubmit: (proposedScheduledStart: string, reason?: string) => Promise<void>;
    onCancel: () => void;
    /**
     * Màu nút hành động chính — mỗi portal có màu CTA riêng (Tutor: navy `#1a2238` như
     * `primaryButton`; Parent: nâu `#3e2f28` như `.primaryAction`; Student: tím indigo
     * `#6366F1` như các nút hành động khác trên trang chi tiết). Mặc định dùng navy vì đó
     * là màu primary xuất hiện nhiều nhất trong toàn app (`disputePresentation.ts` và nhiều
     * trang khác), phòng khi có nơi gọi quên truyền.
     */
    accentColor?: string;
}

/**
 * Popup đề xuất dời buổi học sang giờ khác — dùng chung cho Tutor/Student/Parent, chỉ khác
 * hàm `onSubmit` và `accentColor` mỗi portal tự truyền vào (gọi đúng endpoint `propose*Reschedule`
 * và khớp màu CTA của portal mình). Dùng AntD `DatePicker` (định dạng dd/mm/yyyy, giờ VN) thay vì
 * input `datetime-local` gốc để đồng bộ style với phần còn lại của app — pattern tham khảo từ
 * `ReportNoShowModal.tsx`.
 */
const RescheduleProposalModal: React.FC<RescheduleProposalModalProps> = ({
    open,
    currentScheduledStart,
    onSubmit,
    onCancel,
    accentColor = '#1a2238',
}) => {
    const [proposedScheduledStart, setProposedScheduledStart] = useState<Dayjs | null>(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setProposedScheduledStart(null);
            setReason('');
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!proposedScheduledStart) {
            toast.warn('Vui lòng chọn thời gian đề xuất.');
            return;
        }
        if (proposedScheduledStart.valueOf() <= Date.now()) {
            toast.warn('Thời gian đề xuất phải ở trong tương lai.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit(proposedScheduledStart.toISOString(), reason.trim() || undefined);
            toast.success('Đã gửi đề xuất đổi lịch, đang chờ phản hồi.');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể gửi đề xuất đổi lịch. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const currentDisplay = currentScheduledStart
        ? new Date(currentScheduledStart).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          })
        : '';

    return (
        <Modal title="Đề xuất đổi lịch học" open={open} onCancel={onCancel} footer={null} centered>
            <div style={{ padding: '16px 0' }}>
                {currentDisplay && (
                    <p style={{ marginBottom: '16px', color: '#666' }}>
                        Giờ học hiện tại: <strong>{currentDisplay}</strong>
                    </p>
                )}

                <label htmlFor="reschedule-proposed-start" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Thời gian đề xuất mới
                </label>
                <DatePicker
                    id="reschedule-proposed-start"
                    showTime={{ format: 'HH:mm' }}
                    format="HH:mm DD/MM/YYYY"
                    placeholder="Chọn giờ và ngày học mới"
                    value={proposedScheduledStart}
                    disabledDate={(current) => !!current && current.isBefore(dayjs(), 'day')}
                    onChange={(value) => setProposedScheduledStart(value)}
                    style={{ width: '100%' }}
                />

                <label htmlFor="reschedule-reason" style={{ display: 'block', margin: '16px 0 8px', fontWeight: 600 }}>
                    Lý do (không bắt buộc)
                </label>
                <textarea
                    id="reschedule-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Vd: bận việc đột xuất, xin dời buổi học sang giờ khác..."
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                    }}
                />

                <p style={{ marginTop: '12px', marginBottom: 0, color: '#888', fontSize: '12px' }}>
                    Đề xuất sẽ được gửi cho phía còn lại. Buổi học chỉ đổi giờ khi họ đồng ý.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Button onClick={onCancel}>Hủy</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                        disabled={!proposedScheduledStart}
                        style={proposedScheduledStart ? { background: accentColor, borderColor: accentColor } : undefined}
                    >
                        Gửi đề xuất
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RescheduleProposalModal;
