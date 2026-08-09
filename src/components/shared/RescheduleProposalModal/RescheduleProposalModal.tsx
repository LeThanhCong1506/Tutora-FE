import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import { toast } from 'react-toastify';

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
 * và khớp màu CTA của portal mình). Pattern datetime-local + kẹp `min` tham khảo từ `NoShowActionModal.tsx`.
 */
const RescheduleProposalModal: React.FC<RescheduleProposalModalProps> = ({
    open,
    currentScheduledStart,
    onSubmit,
    onCancel,
    accentColor = '#1a2238',
}) => {
    const [proposedScheduledStart, setProposedScheduledStart] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setProposedScheduledStart('');
            setReason('');
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!proposedScheduledStart) {
            toast.warn('Vui lòng chọn thời gian đề xuất.');
            return;
        }

        const scheduledDate = new Date(proposedScheduledStart);
        if (Number.isNaN(scheduledDate.getTime())) {
            toast.warn('Thời gian không hợp lệ.');
            return;
        }
        if (scheduledDate.getTime() <= Date.now()) {
            toast.warn('Thời gian đề xuất phải ở trong tương lai.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit(scheduledDate.toISOString(), reason.trim() || undefined);
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
                <input
                    id="reschedule-proposed-start"
                    type="datetime-local"
                    value={proposedScheduledStart}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                    onChange={(event) => setProposedScheduledStart(event.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d9d9d9', borderRadius: '6px' }}
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
                        style={{ background: accentColor, borderColor: accentColor }}
                    >
                        Gửi đề xuất
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default RescheduleProposalModal;
