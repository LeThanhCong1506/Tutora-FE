import { useEffect, useState } from 'react';
import { AlertCircle, Download, ExternalLink, Paperclip } from 'lucide-react';
import { Button, Image, Modal, Skeleton } from 'antd';
import { StatusBadge } from '../shared';
import type { DisputeDetailResponse, DisputeListResponse } from '../../services/classSession.service';
import { formatLocalDateTime } from '../../utils/datetime';
import { formatCurrency } from '../../utils/formatters';
import {
  getDisputeEvidenceKind,
  getDisputePriorityMeta,
  getDisputeStatusMeta,
  getDisputeTypeLabel,
} from './disputePresentation';
import styles from './DisputeDetailModal.module.css';

export interface DisputeDetailModalProps {
  open: boolean;
  /** Bản ghi lấy từ bảng — hiển thị ngay trong lúc chờ API chi tiết trả về. */
  dispute: DisputeListResponse | null;
  /**
   * Nạp chi tiết theo `classSessionId`. Parent/student và tutor dùng 2 endpoint khác nhau
   * (`/parent/class-sessions/{id}/dispute` vs `/tutor/class-sessions/{id}/dispute`) nên hàm này được tiêm từ ngoài.
   */
  fetchDetail: (classSessionId: number) => Promise<DisputeDetailResponse | null>;
  /** Quyết định nhãn của bên còn lại: người khiếu nại xem "Gia sư", gia sư xem "Người khiếu nại". */
  viewerRole: 'claimant' | 'tutor';
  onClose: () => void;
  /** Bỏ qua nếu không muốn hiện nút "Xem buổi học" ở chân popup. */
  onViewSession?: (dispute: DisputeListResponse) => void;
}

const getFileNameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return decodeURIComponent(pathname.split('/').pop() || url);
  } catch {
    return url.split('/').pop() || url;
  }
};

interface EvidenceFile {
  key: string;
  url: string;
  label: string;
  mimeType?: string | null;
}

/** Link mở tab mới — dùng cho tài liệu, và cho ảnh/video khi URL hỏng hoặc token đã hết hạn. */
const EvidenceLink = ({ file, note }: { file: EvidenceFile; note?: string }) => (
  <a className={styles.fileItem} href={file.url} target="_blank" rel="noopener noreferrer">
    <Paperclip size={14} className={styles.fileIcon} aria-hidden="true" />
    <span className={styles.fileName}>
      {file.label}
      {note && <small> · {note}</small>}
    </span>
    <Download size={14} className={styles.fileIcon} aria-hidden="true" />
  </a>
);

