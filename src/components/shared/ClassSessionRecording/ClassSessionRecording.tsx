import React, { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import { Clock, RefreshCw, VideoOff } from 'lucide-react';
import {
    getClassSessionRecording,
    resolveRecordingStreamUrl,
    type RecordingStatus,
} from '../../../services/classSession.service';
import styles from './ClassSessionRecording.module.css';

export interface ClassSessionRecordingProps {
    classSessionId: number;
}

type ViewState = 'loading' | 'error' | RecordingStatus;

/**
 * Nội dung xem lại video buổi học — dùng chung cho Student/Parent/Tutor, chỉ khác nơi bọc
 * (mỗi portal tự đặt trong SectionCard/section-card riêng). Gọi `GET /class-sessions/{id}/recording`
 * (BE tự kiểm tra quyền sở hữu), stream video qua endpoint proxy có token ngắn hạn — không phải
 * link Drive trực tiếp, nên không cache lâu: gọi lại mỗi lần mount.
 */
const ClassSessionRecording: React.FC<ClassSessionRecordingProps> = ({ classSessionId }) => {
    const [state, setState] = useState<ViewState>('loading');
    const [streamUrl, setStreamUrl] = useState<string | null>(null);

    const fetchRecording = useCallback(async () => {
        setState('loading');
        try {
            const res = await getClassSessionRecording(classSessionId);
            const data = res.content;
            setState(data.status);
            setStreamUrl(data.streamUrl ? resolveRecordingStreamUrl(data.streamUrl) : null);
        } catch {
            setState('error');
            setStreamUrl(null);
        }
    }, [classSessionId]);

    useEffect(() => {
        // Fetch-on-mount không dùng React Query/SWR (quy ước chung của repo) — setState đầu tiên
        // nằm trong fetchRecording (useCallback), không phải trực tiếp trong thân effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchRecording();
    }, [fetchRecording]);

    if (state === 'loading') {
        return (
            <div className={styles.loadingCenter}>
                <Spin size="large" />
            </div>
        );
    }

    if (state === 'available' && streamUrl) {
        return <video className={styles.videoPlayer} src={streamUrl} controls preload="metadata" />;
    }

    if (state === 'error') {
        return (
            <div className={styles.stateBox}>
                <span className={`${styles.stateIcon} ${styles.errorIcon}`}>
                    <RefreshCw size={22} />
                </span>
                <strong>Không thể tải video</strong>
                <p>Đường truyền có thể đang gián đoạn. Bạn hãy thử lại nhé.</p>
                <button type="button" onClick={() => void fetchRecording()}>
                    <RefreshCw size={14} /> Thử lại
                </button>
            </div>
        );
    }

    if (state === 'recording') {
        return (
            <div className={styles.stateBox}>
                <span className={`${styles.stateIcon} ${styles.pendingIcon}`}>
                    <Clock size={22} />
                </span>
                <strong>Đang ghi hình</strong>
                <p>Buổi học đang diễn ra — video sẽ có sau khi kết thúc.</p>
            </div>
        );
    }

    if (state === 'processing') {
        return (
            <div className={styles.stateBox}>
                <span className={`${styles.stateIcon} ${styles.pendingIcon}`}>
                    <Clock size={22} />
                </span>
                <strong>Đang xử lý video</strong>
                <p>Video vừa ghi xong đang được xử lý, quay lại sau ít phút nhé.</p>
                <button type="button" onClick={() => void fetchRecording()}>
                    <RefreshCw size={14} /> Kiểm tra lại
                </button>
            </div>
        );
    }

    // status === 'none'
    return (
        <div className={styles.stateBox}>
            <span className={`${styles.stateIcon} ${styles.emptyIcon}`}>
                <VideoOff size={22} />
            </span>
            <strong>Chưa có bản ghi</strong>
            <p>Buổi học này chưa được ghi hình.</p>
        </div>
    );
};

export default ClassSessionRecording;
