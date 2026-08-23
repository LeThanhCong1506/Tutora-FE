import { useCallback, useEffect, useState } from 'react';
import { Button, Spin } from 'antd';
import { toast } from 'react-toastify';
import {
    confirmSkipContinuation,
    getSkipContinuationStatus,
    type ClassSessionSkipContinuationResponse,
} from '../../../services/classSession.service';

export interface SkipContinuationCardProps {
    /** ID của buổi phụ (Iscontinuation=true) — không phải ID buổi gốc bị ngắt. */
    continuationSessionId: number;
    /** Vai trò của người đang xem trang này — quyết định label hiển thị cho phía còn lại. */
    isTutor: boolean;
    /** Gọi lại khi cả 2 bên vừa đồng ý xong (VD: để trang cha refetch và hiện form nộp báo cáo). */
    onBothConfirmed?: () => void;
    /** Màu nút hành động chính — mỗi portal có màu CTA riêng, xem RescheduleProposalModal. */
    accentColor?: string;
}

/**
 * Cho gia sư/học sinh/phụ huynh cùng đồng ý bỏ hẳn buổi phụ (không học nốt phần còn lại sau khi
 * buổi gốc bị báo ngắt) — thay vì phải đợi tới nửa đêm để hệ thống tự đóng (không thu thập được
 * báo cáo nội dung đã dạy). Cần CẢ HAI phía xác nhận mới có tác dụng; xem
 * ClassSessionService.ConfirmSkipContinuationAsync/SubmitReportAsync.
 */
const SkipContinuationCard = ({
    continuationSessionId,
    isTutor,
    onBothConfirmed,
    accentColor = '#1a2238',
}: SkipContinuationCardProps) => {
    const [status, setStatus] = useState<ClassSessionSkipContinuationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await getSkipContinuationStatus(continuationSessionId);
            setStatus(response.content);
        } catch (error) {
            console.error('Failed to load skip-continuation status', error);
        } finally {
            setLoading(false);
        }
    }, [continuationSessionId]);

    useEffect(() => {
        void fetchStatus();
    }, [fetchStatus]);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            const response = await confirmSkipContinuation(continuationSessionId);
            setStatus(response.content);
            if (response.content.bothConfirmed) onBothConfirmed?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xác nhận lúc này. Vui lòng thử lại.');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 16, textAlign: 'center' }}>
                <Spin size="small" />
            </div>
        );
    }
    if (!status) return null;

    const myConfirmed = isTutor ? status.tutorConfirmed : status.studentConfirmed;
    const otherLabel = isTutor ? 'học sinh/phụ huynh' : 'gia sư';

    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: status.bothConfirmed ? '#e9f6f2' : '#faf3e7',
                border: `1px solid ${status.bothConfirmed ? '#b7e0d3' : '#f0dfb8'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}
        >
            <div style={{ fontWeight: 600, fontSize: 14, color: status.bothConfirmed ? '#0b796a' : '#a46d18' }}>
                {status.bothConfirmed
                    ? 'Cả 2 bên đã đồng ý bỏ buổi phụ này'
                    : 'Không muốn học nốt phần còn lại?'}
            </div>
            <div style={{ fontSize: 13, color: '#475467' }}>
                {status.bothConfirmed
                    ? 'Buổi phụ sẽ tự huỷ ngay khi báo cáo cho buổi gốc được nộp.'
                    : myConfirmed
                        ? `Bạn đã đồng ý — đang chờ ${otherLabel} xác nhận.`
                        : `Nếu cả 2 bên thống nhất không cần học nốt phần còn lại, hãy xác nhận ở đây. Cần cả bạn và ${otherLabel} cùng đồng ý.`}
            </div>
            {!status.bothConfirmed && !myConfirmed && (
                <Button
                    size="small"
                    loading={confirming}
                    onClick={() => void handleConfirm()}
                    style={{ alignSelf: 'flex-start', background: accentColor, color: '#fff', borderColor: accentColor }}
                >
                    Đồng ý bỏ buổi phụ này
                </Button>
            )}
        </div>
    );
};

export default SkipContinuationCard;
