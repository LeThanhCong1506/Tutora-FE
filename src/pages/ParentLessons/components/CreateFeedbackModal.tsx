import React, { useState, useEffect } from 'react';
import { Modal, Rate, Input, Spin } from 'antd';
import { toast } from 'react-toastify';
import { createFeedback, type CreateFeedbackRequest } from '../../../services/feedback.service';
import { useFormDraft } from '../../../hooks/useFormDraft';

const { TextArea } = Input;

interface CreateFeedbackModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    feedbackType?: 'post_lesson' | 'early_termination';
    lessonId?: number;
    bookingId: number;
    tutorId: string;
    tutorName?: string;
    subjectName?: string;
}

const CreateFeedbackModal: React.FC<CreateFeedbackModalProps> = ({
    open, onClose, onSuccess, feedbackType = 'post_lesson', lessonId, bookingId, tutorId, tutorName, subjectName,
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [initialGoal, setInitialGoal] = useState('');
    const [actualResult, setActualResult] = useState('');
    const [courseDuration, setCourseDuration] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { saveDraft, loadDraft, clearDraft } = useFormDraft<{
        rating: number; comment: string; initialGoal: string; actualResult: string; courseDuration: string;
    }>(`draft_feedback_${bookingId}`);

    // Load draft on open
    useEffect(() => {
        if (open) {
            const draft = loadDraft();
            if (draft) {
                setRating(draft.rating || 0);
                setComment(draft.comment || '');
                setInitialGoal(draft.initialGoal || '');
                setActualResult(draft.actualResult || '');
                setCourseDuration(draft.courseDuration || '');
            }
        }
    }, [open, loadDraft]);

    // Auto-save draft on field changes
    useEffect(() => {
        if (open) {
            saveDraft({ rating, comment, initialGoal, actualResult, courseDuration });
        }
    }, [rating, comment, initialGoal, actualResult, courseDuration, open, saveDraft]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.warn('Vui lòng chọn số sao đánh giá.');
            return;
        }

        try {
            setSubmitting(true);
            const request: CreateFeedbackRequest = {
                lessonId: feedbackType === 'post_lesson' ? lessonId : undefined,
                bookingId,
                toUserId: tutorId,
                rating,
                comment: comment.trim() || undefined,
                feedbackType,
                initialGoal: feedbackType === 'early_termination' && initialGoal.trim() ? initialGoal.trim() : undefined,
                actualResult: feedbackType === 'early_termination' && actualResult.trim() ? actualResult.trim() : undefined,
                courseDuration: feedbackType === 'early_termination' && courseDuration.trim() ? courseDuration.trim() : undefined,
            };
            await createFeedback(request);
            toast.success('Đã gửi đánh giá thành công!');
            clearDraft();
            handleReset();
            onSuccess();
        } catch (error) {
            toast.error('Không thể gửi đánh giá. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setRating(0);
        setComment('');
        setInitialGoal('');
        setActualResult('');
        setCourseDuration('');
    };

    const handleCancel = () => {
        onClose();
    };

    const ratingLabels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            title={null}
            footer={null}
            width={480}
            centered
            destroyOnHidden
        >
            <div style={{ padding: '8px 0' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2238', margin: '0 0 4px 0' }}>
                        {feedbackType === 'early_termination' ? 'Đánh giá khóa học' : 'Đánh giá buổi học'}
                    </h2>
                    {tutorName && (
                        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                            Gia sư: <strong>{tutorName}</strong>
                            {subjectName && <> · {subjectName}</>}
                        </p>
                    )}
                </div>

                {/* Rating */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <Rate
                        value={rating}
                        onChange={setRating}
                        style={{ fontSize: '32px' }}
                    />
                    {rating > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '13px', color: '#F59E0B', fontWeight: 500 }}>
                            {ratingLabels[rating]}
                        </div>
                    )}
                </div>

                {/* Review Fields (Early Termination) */}
                {feedbackType === 'early_termination' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1a2238', marginBottom: '6px' }}>
                                Mục tiêu ban đầu (không bắt buộc)
                            </label>
                            <Input
                                value={initialGoal}
                                onChange={(e) => setInitialGoal(e.target.value)}
                                placeholder="Ví dụ: Cải thiện giao tiếp tiếng Anh..."
                                maxLength={200}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1a2238', marginBottom: '6px' }}>
                                Kết quả thực tế đạt được (không bắt buộc)
                            </label>
                            <Input
                                value={actualResult}
                                onChange={(e) => setActualResult(e.target.value)}
                                placeholder="Ví dụ: Đã có thể phản xạ nhanh hơn..."
                                maxLength={200}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1a2238', marginBottom: '6px' }}>
                                Thời gian đã học (không bắt buộc)
                            </label>
                            <Input
                                value={courseDuration}
                                onChange={(e) => setCourseDuration(e.target.value)}
                                placeholder="Ví dụ: 2 tháng, 10 buổi..."
                                maxLength={100}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Comment */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#1a2238', marginBottom: '6px' }}>
                        Nhận xét chung (không bắt buộc)
                    </label>
                    <TextArea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Chia sẻ trải nghiệm tổng quan của bạn..."
                        rows={4}
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
                        disabled={submitting || rating === 0}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none',
                            background: rating === 0 ? '#ccc' : '#4F46E5', color: '#fff',
                            fontSize: '14px', fontWeight: 500,
                            cursor: submitting || rating === 0 ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? <Spin size="small" /> : 'Gửi đánh giá'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CreateFeedbackModal;
