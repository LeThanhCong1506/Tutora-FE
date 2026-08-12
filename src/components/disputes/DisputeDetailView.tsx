import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleAlert, ExternalLink, GraduationCap, MessageSquare, Paperclip, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  AttachmentGallery,
  SessionTimeline,
  StatusBadge,
  buildSessionTimeline,
  type AttachmentItem,
} from '../shared';
import { signalRService } from '../../services/signalr.service';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import type { DisputeDetailResponse, DisputeMessage } from '../../services/classSession.service';
import { formatLocalDateTime } from '../../utils/datetime';
import { formatCurrency } from '../../utils/formatters';
import { getDisputeStatusMeta, getDisputeTypeLabel } from './disputePresentation';
import type { DisputeDetailAdapter, DisputeSessionContext } from './disputeDetailTypes';
import styles from './DisputeDetailView.module.css';

export interface DisputeDetailViewProps {
  classSessionId: number | null;
  adapter: DisputeDetailAdapter;
}

const MIN_RESPONSE_LENGTH = 10;

/** Trạng thái mà quản trị viên đã chốt — khoá phản hồi và ẩn kênh trao đổi. */
const CLOSED_STATUSES = ['resolved', 'closed', 'confirmed_no_show'];

const getErrorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') => {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
};

/**
 * Trang chi tiết một khiếu nại, dùng chung cho cả ba portal qua `adapter`.
 *
 * Thay cho `DisputeDetailModal` và card nhúng trong trang chi tiết buổi học: khiếu nại có
 * URL riêng nên chia sẻ, bookmark và F5 được, đồng thời có đủ chỗ cho dòng thời gian,
 * bằng chứng cỡ lớn và bối cảnh buổi học — những thứ không nhét vừa một popup.
 */
