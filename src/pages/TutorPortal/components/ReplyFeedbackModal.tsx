import React, { useState, useEffect } from 'react';
import { Modal, Input, Rate, Spin } from 'antd';
import { toast } from 'react-toastify';
import { replyFeedback, type ReplyFeedbackRequest } from '../../../services/feedback.service';
import { useFormDraft } from '../../../hooks/useFormDraft';

const { TextArea } = Input;

interface ReplyFeedbackModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    feedbackId: number;
    // Original feedback info
    parentName?: string;
    rating?: number;
    comment?: string;
    createdAt?: string;
}

const ReplyFeedbackModal: React.FC<ReplyFeedbackModalProps> = ({
    open, onClose, onSuccess, feedbackId, parentName, rating, comment, createdAt,
}) => {
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<{ replyText: string }>(`draft_reply_${feedbackId}`);

    // Load draft on open
    useEffect(() => {
        if (open) {
            const draft = loadDraft();
            if (draft?.replyText) {
                setReplyText(draft.replyText);
            }
        }
    }, [open, loadDraft]);

    // Auto-save draft on text change
    useEffect(() => {
        if (open && replyText) {
            saveDraft({ replyText });
        }
    }, [replyText, open, saveDraft]);

    const handleSubmit = async () => {
        if (!replyText.trim()) {
            toast.warn('Vui lòng nhập nội dung phản hồi.');
            return;
        }

        try {
            setSubmitting(true);
            const request: ReplyFeedbackRequest = {
                replyComment: replyText.trim(),
            };
            await replyFeedback(feedbackId, request);
            toast.success('Đã gửi phản hồi thành công!');
            clearDraft();
            setReplyText('');
            onSuccess();
        } catch (error) {
            toast.error('Không thể gửi phản hồi. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            title={null}
            footer={null}
            width={500}
            centered
            destroyOnClose
        >
            <div style={{ padding: '8px 0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2238', margin: '0 0 20px 0' }}>
                    Phản hồi đánh giá
                </h2>

                {/* Original Feedback */}
                <div style={{
                    background: '#f9fafb', borderRadius: '10px', padding: '16px',
                    marginBottom: '20px', border: '1px solid rgba(26,34,56,0.06)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#E8E5FF', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#4F46E5',
                        }}>
                            {parentName?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a2238' }}>
                                {parentName || 'Phụ huynh'}
                            </span>
                            {createdAt && (
                                <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                                    {new Date(createdAt).toLocaleDateString('vi-VN')}
                                </span>
                            )}
                        </div>
                    </div>
                    {rating !== undefined && (
                        <Rate disabled value={rating} style={{ fontSize: '14px', marginBottom: '6px' }} />
                    )}
                    {comment && (
                        <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.5 }}>
                            "{comment}"
                        </p>
                    )}
                </div>

                {/* Reply */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1a2238', marginBottom: '6px' }}>
                        Phản hồi của bạn
                    </label>
                    <TextArea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Cảm ơn phụ huynh đã đánh giá. Tôi sẽ tiếp tục cố gắng..."
                        rows={3}
                        maxLength={500}
                        showCount
                        style={{ borderRadius: '8px' }}
                    />
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: '1px solid #e8e8e8',
                            background: '#fff', color: '#666', fontSize: '14px', cursor: 'pointer',
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !replyText.trim()}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none',
                            background: !replyText.trim() ? '#ccc' : '#4F46E5', color: '#fff',
                            fontSize: '14px', fontWeight: 500,
                            cursor: submitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? <Spin size="small" /> : 'Gửi phản hồi'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ReplyFeedbackModal;