/** Ảnh xem phóng to ngay trong popup (Image.PreviewGroup), video phát tại chỗ — không rời trang. */
const EvidenceTile = ({ file }: { file: EvidenceFile }) => {
  const [failed, setFailed] = useState(false);
  const kind = getDisputeEvidenceKind(file.url, file.mimeType);

  if (failed || kind === 'file') {
    return (
      <div className={styles.mediaFile}>
        <EvidenceLink file={file} note={failed ? 'không tải được, mở ở tab mới' : undefined} />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <figure className={styles.mediaVideo}>
        <video src={file.url} controls preload="metadata" playsInline onError={() => setFailed(true)} />
        <figcaption className={styles.mediaCaption}>{file.label}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={styles.mediaImage}>
      <Image
        src={file.url}
        alt={file.label}
        onError={() => setFailed(true)}
        // antd v6: nhãn hover là `cover` (`mask` giờ là cấu hình lớp nền của lightbox).
        preview={{ cover: 'Xem ảnh' }}
        rootClassName={styles.imageRoot}
      />
      <figcaption className={styles.mediaCaption}>{file.label}</figcaption>
    </figure>
  );
};

/** Chi tiết được gắn kèm `sessionId` để dữ liệu của hồ sơ trước không rò rỉ sang hồ sơ vừa mở. */
interface DisputeDetailState {
  sessionId: number;
  data: DisputeDetailResponse | null;
  failed: boolean;
}

const DisputeDetailModal = ({
  open,
  dispute,
  fetchDetail,
  viewerRole,
  onClose,
  onViewSession,
}: DisputeDetailModalProps) => {
  const [detailState, setDetailState] = useState<DisputeDetailState | null>(null);

  const classSessionId = dispute?.classSessionId ?? null;

  useEffect(() => {
    if (!open || !classSessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await fetchDetail(classSessionId);
        if (!cancelled) setDetailState({ sessionId: classSessionId, data: result, failed: false });
      } catch {
        if (!cancelled) setDetailState({ sessionId: classSessionId, data: null, failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, classSessionId, fetchDetail]);

  const currentDetail = detailState?.sessionId === classSessionId ? detailState : null;
  const detail = currentDetail?.data ?? null;
  const hasError = currentDetail?.failed ?? false;
  const loading = Boolean(classSessionId) && !currentDetail;

  if (!dispute) return null;

  const status = getDisputeStatusMeta(detail?.status ?? dispute.status, dispute.statusDisplay);
  const typeLabel = getDisputeTypeLabel(detail?.disputeType ?? dispute.disputeType, dispute.disputeTypeDisplay);
  const priority = dispute.priority ? getDisputePriorityMeta(dispute.priority, dispute.priorityDisplay) : null;

  const counterpart =
    viewerRole === 'tutor'
      ? { label: 'Người khiếu nại', name: detail?.createdBy?.fullName || dispute.createdByName }
      : { label: 'Gia sư', name: detail?.tutor?.fullName || dispute.tutorName };

  const session = detail?.classSession;
  const sessionPrice = session?.classSessionPrice ?? dispute.classSessionPrice;
  const sessionSchedule = session?.scheduledStart
    ? `${formatLocalDateTime(session.scheduledStart)}${session.scheduledEnd ? ` – ${formatLocalDateTime(session.scheduledEnd)}` : ''}`
    : null;

  const attachments: EvidenceFile[] = [
    ...(detail?.evidence ?? []).map((url, index) => ({
      key: `evidence-${index}`,
      url,
      label: getFileNameFromUrl(url),
      mimeType: null,
    })),
    ...(detail?.additionalEvidence ?? []).map((item) => ({
      key: `additional-${item.disputeEvidenceId}`,
      url: item.fileUrl,
      label: item.description || (item.fileUrl ? getFileNameFromUrl(item.fileUrl) : 'Bằng chứng'),
      mimeType: item.fileType,
    })),
  ].filter((file): file is EvidenceFile => Boolean(file.url));

  const isResolved = ['resolved', 'closed', 'confirmed_no_show'].includes(detail?.status ?? dispute.status ?? '');
  const hasResolution =
    isResolved ||
    Boolean(detail?.resolutionNote) ||
    typeof detail?.refundPercentage === 'number' ||
    typeof detail?.refundAmount === 'number';

  const metaItems = [
    { label: 'Booking', value: dispute.bookingId ? `#${dispute.bookingId}` : '—' },
    { label: 'Buổi học', value: classSessionId ? `Buổi #${classSessionId}` : 'Chưa xác định' },
    { label: counterpart.label, value: counterpart.name || 'Chưa cập nhật' },
    { label: 'Học phí buổi học', value: typeof sessionPrice === 'number' ? formatCurrency(sessionPrice) : 'Chưa có' },
    { label: 'Ngày gửi', value: formatLocalDateTime(detail?.createdAt ?? dispute.createdAt) || 'Chưa có thời gian' },
    ...(sessionSchedule ? [{ label: 'Thời gian buổi học', value: sessionSchedule }] : []),
    ...(detail?.tutorResponseDeadline
      ? [{ label: 'Hạn phản hồi của gia sư', value: formatLocalDateTime(detail.tutorResponseDeadline) }]
      : []),
  ];

  return (
    <Modal
      open={open}
      centered
      width={680}
      className={styles.modal}
      onCancel={onClose}
      destroyOnHidden
      title={
        <div className={styles.header}>
          <span className={styles.caseId}>Khiếu nại #{dispute.disputeId}</span>
          <span className={styles.headerDivider} aria-hidden="true" />
          <span className={styles.typeLabel}>{typeLabel}</span>
          <span className={styles.headerBadges}>
            {priority && (
              <StatusBadge variant={priority.variant} shape="tag">
                Ưu tiên: {priority.label}
              </StatusBadge>
            )}
            <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
          </span>
        </div>
      }
      footer={[
        ...(onViewSession && classSessionId
          ? [
              <Button key="session" icon={<ExternalLink size={14} />} onClick={() => onViewSession(dispute)}>
                Xem buổi học
              </Button>,
            ]
          : []),
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {hasError && (
        <div className={styles.errorNote} role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>Không tải được chi tiết đầy đủ. Nội dung bên dưới lấy từ danh sách khiếu nại.</span>
        </div>
      )}

      <div className={styles.metaGrid}>
        {metaItems.map((item) => (
          <div key={item.label} className={styles.metaItem}>
            <span className={styles.metaLabel}>{item.label}</span>
            <span className={styles.metaValue}>{item.value}</span>
          </div>
        ))}
      </div>

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Nội dung khiếu nại</h3>
        <p className={styles.blockText}>{detail?.reason || dispute.reason || 'Không có mô tả bổ sung.'}</p>
      </section>

      {dispute.priorityReason && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Lý do xếp mức ưu tiên</h3>
          <p className={styles.blockText}>{dispute.priorityReason}</p>
        </section>
      )}

      {loading ? (
        <div className={styles.block}>
          <Skeleton active paragraph={{ rows: 3 }} title={{ width: 140 }} />
        </div>
      ) : (
        <>
          <section className={styles.block}>
            <h3 className={styles.blockTitle}>Bằng chứng đính kèm</h3>
            {attachments.length > 0 ? (
              <Image.PreviewGroup>
                <div className={styles.mediaGrid}>
                  {attachments.map((file) => (
                    <EvidenceTile key={file.key} file={file} />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <p className={styles.emptyHint}>Khiếu nại này không có tệp đính kèm.</p>
            )}
          </section>

          {detail?.tutorResponse && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Phản hồi từ gia sư</h3>
              <div className={styles.panel}>
                <p className={styles.blockText}>{detail.tutorResponse}</p>
                {detail.tutorRespondedAt && (
                  <p className={styles.panelMeta}>Gửi lúc {formatLocalDateTime(detail.tutorRespondedAt)}</p>
                )}
              </div>
            </section>
          )}

          {hasResolution && (
            <section className={styles.block}>
              <h3 className={styles.blockTitle}>Kết quả xử lý</h3>
              <div className={`${styles.panel} ${styles.resolvedPanel}`}>
                <p className={styles.blockText}>
                  {detail?.resolutionNote || 'Quản trị viên chưa ghi chú kết quả cho khiếu nại này.'}
                </p>
                {(typeof detail?.refundPercentage === 'number' || typeof detail?.refundAmount === 'number') && (
                  <div className={styles.refundRow}>
                    {typeof detail?.refundPercentage === 'number' && (
                      <span className={styles.refundChip}>
                        <small>Tỷ lệ hoàn tiền</small>
                        {detail.refundPercentage}%
                      </span>
                    )}
                    {typeof detail?.refundAmount === 'number' && (
                      <span className={styles.refundChip}>
                        <small>Số tiền hoàn</small>
                        {formatCurrency(detail.refundAmount)}
                      </span>
                    )}
                  </div>
                )}
                {detail?.resolvedAt && (
                  <p className={styles.panelMeta}>
                    Xử lý lúc {formatLocalDateTime(detail.resolvedAt)}
                    {detail.resolvedBy?.fullName ? ` bởi ${detail.resolvedBy.fullName}` : ''}
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </Modal>
  );
};

export default DisputeDetailModal;
