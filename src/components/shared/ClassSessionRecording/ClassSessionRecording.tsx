import React, { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import { Clock, RefreshCw, VideoOff } from 'lucide-react';
import {
    getClassSessionRecordingChain,
    resolveRecordingStreamUrl,
    type ClassSessionRecordingChainItem,
    type RecordingStatus,
} from '../../../services/classSession.service';
import styles from './ClassSessionRecording.module.css';

export interface ClassSessionRecordingProps {
    classSessionId: number;
}

type ViewState = 'loading' | 'error' | RecordingStatus;

/**
 * Nội dung 1 trạng thái ghi hình (video thật / đang xử lý / lỗi / chưa có bản ghi...) — tách riêng
 * khỏi việc fetch để dùng lại cho cả buổi đơn (không liên kết) và từng tab trong chuỗi buổi liên kết.
 */
const RecordingPanel = ({
    state,
    streamUrl,
    onRetry,
    onStreamError,
}: {
    state: ViewState;
    streamUrl: string | null;
    onRetry: () => void;
    onStreamError: () => void;
}) => {
    if (state === 'loading') {
        return (
            <div className={styles.loadingCenter}>
                <Spin size="large" />
            </div>
        );
    }

    if (state === 'available' && streamUrl) {
        return (
            <video
                className={styles.videoPlayer}
                src={streamUrl}
                controls
                preload="metadata"
                // BE báo "available" dựa trên dữ liệu ClassSession, nhưng file thực tế trên Drive
                // có thể đã bị xoá/hỏng hoặc token stream đã hết hạn — lúc đó request stream sẽ
                // lỗi/treo mà state vẫn đang là 'available'. Không có onError thì <video> chỉ đứng
                // yên với spinner mặc định của trình duyệt, không bao giờ chuyển sang UI báo lỗi.
                onError={onStreamError}
            />
        );
    }

    // BE báo "available" nhưng thiếu streamUrl — trái hợp đồng API, không được âm thầm
    // rơi xuống "Chưa có bản ghi" (dễ hiểu lầm là chưa từng ghi hình).
    if (state === 'error' || (state === 'available' && !streamUrl)) {
        return (
            <div className={styles.stateBox}>
                <span className={`${styles.stateIcon} ${styles.errorIcon}`}>
                    <RefreshCw size={22} />
                </span>
                <strong>Không thể tải video</strong>
                <p>Đường truyền có thể đang gián đoạn. Bạn hãy thử lại nhé.</p>
                <button type="button" onClick={onRetry}>
                    <RefreshCw size={14} /> Thử lại
                </button>
            </div>
        );
    }

    // Phòng đã đóng nhưng không có file nào: bản ghi hỏng, không có gì để chờ nữa — khác hẳn
    // "chưa có bản ghi" (không hề ghi hình) nên không được gộp chung, và cũng không cho "thử lại".
    if (state === 'failed') {
        return (
            <div className={styles.stateBox}>
                <span className={`${styles.stateIcon} ${styles.errorIcon}`}>
                    <VideoOff size={22} />
                </span>
                <strong>Ghi hình không thành công</strong>
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
                <button type="button" onClick={onRetry}>
                    <RefreshCw size={14} /> Kiểm tra lại
                </button>
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
                <button type="button" onClick={onRetry}>
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
        </div>
    );
};

/**
 * Nội dung xem lại video buổi học — dùng chung cho Student/Parent/Tutor, chỉ khác nơi bọc
 * (mỗi portal tự đặt trong SectionCard/section-card riêng). Gọi
 * `GET /class-sessions/{id}/recording-chain` (BE tự kiểm tra quyền sở hữu) — trả về CHUỖI buổi
 * liên kết (buổi bù/buổi phụ/buổi học lại đều tính, không chỉ 1 buổi đơn) kèm trạng thái ghi hình
 * riêng từng buổi. Chuỗi chỉ có 1 phần tử khi buổi này chưa từng liên kết — lúc đó hiện đúng như
 * trước (không có dải tab). Stream qua endpoint proxy có token ngắn hạn, không cache lâu: gọi lại
 * mỗi lần mount.
 */
const ClassSessionRecording: React.FC<ClassSessionRecordingProps> = ({ classSessionId }) => {
    const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [chain, setChain] = useState<ClassSessionRecordingChainItem[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    // Buổi đang chọn có thể tự chuyển 'error' riêng (video lỗi khi phát) khác với lỗi tải cả chuỗi.
    const [streamErrorId, setStreamErrorId] = useState<number | null>(null);

    const fetchChain = useCallback(async () => {
        setLoadState('loading');
        setStreamErrorId(null);
        try {
            const res = await getClassSessionRecordingChain(classSessionId);
            const items = res.content;
            setChain(items);
            setSelectedId(items.find((item) => item.isCurrent)?.classSessionId ?? items[0]?.classSessionId ?? null);
            setLoadState('ready');
        } catch {
            setChain([]);
            setLoadState('error');
        }
    }, [classSessionId]);

    useEffect(() => {
        // Fetch-on-mount không dùng React Query/SWR (quy ước chung của repo) — setState đầu tiên
        // nằm trong fetchChain (useCallback), không phải trực tiếp trong thân effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchChain();
    }, [fetchChain]);

    if (loadState === 'loading') {
        return (
            <div className={styles.loadingCenter}>
                <Spin size="large" />
            </div>
        );
    }

    if (loadState === 'error' || chain.length === 0) {
        return (
            <RecordingPanel
                state="error"
                streamUrl={null}
                onRetry={() => void fetchChain()}
                onStreamError={() => {}}
            />
        );
    }

    const selected = chain.find((item) => item.classSessionId === selectedId) ?? chain[0];
    const selectedState: ViewState = streamErrorId === selected.classSessionId ? 'error' : selected.status;
    const selectedStreamUrl = selected.streamUrl ? resolveRecordingStreamUrl(selected.streamUrl) : null;

    return (
        <div className={styles.chainWrapper}>
            {chain.length > 1 && (
                <div className={styles.chainTabs} role="tablist" aria-label="Chuỗi buổi liên kết">
                    {chain.map((item) => (
                        <button
                            key={item.classSessionId}
                            type="button"
                            role="tab"
                            aria-selected={item.classSessionId === selected.classSessionId}
                            className={`${styles.chainTab} ${
                                item.classSessionId === selected.classSessionId ? styles.chainTabActive : ''
                            }`}
                            onClick={() => setSelectedId(item.classSessionId)}
                        >
                            {item.label}
                            {item.isCurrent && <span className={styles.chainTabCurrentDot} aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
            <RecordingPanel
                state={selectedState}
                streamUrl={selectedStreamUrl}
                onRetry={() => void fetchChain()}
                onStreamError={() => setStreamErrorId(selected.classSessionId)}
            />
        </div>
    );
};

export default ClassSessionRecording;