const DisputeDetailView = ({ classSessionId, adapter }: DisputeDetailViewProps) => {
  const navigate = useNavigate();
  // Hạn phản hồi tính theo giờ nên nhịp 1 phút là đủ; đọc giờ qua hook thay vì gọi Date.now()
  // thẳng trong render (render phải thuần, và số giờ còn lại cũng tự cập nhật theo).
  const now = useCurrentTime(60_000);
  const [dispute, setDispute] = useState<DisputeDetailResponse | null>(null);
  const [context, setContext] = useState<DisputeSessionContext | null>(null);
  const [thread, setThread] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [threadInput, setThreadInput] = useState('');
  const [sendingThreadMessage, setSendingThreadMessage] = useState(false);

  const { fetchDispute, fetchContext, fetchThread } = adapter;

  useEffect(() => {
    if (!classSessionId) {
      setLoading(false);
      setLoadError('Đường dẫn khiếu nại không hợp lệ.');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      // Bối cảnh buổi học hỏng thì vẫn hiện được khiếu nại, nên hai lời gọi tách kết quả riêng.
      const [disputeResult, contextResult] = await Promise.allSettled([
        fetchDispute(classSessionId),
        fetchContext(classSessionId),
      ]);
      if (cancelled) return;

      if (disputeResult.status === 'rejected' || !disputeResult.value) {
        setDispute(null);
        setLoadError('Không tìm thấy khiếu nại cho buổi học này.');
      } else {
        setDispute(disputeResult.value);
      }

      setContext(contextResult.status === 'fulfilled' ? contextResult.value : null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [classSessionId, fetchDispute, fetchContext]);

  const loadThread = useCallback(async () => {
    if (!classSessionId) return;
    try {
      setThread(await fetchThread(classSessionId));
    } catch (error) {
      console.error('Failed to load dispute thread', error);
    }
  }, [classSessionId, fetchThread]);

  useEffect(() => {
    if (dispute) void loadThread();
  }, [dispute, loadThread]);

  // Realtime: chèn thẳng tin nhắn mới thay vì bắt người dùng F5.
  useEffect(() => {
    if (!dispute) return;
    return signalRService.subscribeToDisputeMessages((message: DisputeMessage) => {
      if (message.disputeId !== dispute.disputeId) return;
      setThread((prev) =>
        prev.some((item) => item.disputeMessageId === message.disputeMessageId) ? prev : [...prev, message],
      );
      toast.info(`Quản trị viên: ${message.message}`);
    });
  }, [dispute]);

  const timelineEvents = useMemo(
    () =>
      buildSessionTimeline({
        scheduledStart: context?.scheduledStart,
        checkInTime: context?.checkInTime,
        checkOutTime: context?.checkOutTime,
        reportCreatedAt: context?.reportCreatedAt,
        confirmDeadline: context?.confirmDeadline,
        disputeCreatedAt: dispute?.createdAt,
        disputeTutorRespondedAt: dispute?.tutorRespondedAt,
        disputeResolvedAt: dispute?.resolvedAt,
      }),
    [context, dispute],
  );

  const handleSubmitResponse = async () => {
    if (!classSessionId || !adapter.submitResponse) return;
    const message = responseText.trim();
    if (message.length < MIN_RESPONSE_LENGTH) return;

    setSubmittingResponse(true);
    try {
      const updated = await adapter.submitResponse(classSessionId, message);
      if (updated) setDispute(updated);
      setResponseText('');
      toast.success('Đã gửi phản hồi khiếu nại.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleUploadEvidence = async (file: File) => {
    if (!classSessionId || !adapter.uploadEvidence) return;
    setUploadingEvidence(true);
    try {
      await adapter.uploadEvidence(classSessionId, file);
      toast.success('Đã tải lên bằng chứng.');
      const refreshed = await fetchDispute(classSessionId);
      if (refreshed) setDispute(refreshed);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Tải lên bằng chứng thất bại.'));
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSendThreadMessage = async () => {
    if (!classSessionId) return;
    const message = threadInput.trim();
    if (message.length === 0 || sendingThreadMessage) return;

    setSendingThreadMessage(true);
    try {
      await adapter.sendThreadMessage(classSessionId, message);
      setThreadInput('');
      await loadThread();
    } catch (error) {
      toast.error(getErrorMessage(error), { toastId: 'dispute-thread-send-error' });
    } finally {
      setSendingThreadMessage(false);
    }
  };

  if (loading) {
    return <div className={styles.centerState}>Đang tải khiếu nại…</div>;
  }

  if (!dispute) {
    return (
      <div className={styles.centerState}>
        <p>{loadError ?? 'Không tìm thấy khiếu nại.'}</p>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate(adapter.listPath)}>
          Về danh sách khiếu nại
        </button>
      </div>
    );
  }

  const statusMeta = getDisputeStatusMeta(dispute.status);
  const isClosed = CLOSED_STATUSES.includes(dispute.status ?? '');
  const isTutorViewer = adapter.viewerRole === 'tutor';
  const canRespond = isTutorViewer && Boolean(adapter.submitResponse) && !isClosed && !dispute.tutorResponse;
  const canUploadEvidence = isTutorViewer && Boolean(adapter.uploadEvidence) && !isClosed;

  const claimantEvidence: AttachmentItem[] = (dispute.evidence ?? []).map((url, index) => ({
    key: `evidence-${index}`,
    url,
  }));
  const tutorEvidence: AttachmentItem[] = (dispute.additionalEvidence ?? []).map((item) => ({
    key: `additional-${item.disputeEvidenceId}`,
    url: item.fileUrl ?? '',
    label: item.description,
    mimeType: item.fileType,
  }));

  const hasResolution =
    isClosed ||
    Boolean(dispute.resolutionNote) ||
    typeof dispute.refundPercentage === 'number' ||
    typeof dispute.refundAmount === 'number';

  const counterpartLabel = isTutorViewer ? 'Học viên' : 'Gia sư';
  const counterpart = context?.counterpart;
  const sessionId = dispute.classSessionId ?? classSessionId;

  // Hạn phản hồi chỉ còn ý nghĩa khi gia sư chưa trả lời và vụ việc chưa chốt.
  const deadlineNotice = (() => {
    if (!isTutorViewer || !dispute.tutorResponseDeadline || dispute.tutorResponse || isClosed) return null;
    const msLeft = new Date(dispute.tutorResponseDeadline).getTime() - now;
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    return {
      overdue: msLeft <= 0,
      text:
        msLeft > 0
          ? `Bạn còn khoảng ${hoursLeft} giờ để phản hồi trước khi quản trị viên có thể bắt đầu điều tra (hạn ${formatLocalDateTime(dispute.tutorResponseDeadline)}).`
          : `Đã quá hạn phản hồi ưu tiên (${formatLocalDateTime(dispute.tutorResponseDeadline)}) — quản trị viên có thể bắt đầu điều tra bất cứ lúc nào, hãy phản hồi sớm.`,
    };
  })();

  const evidenceUploadControl = canUploadEvidence && (
    <label className={styles.uploadButton}>
      <Paperclip size={15} />
      {uploadingEvidence ? 'Đang tải lên…' : 'Đính kèm bằng chứng'}
      <input
        type="file"
        hidden
        disabled={uploadingEvidence}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset value để chọn lại đúng tệp vừa upload vẫn kích hoạt onChange.
          event.target.value = '';
          if (file) void handleUploadEvidence(file);
        }}
      />
    </label>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backLink} onClick={() => navigate(adapter.listPath)}>
          <ArrowLeft size={16} />
          Danh sách khiếu nại
        </button>
        <div className={styles.headerMain}>
          <div>
            <span className={styles.eyebrow}>Tranh chấp</span>
            <h1 className={styles.title}>Khiếu nại #{dispute.disputeId}</h1>
            <p className={styles.subtitle}>
              {getDisputeTypeLabel(dispute.disputeType)}
              {dispute.createdAt ? ` · Gửi ${formatLocalDateTime(dispute.createdAt)}` : ''}
              {dispute.timeSinceCreation ? ` · ${dispute.timeSinceCreation}` : ''}
            </p>
          </div>
          <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.main}>
          {deadlineNotice && (
            <div
              className={`${styles.alert} ${deadlineNotice.overdue ? styles.alertDanger : ''}`}
              role="status"
            >
              <CircleAlert size={17} />
              <span>{deadlineNotice.text}</span>
            </div>
          )}

          {timelineEvents.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Tiến độ</h2>
              <SessionTimeline events={timelineEvents} />
            </section>
          )}

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Nội dung khiếu nại</h2>
            <p className={styles.paragraph}>{dispute.reason || 'Người gửi không mô tả thêm.'}</p>
            <div className={styles.evidenceBlock}>
              <span className={styles.fieldLabel}>
                Bằng chứng từ {isTutorViewer ? 'người khiếu nại' : 'bạn'}
              </span>
              <AttachmentGallery items={claimantEvidence} emptyText="Khiếu nại này không kèm tệp nào." />
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{isTutorViewer ? 'Phản hồi của bạn' : 'Phản hồi từ gia sư'}</h2>

            {dispute.tutorResponse ? (
              <>
                <p className={styles.paragraph}>{dispute.tutorResponse}</p>
                {dispute.tutorRespondedAt && (
                  <p className={styles.meta}>Gửi lúc {formatLocalDateTime(dispute.tutorRespondedAt)}</p>
                )}
              </>
            ) : canRespond ? (
              <>
                <textarea
                  className={styles.textarea}
                  value={responseText}
                  onChange={(event) => setResponseText(event.target.value)}
                  placeholder="Trình bày góc nhìn của bạn về khiếu nại này (tối thiểu 10 ký tự)..."
                  rows={5}
                />
                <div className={styles.composerFoot}>
                  <span
                    className={`${styles.charHint} ${responseText.trim().length >= MIN_RESPONSE_LENGTH ? styles.charHintOk : ''}`}
                  >
                    {responseText.trim().length}/{MIN_RESPONSE_LENGTH} ký tự tối thiểu
                  </span>
                  <div className={styles.actions}>
                    {evidenceUploadControl}
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={submittingResponse || responseText.trim().length < MIN_RESPONSE_LENGTH}
                      onClick={() => void handleSubmitResponse()}
                    >
                      {submittingResponse ? 'Đang gửi…' : 'Gửi phản hồi'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyText}>
                {isTutorViewer
                  ? 'Vụ việc đã chốt nên không thể gửi thêm phản hồi.'
                  : 'Gia sư chưa gửi phản hồi cho khiếu nại này.'}
              </p>
            )}

            {(tutorEvidence.length > 0 || (canUploadEvidence && dispute.tutorResponse)) && (
              <div className={styles.evidenceBlock}>
                <span className={styles.fieldLabel}>
                  Bằng chứng {isTutorViewer ? 'bạn đã nộp' : 'gia sư đã nộp'}
                </span>
                <AttachmentGallery items={tutorEvidence} emptyText="Chưa có tệp nào." />
                {canUploadEvidence && dispute.tutorResponse && (
                  <div className={styles.actions}>{evidenceUploadControl}</div>
                )}
              </div>
            )}
          </section>

          {hasResolution && (
            <section className={`${styles.card} ${styles.resolutionCard}`}>
              <div className={styles.resolutionHead}>
                <span className={styles.resolutionIcon}>
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <h2 className={styles.cardTitle}>Kết quả xử lý</h2>
                  <p className={styles.meta}>
                    {dispute.resolvedAt
                      ? `Quản trị viên chốt lúc ${formatLocalDateTime(dispute.resolvedAt)}`
                      : 'Quản trị viên đã đưa ra quyết định'}
                    {dispute.resolvedBy?.fullName ? ` · ${dispute.resolvedBy.fullName}` : ''}
                  </p>
                </div>
              </div>

              <p className={styles.paragraph}>
                {dispute.resolutionNote || 'Quản trị viên không để lại ghi chú cho quyết định này.'}
              </p>

              {(typeof dispute.refundPercentage === 'number' || typeof dispute.refundAmount === 'number') && (
                <div className={styles.refundRow}>
                  {typeof dispute.refundPercentage === 'number' && (
                    <span className={styles.refundChip}>
                      <small>Tỷ lệ hoàn tiền</small>
                      <strong>{dispute.refundPercentage}%</strong>
                    </span>
                  )}
                  {typeof dispute.refundAmount === 'number' && (
                    <span className={styles.refundChip}>
                      <small>Số tiền hoàn</small>
                      <strong>{formatCurrency(dispute.refundAmount)}</strong>
                    </span>
                  )}
                </div>
              )}
            </section>
          )}

          {!isClosed && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <MessageSquare size={16} />
                Trao đổi riêng với quản trị viên
              </h2>
              <p className={styles.meta}>Chỉ bạn và quản trị viên phụ trách thấy được nội dung này.</p>

              {thread.length > 0 ? (
                <div className={styles.threadList}>
                  {thread.map((message) => (
                    <div
                      key={message.disputeMessageId}
                      className={`${styles.threadBubble} ${
                        message.senderRole === 'admin' ? styles.threadAdmin : styles.threadMine
                      }`}
                    >
                      <p className={styles.threadSender}>
                        {message.senderRole === 'admin' ? 'Quản trị viên' : 'Bạn'}
                        {message.createdAt ? ` · ${formatLocalDateTime(message.createdAt)}` : ''}
                      </p>
                      <p className={styles.threadText}>{message.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>
                  Chưa có tin nhắn nào — bạn có thể nhắn trực tiếp cho quản trị viên phụ trách vụ việc.
                </p>
              )}

              <div className={styles.threadComposer}>
                <input
                  type="text"
                  className={styles.threadInput}
                  value={threadInput}
                  onChange={(event) => setThreadInput(event.target.value)}
                  placeholder="Nhắn cho quản trị viên..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSendThreadMessage();
                  }}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={sendingThreadMessage || threadInput.trim().length === 0}
                  onClick={() => void handleSendThreadMessage()}
                >
                  {sendingThreadMessage ? 'Đang gửi…' : 'Gửi'}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Buổi học liên quan</h2>
            <dl className={styles.infoList}>
              <div>
                <dt>Mã buổi học</dt>
                <dd>{sessionId ? `#${sessionId}` : '—'}</dd>
              </div>
              <div>
                <dt>Mã booking</dt>
                <dd>{dispute.bookingId ? `#${dispute.bookingId}` : '—'}</dd>
              </div>
              {context?.subjectName && (
                <div>
                  <dt>Môn học</dt>
                  <dd>{context.subjectName}</dd>
                </div>
              )}
              <div>
                <dt>Lịch học</dt>
                <dd>
                  {context?.scheduledStart
                    ? `${formatLocalDateTime(context.scheduledStart)}${
                        context.scheduledEnd ? ` – ${formatLocalDateTime(context.scheduledEnd)}` : ''
                      }`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Bắt đầu thực tế</dt>
                <dd>{context?.checkInTime ? formatLocalDateTime(context.checkInTime) : '—'}</dd>
              </div>
              <div>
                <dt>Kết thúc thực tế</dt>
                <dd>{context?.checkOutTime ? formatLocalDateTime(context.checkOutTime) : '—'}</dd>
              </div>
              <div>
                <dt>Học phí buổi học</dt>
                <dd>
                  {typeof (context?.price ?? dispute.classSession?.classSessionPrice) === 'number'
                    ? formatCurrency((context?.price ?? dispute.classSession?.classSessionPrice) as number)
                    : '—'}
                </dd>
              </div>
            </dl>

            {sessionId && (
              <Link to={adapter.sessionPath(sessionId)} className={styles.sidebarLink}>
                <ExternalLink size={15} />
                Xem chi tiết buổi học
              </Link>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Điểm danh</h2>
            <ul className={styles.attendanceList}>
              <li>
                <span>Gia sư</span>
                <StatusBadge
                  variant={context?.isTutorPresent ? 'success' : context?.isTutorPresent === false ? 'error' : 'neutral'}
                  shape="tag"
                >
                  {context?.isTutorPresent === undefined
                    ? 'Chưa ghi nhận'
                    : context.isTutorPresent
                      ? 'Có mặt'
                      : 'Vắng mặt'}
                </StatusBadge>
              </li>
              <li>
                <span>Học viên</span>
                <StatusBadge
                  variant={
                    context?.isStudentPresent ? 'success' : context?.isStudentPresent === false ? 'error' : 'neutral'
                  }
                  shape="tag"
                >
                  {context?.isStudentPresent === undefined
                    ? 'Chưa ghi nhận'
                    : context.isStudentPresent
                      ? 'Có mặt'
                      : 'Vắng mặt'}
                </StatusBadge>
              </li>
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{counterpartLabel}</h2>
            <div className={styles.person}>
              <span className={styles.avatar} aria-hidden="true">
                {(counterpart?.name || (isTutorViewer ? dispute.createdBy?.fullName : dispute.tutor?.fullName) || '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <div>
                <strong>
                  {counterpart?.name ||
                    (isTutorViewer ? dispute.createdBy?.fullName : dispute.tutor?.fullName) ||
                    'Chưa cập nhật'}
                </strong>
                {counterpart?.subtitle && <small>{counterpart.subtitle}</small>}
              </div>
            </div>
            {counterpart?.profilePath && (
              <Link to={counterpart.profilePath} className={styles.sidebarLink}>
                <GraduationCap size={15} />
                Xem hồ sơ học tập
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DisputeDetailView;
