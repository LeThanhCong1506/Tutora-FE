export type SessionTimelineTone = 'done' | 'pending' | 'alert';

export interface SessionTimelineEvent {
    key: string;
    /** Mốc thời gian ISO (UTC) — quyết định thứ tự hiển thị. */
    at: string;
    label: string;
    detail?: string;
    tone?: SessionTimelineTone;
}

export interface SessionTimelineSource {
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    confirmDeadline?: string | null;
    reportCreatedAt?: string | null;
    disputeCreatedAt?: string | null;
    disputeTutorRespondedAt?: string | null;
    disputeResolvedAt?: string | null;
    scheduleChangeAppliedAt?: Array<string | null | undefined>;
    /** Mốc buổi GỐC bị báo ngắt giữa chừng — chỉ có giá trị trên chính buổi gốc. */
    interruptedAt?: string | null;
    /** Lý do báo ngắt do người báo tự nhập, hiện kèm trong chi tiết mốc trên. */
    interruptReason?: string | null;
    /** Tên người đã báo ngắt, hiện kèm trong nhãn mốc trên nếu có. */
    interruptedByName?: string | null;
}

const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

/**
 * Gom mọi mốc thời gian rời rạc của buổi học thành một dòng thời gian duy nhất.
 * Dùng chung cho portal phụ huynh và gia sư để hai bên nhìn thấy đúng cùng một diễn biến.
 */
export const buildSessionTimeline = (source: SessionTimelineSource): SessionTimelineEvent[] => {
    const events: Array<SessionTimelineEvent | null> = [
        source.scheduledStart
            ? { key: 'scheduled', at: source.scheduledStart, label: 'Giờ học theo lịch', tone: 'done' }
            : null,
        ...(source.scheduleChangeAppliedAt ?? []).map((at, index) =>
            at ? { key: `schedule-change-${index}`, at, label: 'Buổi học được dời lịch', tone: 'done' as const } : null,
        ),
        source.checkInTime
            ? { key: 'check-in', at: source.checkInTime, label: 'Bắt đầu buổi học', tone: 'done' }
            : null,
        source.checkOutTime
            ? { key: 'check-out', at: source.checkOutTime, label: 'Kết thúc buổi học', tone: 'done' }
            : null,
        source.reportCreatedAt
            ? { key: 'report', at: source.reportCreatedAt, label: 'Gia sư gửi báo cáo buổi học', tone: 'done' }
            : null,
        source.disputeCreatedAt
            ? { key: 'dispute', at: source.disputeCreatedAt, label: 'Khiếu nại được gửi', tone: 'alert' }
            : null,
        source.disputeTutorRespondedAt
            ? {
                  key: 'dispute-response',
                  at: source.disputeTutorRespondedAt,
                  label: 'Gia sư phản hồi khiếu nại',
                  tone: 'done',
              }
            : null,
        source.disputeResolvedAt
            ? { key: 'dispute-resolved', at: source.disputeResolvedAt, label: 'Khiếu nại đã được xử lý', tone: 'done' }
            : null,
        source.interruptedAt
            ? {
                  key: 'interrupted',
                  at: source.interruptedAt,
                  label: source.interruptedByName
                      ? `Buổi học bị ngắt giữa chừng bởi ${source.interruptedByName} — đã tạo buổi phụ`
                      : 'Buổi học bị ngắt giữa chừng — đã tạo buổi phụ',
                  detail: source.interruptReason || undefined,
                  tone: 'alert',
              }
            : null,
        source.confirmDeadline
            ? {
                  key: 'confirm-deadline',
                  at: source.confirmDeadline,
                  label: 'Hạn xác nhận buổi học',
                  detail: isFuture(source.confirmDeadline) ? 'Sắp tới' : 'Đã qua hạn',
                  tone: isFuture(source.confirmDeadline) ? 'pending' : 'alert',
              }
            : null,
    ];

    return events
        .filter((event): event is SessionTimelineEvent => Boolean(event?.at))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};
