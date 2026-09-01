import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Check, ChevronRight, Clock, Eye, MessageCircle, Search, Star, User, Wallet, X } from 'lucide-react';
import { Input, Modal, Pagination, Select } from 'antd';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../utils/apiError';
import BookingMonthCalendar from '../../components/BookingMonthCalendar/BookingMonthCalendar';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { useTabParam } from '../../hooks/useTabParam';
import styles from '../../styles/pages/tutor-portal-bookings.module.css';
import {
  acceptBooking,
  declineBooking,
  getTutorBookings,
  type BookingResponseDTO,
} from '../../services/booking.service';
import { getChats, getOrCreateBookingChannel, type ChatChannel } from '../../services/chat.service';
import { getBookingFeedback, type FeedbackDto } from '../../services/feedback.service';
import ReplyFeedbackModal from './components/ReplyFeedbackModal';
import { getBookingResponseDeadlineState } from '../../utils/bookingDeadline';
import { formatVNDNumber } from '../../utils/formatters';
import { PageContainer } from '../../components/shared';

// `key` là slug hiển thị trên URL (`?tab=`), `status` là chuỗi status gửi cho API —
// tách ra để URL không lộ danh sách status nội bộ và vẫn đọc được khi share link.
const STATUS_TABS = [
  {
    key: 'pending',
    section: 'requests',
    label: 'Chờ xác nhận',
    status: 'pending_tutor',
    empty: {
      title: 'Không có yêu cầu đang chờ',
      description: 'Các yêu cầu đặt lịch mới từ phụ huynh sẽ xuất hiện tại đây.',
    },
  },
  {
    key: 'paid',
    section: 'bookings',
    label: 'Đã thanh toán',
    status: 'deposit_paid,pending_remaining_payment,paid,ongoing',
    empty: {
      title: 'Chưa có yêu cầu đã thanh toán',
      description: 'Booking đã thanh toán cọc hoặc đầy đủ sẽ được cập nhật tại đây.',
    },
  },
  {
    key: 'completed',
    section: 'bookings',
    label: 'Hoàn thành',
    status: 'completed',
    empty: {
      title: 'Chưa có yêu cầu hoàn thành',
      description: 'Các khóa học đã hoàn tất sẽ được lưu tại đây.',
    },
  },
  {
    key: 'cancelled',
    section: 'bookings',
    label: 'Đã hủy',
    status: 'cancelled,cancelled_noshow,payment_timeout,cancelled_by_staff,cancelled_by_dispute',
    empty: {
      title: 'Chưa có yêu cầu đã hủy',
      description: 'Các yêu cầu bị hủy, từ chối hoặc hết hạn sẽ được lưu tại đây.',
    },
  },
] as const;

type BookingTab = (typeof STATUS_TABS)[number]['key'];
const BOOKING_TAB_KEYS = STATUS_TABS.map((tab) => tab.key);

// Trang này gộp hai công việc khác hẳn nhau: TRẢ LỜI yêu cầu mới (có hạn phản hồi, có nút
// chấp nhận/từ chối, có cảnh báo trùng khung giờ) và THEO DÕI booking đã chốt. Trước đây cả
// bốn tab nằm ngang hàng nên hai việc trộn lẫn, và tab mặc định luôn là "Chờ xác nhận" —
// gia sư đi tìm một booking đã hủy sẽ mở trúng danh sách yêu cầu chờ.
const SECTION_TABS = [
  {
    key: 'requests',
    label: 'Quản lý yêu cầu đặt lịch',
    hint: 'Yêu cầu mới từ phụ huynh, cần bạn phản hồi trước hạn.',
  },
  {
    key: 'bookings',
    label: 'Quản lý booking đang có',
    hint: 'Các lớp đã chốt: đang học, đã hoàn thành và đã hủy.',
  },
] as const;

type BookingSection = (typeof SECTION_TABS)[number]['key'];
const SECTION_KEYS = SECTION_TABS.map((section) => section.key);

/** Tab trạng thái đầu tiên của một nhóm — dùng khi chuyển nhóm để không giữ lại tab không thuộc nhóm mới. */
const firstTabOfSection = (section: BookingSection): BookingTab =>
  (STATUS_TABS.find((tab) => tab.section === section) ?? STATUS_TABS[0]).key;

// Tab "Đã hủy" gộp năm trạng thái có nguyên nhân rất khác nhau — gia sư tự hủy, phụ huynh không
// thanh toán kịp, admin can thiệp, kết quả khiếu nại... Gộp chung thì không trả lời được câu hỏi
// hay gặp nhất: "bao nhiêu lớp mất vì phía tôi, bao nhiêu vì phía kia?".
const CANCELLED_STATUS = STATUS_TABS.find((tab) => tab.key === 'cancelled')!.status;

const CANCEL_REASON_OPTIONS = [
  { value: 'all', label: 'Tất cả lý do', status: CANCELLED_STATUS },
  { value: 'cancelled', label: 'Hủy thường', status: 'cancelled' },
  { value: 'noshow', label: 'Hủy do vắng mặt', status: 'cancelled_noshow' },
  { value: 'timeout', label: 'Hết hạn thanh toán', status: 'payment_timeout' },
  { value: 'staff', label: 'Hủy bởi quản trị viên', status: 'cancelled_by_staff' },
  { value: 'dispute', label: 'Hủy theo khiếu nại', status: 'cancelled_by_dispute' },
] as const;

type CancelReason = (typeof CANCEL_REASON_OPTIONS)[number]['value'];
const CANCEL_REASON_KEYS = CANCEL_REASON_OPTIONS.map((option) => option.value);

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending_tutor: { label: 'Chờ xác nhận', tone: 'pending' },
  pending_payment: { label: 'Chờ thanh toán', tone: 'pending' },
  accepted: { label: 'Đã chấp nhận', tone: 'accepted' },
  deposit_paid: { label: 'Đã đặt cọc', tone: 'paid' },
  pending_remaining_payment: { label: 'Chờ TT còn lại', tone: 'paid' },
  paid: { label: 'Đã thanh toán', tone: 'paid' },
  ongoing: { label: 'Đang học', tone: 'paid' },
  completed: { label: 'Hoàn thành', tone: 'completed' },
  cancelled: { label: 'Đã hủy', tone: 'cancelled' },
  cancelled_noshow: { label: 'Hủy do vắng mặt', tone: 'cancelled' },
  declined: { label: 'Đã từ chối', tone: 'cancelled' },
  payment_timeout: { label: 'Hết hạn thanh toán', tone: 'cancelled' },
  // Hai trạng thái kết thúc do CMS/tranh chấp tạo ra. Trước đây không có nhãn và cũng không nằm
  // trong bộ lọc của tab nào, nên booking rơi vào đây biến mất khỏi mọi danh sách — gia sư nhận
  // thông báo "đã hủy" rồi đi tìm thì không tab nào chứa nó.
  cancelled_by_staff: { label: 'Hủy bởi quản trị viên', tone: 'cancelled' },
  cancelled_by_dispute: { label: 'Hủy theo khiếu nại', tone: 'cancelled' },
};

const formatDayName = (dayOfWeek: number) => {
  if (dayOfWeek === 0 || dayOfWeek === 7) return 'Chủ nhật';
  return `Thứ ${dayOfWeek + 1}`;
};

const formatGrade = (grade?: string): string => {
  if (!grade) return 'Chưa cập nhật lớp';
  return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
};

const formatPrice = (amount: number) => `${formatVNDNumber(Math.max(0, amount))} ₫`;

const formatRequestDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getBookingPeriod = (booking: BookingResponseDTO) => {
  const lessons = [...(booking.lessons ?? [])].sort(
    (first, second) => new Date(first.scheduledStart).getTime() - new Date(second.scheduledStart).getTime(),
  );

  return {
    startDate: lessons[0]?.scheduledStart ?? booking.startDate,
    endDate: lessons.at(-1)?.scheduledEnd,
  };
};

const formatTime = (value?: string) => (value ? value.slice(0, 5) : '');

const getUniqueSchedule = (booking: BookingResponseDTO) => {
  const uniqueSlots = new Map<string, BookingResponseDTO['schedule'][number]>();

  (booking.schedule ?? []).forEach((slot) => {
    const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`;
    if (!uniqueSlots.has(key)) uniqueSlots.set(key, slot);
  });

  return Array.from(uniqueSlots.values());
};

const schedulesOverlap = (a: BookingResponseDTO['schedule'], b: BookingResponseDTO['schedule']): boolean =>
  (a ?? []).some((slotA) =>
    (b ?? []).some(
      (slotB) =>
        slotA.dayOfWeek === slotB.dayOfWeek &&
        timeToMinutes(slotA.startTime) < timeToMinutes(slotB.endTime) &&
        timeToMinutes(slotB.startTime) < timeToMinutes(slotA.endTime),
    ),
  );

const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Nhóm các booking đang "Chờ xác nhận" theo khung giờ tuần trùng nhau — gia sư chỉ accept được 1
 * trong số đó, các cái còn lại tự động bị hủy + hoàn tiền (xem BookingScheduleLockPolicy ở BE).
 * Gom kiểu greedy theo cụm liên thông (đủ dùng cho vài chục request/trang, không cần union-find).
 */
const groupPendingByOverlap = (items: BookingResponseDTO[]): BookingResponseDTO[][] => {
  const groups: BookingResponseDTO[][] = [];
  for (const booking of items) {
    const match = groups.find((group) =>
      group.some((other) => schedulesOverlap(booking.schedule, other.schedule)),
    );
    if (match) match.push(booking);
    else groups.push([booking]);
  }
  return groups;
};

/** Nhóm TOÀN BỘ request theo đúng khung giờ tuần (kể cả nhóm chỉ có 1 request) — dùng cho chế độ hiển thị "Theo khung giờ". */
const groupByExactSchedule = (items: BookingResponseDTO[]): BookingResponseDTO[][] => {
  const map = new Map<string, BookingResponseDTO[]>();
  const order: string[] = [];
  items.forEach((booking) => {
    const key =
      getUniqueSchedule(booking)
        .map((slot) => `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`)
        .sort()
        .join('|') || `no-schedule-${booking.bookingId}`;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(booking);
  });
  return order.map((key) => map.get(key)!);
};

/** Nhóm TOÀN BỘ request theo học sinh — dùng cho chế độ hiển thị "Theo người đặt". */
const groupByRequester = (items: BookingResponseDTO[]): BookingResponseDTO[][] => {
  const map = new Map<string, BookingResponseDTO[]>();
  const order: string[] = [];
  items.forEach((booking) => {
    const key = booking.student?.studentId || booking.parentId || `booking-${booking.bookingId}`;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(booking);
  });
  return order.map((key) => map.get(key)!);
};

const getFeeBreakdown = (booking: BookingResponseDTO) => {
  const originalTuition = Math.max(0, booking.totalAmount ?? booking.price ?? 0);
  const discount = Math.max(0, booking.discountApplied ?? 0);
  const baseAmount = Math.max(0, booking.baseAmount ?? originalTuition - discount);
  const parentFee = Math.max(0, booking.parentFee ?? booking.finalPrice - baseAmount);
  const tutorServiceFee = Math.max(0, booking.tutorServiceFee ?? (booking.platformFee ?? 0) - parentFee);
  const tutorReceivable = Math.max(0, booking.tutorReceivable ?? baseAmount - tutorServiceFee);
  const sessionCount = Math.max(1, booking.sessionCount || booking.totalSessions || 1);
  const firstSessionPayment = Math.max(0, booking.depositAmount ?? Math.floor(booking.finalPrice / sessionCount));
  const paymentStatus = (booking.paymentStatus ?? '').toLowerCase();
  const isFirstSessionPaid =
    Boolean(booking.depositPaidAt) || ['depositedescrowed', 'escrowed', 'paid'].includes(paymentStatus);

  return {
    originalTuition,
    discount,
    baseAmount,
    parentFee,
    tutorServiceFee,
    tutorReceivable,
    firstSessionPayment,
    isFirstSessionPaid,
  };
};

const TutorPortalBookings = () => {
  const [bookings, setBookings] = useState<BookingResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useTabParam<BookingSection>(SECTION_KEYS, 'requests', {
    paramKey: 'section',
  });
  const [activeTab, setActiveTab] = useTabParam<BookingTab>(BOOKING_TAB_KEYS, 'pending');
  const [cancelReason, setCancelReason] = useTabParam<CancelReason>(CANCEL_REASON_KEYS, 'all', {
    paramKey: 'reason',
  });
  const visibleTabs = STATUS_TABS.filter((tab) => tab.section === activeSection);

  // URL có thể mang cặp không hợp lệ (`?section=bookings&tab=pending` từ link cũ) — khi đó rơi về
  // tab đầu của nhóm đang xem, thay vì fetch nhầm danh sách hoặc vẽ ra tab bar không mục nào chọn.
  //
  // Tính từ hai CHUỖI ổn định, không lấy `.key` của phần tử trong `visibleTabs`: mảng đó tạo mới
  // mỗi lần render nên React Compiler không chứng minh được tính ổn định, và bỏ luôn memo hoá của
  // các useMemo phía dưới ("Existing memoization could not be preserved").
  const activeTabKey: BookingTab = STATUS_TABS.some((tab) => tab.key === activeTab && tab.section === activeSection)
    ? activeTab
    : firstTabOfSection(activeSection);
  const activeTabConfig = STATUS_TABS.find((tab) => tab.key === activeTabKey)!;

  // Bộ lọc lý do chỉ thu hẹp TRONG tab "Đã hủy"; các tab khác luôn dùng nguyên status của mình,
  // kể cả khi `?reason=` còn sót lại trên URL từ lần xem trước.
  const activeStatusFilter =
    activeTabKey === 'cancelled'
      ? (CANCEL_REASON_OPTIONS.find((option) => option.value === cancelReason) ?? CANCEL_REASON_OPTIONS[0]).status
      : activeTabConfig.status;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [acceptConfirmBookingId, setAcceptConfirmBookingId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [processingBooking, setProcessingBooking] = useState<{
    id: number;
    action: 'accept' | 'decline';
  } | null>(null);
  const [openingChatId, setOpeningChatId] = useState<number | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<number, FeedbackDto>>({});
  const [replyModal, setReplyModal] = useState<{ open: boolean; feedback: FeedbackDto | null }>({
    open: false,
    feedback: null,
  });
  const currentTime = useCurrentTime();
  const navigate = useNavigate();

  // Cách hiển thị danh sách "Chờ xác nhận" — chỉ ảnh hưởng cách NHÓM/HIỂN THỊ, không ảnh hưởng
  // logic an toàn tiền bạc bên dưới (luôn tính theo trùng khung giờ THẬT, bất kể đang xem theo
  // chế độ nào).
  const [pendingGroupMode, setPendingGroupMode] = useState<'default' | 'time' | 'requester'>('default');

  // Số request cạnh tranh THẬT (trùng khung giờ) — dùng để quyết định có cần cảnh báo trước khi
  // accept hay không. Tính độc lập với pendingGroupMode để không bao giờ bị sai lệch bởi lựa chọn
  // hiển thị của gia sư.
  const overlapGroups = useMemo(
    () => (activeTabKey === 'pending' ? groupPendingByOverlap(bookings) : []),
    [bookings, activeTabKey],
  );
  const overlapCountByBookingId = useMemo(() => {
    const map = new Map<number, number>();
    overlapGroups.forEach((group) => group.forEach((booking) => map.set(booking.bookingId, group.length - 1)));
    return map;
  }, [overlapGroups]);

  // Nhóm để HIỂN THỊ — theo đúng chế độ gia sư chọn ở dropdown.
  const pendingGroups = useMemo(() => {
    if (activeTabKey !== 'pending') return bookings.map((booking) => [booking]);
    if (pendingGroupMode === 'time') return groupByExactSchedule(bookings);
    if (pendingGroupMode === 'requester') return groupByRequester(bookings);
    return overlapGroups.length > 0 ? overlapGroups : bookings.map((booking) => [booking]);
  }, [bookings, activeTabKey, pendingGroupMode, overlapGroups]);
  const orderedBookings = useMemo(() => pendingGroups.flat(), [pendingGroups]);
  const groupInfoByBookingId = useMemo(() => {
    const map = new Map<number, { size: number; isFirstInGroup: boolean; groupLabel: string; showWarning: boolean }>();
    pendingGroups.forEach((group) => {
      const first = group[0];
      let groupLabel: string;
      const showWarning = group.length > 1;
      if (pendingGroupMode === 'requester') {
        groupLabel = first.student?.fullName || 'Học sinh chưa cập nhật tên';
      } else {
        const uniqueSlots = getUniqueSchedule(first);
        groupLabel =
          uniqueSlots
            .map((slot) => `${formatDayName(slot.dayOfWeek)} ${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`)
            .join(', ') || 'Chưa có lịch cụ thể';
      }
      group.forEach((booking, idx) => {
        map.set(booking.bookingId, { size: group.length, isFirstInGroup: idx === 0, groupLabel, showWarning });
      });
    });
    return map;
  }, [pendingGroups, pendingGroupMode]);
  const acceptConfirmBooking = orderedBookings.find((b) => b.bookingId === acceptConfirmBookingId) ?? null;
  const acceptConfirmCompetitorCount = acceptConfirmBookingId
    ? overlapCountByBookingId.get(acceptConfirmBookingId) ?? 0
    : 0;

  /**
   * Nạp đánh giá cho các booking đã hoàn thành trên trang hiện tại. Gọi theo từng booking
   * thay vì lấy cả danh sách đánh giá của gia sư rồi ghép: danh sách đó phân trang riêng nên
   * gia sư nhiều đánh giá sẽ bị thiếu. Tối đa `pageSize` request, chạy song song.
   */
  const fetchFeedbacksFor = async (items: BookingResponseDTO[]) => {
    const completed = items.filter((b) => b.status === 'completed');
    if (completed.length === 0) {
      setFeedbacks({});
      return;
    }

    const results = await Promise.all(
      completed.map(async (b) => {
        try {
          const response = await getBookingFeedback(b.bookingId);
          return [b.bookingId, response.content] as const;
        } catch {
          return [b.bookingId, null] as const;
        }
      }),
    );

    const map: Record<number, FeedbackDto> = {};
    for (const [bookingId, feedback] of results) {
      if (feedback) map[bookingId] = feedback;
    }
    setFeedbacks(map);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getTutorBookings({ status: activeStatusFilter, page: currentPage, pageSize });

      // API can return either a paged payload or a direct array in older environments.
      const payload = response.content as unknown as
        | BookingResponseDTO[]
        | {
            items?: BookingResponseDTO[];
            totalCount?: number;
            content?: BookingResponseDTO[];
            totalElements?: number;
          };
      let items: BookingResponseDTO[] = [];
      let total = 0;

      if (Array.isArray(payload)) {
        items = payload;
        total = payload.length;
      } else if (payload && Array.isArray(payload.items)) {
        items = payload.items;
        total = payload.totalCount || items.length;
      } else if (payload && Array.isArray(payload.content)) {
        items = payload.content;
        total = payload.totalElements || payload.totalCount || items.length;
      }

      setBookings(items);
      setTotalCount(total);
      await fetchFeedbacksFor(items);
    } catch (error: unknown) {
      console.error('Fetch bookings error:', error);
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 403) {
        toast.error('Bạn không có quyền truy cập. Vui lòng kiểm tra lại tài khoản hoặc quyền gia sư.');
      } else {
        toast.error(getApiErrorMessage(error, 'Không thể tải danh sách yêu cầu đặt lịch. Vui lòng thử lại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabKey, activeStatusFilter, currentPage, pageSize]);

  // Tab "Chờ xác nhận" hiển thị mốc "Hết hạn phản hồi" tính hoàn toàn phía client (so
  // responseDeadline với currentTime) — khi hết hạn, TutorResponseTimeoutJob ở BE sẽ tự hủy +
  // hoàn cọc trong vòng tối đa 1h, nhưng danh sách này trước đây chỉ nạp 1 lần lúc vào tab nên
  // thẻ vẫn hiện y nguyên "Chờ xác nhận" dù BE đã xử lý xong, khiến gia sư tưởng hệ thống không
  // làm gì. Poll lại định kỳ để thẻ tự rơi khỏi tab này ngay khi BE đã hủy.
  useEffect(() => {
    if (activeTab !== 'pending') return undefined;
    const timer = window.setInterval(() => {
      void fetchBookings();
    }, 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, pageSize]);

  const handleTabChange = (tabKey: BookingTab) => {
    setCurrentPage(1);
    setActiveTab(tabKey);
  };

  const handleSectionChange = (sectionKey: BookingSection) => {
    if (sectionKey === activeSection) return;
    setCurrentPage(1);
    // Ghi cả `section` lẫn `tab` trong MỘT lượt: useTabParam đọc cùng một snapshot params, nên
    // hai lần setSearchParams liên tiếp sẽ khiến lượt sau xoá mất lượt trước.
    setActiveSection(sectionKey, { tab: firstTabOfSection(sectionKey) });
  };

  const handleAccept = async (id: number) => {
    try {
      setProcessingBooking({ id, action: 'accept' });
      await acceptBooking(id);
      toast.success('Đã chấp nhận yêu cầu!');
      await fetchBookings();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Có lỗi xảy ra khi chấp nhận yêu cầu.'));
    } finally {
      setProcessingBooking(null);
    }
  };

  const handleDecline = (id: number) => {
    setSelectedBookingId(id);
    setDeclineModalVisible(true);
  };

  const handleContactParent = async (booking: BookingResponseDTO) => {
    // booking.parentId chỉ có giá trị khi khóa học do phụ huynh quản lý (kể cả khi chính con
    // họ là người bấm đặt lịch — BE luôn gán Parentid trong trường hợp đó, xem
    // BookingPayerResolver ở backend). Booking do học sinh tự đăng ký đặt thì parentId null,
    // và booking.student.studentId chính là user id của học sinh đó (Studentid == user_id
    // với tài khoản tự đăng ký).
    const isParentBooking = !!booking.parentId;

    try {
      setOpeningChatId(booking.bookingId);
      const channelResponse = await getOrCreateBookingChannel(booking.bookingId);
      const channelId = channelResponse.content?.channelId;
      if (!channelId) throw new Error('Thiếu channelId');

      const channelsResponse = await getChats();
      const existingChannel = channelsResponse.content.find((channel) => channel.channelId === channelId);
      const openChannel: ChatChannel = existingChannel
        ? { ...existingChannel, bookingId: booking.bookingId }
        : {
            channelId,
            bookingId: booking.bookingId,
            otherUserId: (isParentBooking ? booking.parentId : booking.student?.studentId) ?? '',
            otherUserName: isParentBooking
              ? `Phụ huynh của ${booking.student?.fullName || 'học sinh'}`
              : booking.student?.fullName || 'Học viên',
            otherUserAvatarUrl: '',
            otherUserRole: isParentBooking ? 'Parent' : 'Student',
            isOtherUserParentManaged: isParentBooking ? null : false,
            status: 'active',
            lastMessageAt: '',
            lastMessagePreview: '',
          };

      navigate('/tutor-portal/messages', { state: { openChannel } });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isParentBooking
            ? 'Không mở được cuộc trò chuyện với phụ huynh. Vui lòng thử lại.'
            : 'Không mở được cuộc trò chuyện với học viên. Vui lòng thử lại.',
        ),
      );
    } finally {
      setOpeningChatId(null);
    }
  };

  const closeDeclineModal = () => {
    if (processingBooking?.action === 'decline') return;
    setDeclineModalVisible(false);
    setDeclineReason('');
    setSelectedBookingId(null);
  };

  const confirmDecline = async () => {
    if (selectedBookingId === null) return;
    if (!declineReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối trước khi xác nhận.');
      return;
    }
    if (declineReason.trim().length < 10) {
      toast.warning('Lý do từ chối phải có ít nhất 10 ký tự.');
      return;
    }

    try {
      setProcessingBooking({ id: selectedBookingId, action: 'decline' });
      await declineBooking(selectedBookingId, declineReason.trim());
      toast.success('Đã từ chối yêu cầu.');
      setDeclineModalVisible(false);
      setDeclineReason('');
      setSelectedBookingId(null);
      await fetchBookings();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Có lỗi xảy ra khi từ chối yêu cầu.'));
    } finally {
      setProcessingBooking(null);
    }
  };

  // Đang lọc theo một lý do cụ thể mà rỗng thì câu "Chưa có yêu cầu đã hủy" là sai — tab có thể
  // đầy booking, chỉ là không cái nào thuộc lý do đang chọn. Nói đúng để gia sư biết cần bỏ lọc.
  const activeCancelReason = CANCEL_REASON_OPTIONS.find((option) => option.value === cancelReason);
  const isFilteredCancelView = activeTabConfig.key === 'cancelled' && cancelReason !== 'all';
  const emptyCopy = isFilteredCancelView
    ? {
        title: `Không có booking nào thuộc lý do “${activeCancelReason?.label ?? ''}”`,
        description: 'Chọn “Tất cả lý do” để xem toàn bộ booking đã hủy.',
      }
    : activeTabConfig.empty;

  return (
    <PageContainer
      className={styles.container}
      title="Quản lý đặt lịch"
      titleInfo="Phản hồi yêu cầu mới từ phụ huynh và theo dõi các lớp đã chốt."
      maxWidth="wide"
    >
      <main className={styles.content}>
        <div className={styles.sectionBar} role="tablist" aria-label="Chọn nhóm quản lý">
          {SECTION_TABS.map((section) => (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={activeSection === section.key}
              className={`${styles.sectionButton} ${activeSection === section.key ? styles.sectionButtonActive : ''}`}
              onClick={() => handleSectionChange(section.key)}
            >
              <span className={styles.sectionLabel}>{section.label}</span>
              <span className={styles.sectionHint}>{section.hint}</span>
            </button>
          ))}
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="Lọc theo trạng thái" data-tour="bookings-tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTabConfig.key === tab.key}
              className={`${styles.tabButton} ${activeTabConfig.key === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span className={styles.tabDot} aria-hidden="true" />
              {tab.label}
              {activeTabConfig.key === tab.key && !loading && <span className={styles.tabCount}>{totalCount}</span>}
            </button>
          ))}
        </div>

        {activeTabConfig.key === 'cancelled' && (
          <div className={styles.pendingGroupFilter}>
            <span>Lý do hủy</span>
            <Select
              size="small"
              value={cancelReason}
              onChange={(value) => {
                setCurrentPage(1);
                setCancelReason(value);
              }}
              options={CANCEL_REASON_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
              style={{ minWidth: 200 }}
            />
          </div>
        )}

        {activeTabConfig.key === 'pending' && bookings.length > 0 && (
          <div className={styles.pendingGroupFilter}>
            <span>Hiển thị</span>
            <Select
              size="small"
              value={pendingGroupMode}
              onChange={(value) => setPendingGroupMode(value)}
              options={[
                { label: 'Mặc định', value: 'default' },
                { label: 'Theo khung giờ', value: 'time' },
                { label: 'Theo người đặt', value: 'requester' },
              ]}
              style={{ minWidth: 160 }}
            />
          </div>
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} aria-hidden="true" />
            <div>
              <strong>Đang tải yêu cầu</strong>
              <p>Thông tin mới nhất sẽ hiển thị trong giây lát.</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Search size={28} />
            </div>
            <h3>{emptyCopy.title}</h3>
            <p>{emptyCopy.description}</p>
          </div>
        ) : (
          <div className={styles.bookingList}>
            {orderedBookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status] ?? {
                label: booking.status,
                tone: 'pending',
              };
              const schedule = getUniqueSchedule(booking);
              const requestDate = formatRequestDate(booking.createdAt);
              const bookingPeriod = getBookingPeriod(booking);
              const feeBreakdown = getFeeBreakdown(booking);
              const isAccepting = processingBooking?.id === booking.bookingId && processingBooking.action === 'accept';
              const isProcessing = processingBooking?.id === booking.bookingId;
              const responseDeadline =
                booking.status === 'pending_tutor'
                  ? getBookingResponseDeadlineState(booking.responseDeadline, currentTime)
                  : null;
              const bookingFeedback = feedbacks[booking.bookingId];
              const responseHintTone = responseDeadline ? styles[`responseHint_${responseDeadline.urgency}`] : '';
              const deadlineBadgeTone =
                responseDeadline?.urgency === 'critical'
                  ? styles.deadlineBadgeCritical
                  : responseDeadline?.urgency === 'warning'
                    ? styles.deadlineBadgeWarning
                    : '';
              const groupInfo = groupInfoByBookingId.get(booking.bookingId);
              // Luôn dùng số trùng khung giờ THẬT (không phụ thuộc chế độ hiển thị) để quyết định
              // có cần cảnh báo trước khi accept hay không.
              const competitorCount = overlapCountByBookingId.get(booking.bookingId) ?? 0;

              return (
                <div key={booking.bookingId} className={styles.groupedCardWrap}>
                {groupInfo?.isFirstInGroup && (pendingGroupMode !== 'default' || groupInfo.size > 1) && (
                  <div className={styles.overlapGroupHeader}>
                    <Clock size={14} />
                    <span>
                      {groupInfo.groupLabel} · {groupInfo.size} yêu cầu
                      {groupInfo.showWarning &&
                        ' đang chờ cùng khung giờ — chấp nhận 1 sẽ tự động hủy các yêu cầu còn lại'}
                    </span>
                  </div>
                )}
                <article className={styles.bookingCard} data-tour="bookings-card">
                  <div className={styles.cardHeader}>
                    <div className={styles.studentInfo}>
                      <div className={styles.avatar} aria-hidden="true">
                        {booking.student?.fullName?.trim().charAt(0).toUpperCase() || <User size={20} />}
                      </div>
                      <div className={styles.studentIdentity}>
                        <div className={styles.studentNameRow}>
                          <h3>{booking.student?.fullName || 'Học sinh chưa cập nhật tên'}</h3>
                          {/* Mã booking hiển thị ngay trên card: thông báo, tin nhắn hỗ trợ và log
                              đều gọi booking theo số này, nên không có nó thì không đối chiếu được
                              cái đang xem với cái đang được nhắc tới. */}
                          <span className={styles.bookingIdBadge} title={`Mã booking #${booking.bookingId}`}>
                            #{booking.bookingId}
                          </span>
                          <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
                            {status.label}
                          </span>
                          {responseDeadline && (
                            <span
                              className={`${styles.deadlineBadge} ${deadlineBadgeTone}`}
                              title={responseDeadline.deadlineLabel}
                            >
                              <Clock size={13} aria-hidden="true" />
                              {responseDeadline.isExpired
                                ? 'Hết hạn phản hồi'
                                : `Còn ${responseDeadline.compactRemainingLabel}`}
                            </span>
                          )}
                        </div>
                        <p>
                          {formatGrade(booking.student?.gradeLevel)}
                          {requestDate && (
                            <>
                              <span aria-hidden="true">•</span>
                              Gửi ngày {requestDate}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.bookingDetails}>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>
                            <BookOpen size={18} />
                          </span>
                          <div>
                            <span className={styles.infoLabel}>Môn học</span>
                            <strong>{booking.subject?.subjectName || 'Chưa cập nhật'}</strong>
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <span className={styles.infoIcon}>
                            <Calendar size={18} />
                          </span>
                          <div>
                            <span className={styles.infoLabel}>Thời lượng</span>
                            <strong>{booking.sessionCount} buổi học</strong>
                          </div>
                        </div>
                      </div>

                      <section className={styles.scheduleSection} aria-label="Lịch học dự kiến">
                        <div className={styles.sectionHeading}>
                          <div>
                            <Calendar size={17} />
                            <h4>Lịch học dự kiến</h4>
                          </div>
                        </div>
                        <div className={styles.scheduleBody}>
                          <div className={styles.scheduleSummary}>
                            <div className={styles.bookingPeriod}>
                              <div>
                                <span>Bắt đầu</span>
                                <strong>{formatRequestDate(bookingPeriod.startDate) || 'Chưa xác định'}</strong>
                              </div>
                              <span className={styles.periodDivider} aria-hidden="true">
                                →
                              </span>
                              <div>
                                <span>Kết thúc</span>
                                <strong>{formatRequestDate(bookingPeriod.endDate) || 'Chưa xác định'}</strong>
                              </div>
                            </div>
                            {schedule.length > 0 ? (
                              <div className={styles.scheduleList}>
                                {schedule.map((slot) => (
                                  <div
                                    key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`}
                                    className={styles.scheduleTag}
                                  >
                                    <span>{formatDayName(slot.dayOfWeek)}</span>
                                    <strong>
                                      {formatTime(slot.startTime)}
                                      {slot.endTime ? ` – ${formatTime(slot.endTime)}` : ''}
                                    </strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={styles.noSchedule}>Phụ huynh chưa chọn khung giờ học.</p>
                            )}
                          </div>
                          <BookingMonthCalendar
                            lessons={booking.lessons}
                            startDate={booking.startDate}
                            schedule={booking.schedule}
                            sessionCount={booking.sessionCount}
                          />
                        </div>
                      </section>
                    </div>

                    <aside className={styles.payoutCard} aria-label="Thông tin thanh toán" data-tour="bookings-payout">
                      <div className={styles.payoutTitle}>
                        <span>
                          <Wallet size={18} />
                        </span>
                        <div>
                          <p>Bạn thực nhận toàn khóa</p>
                          <strong>{formatPrice(feeBreakdown.tutorReceivable)}</strong>
                        </div>
                      </div>

                      <div
                        className={`${styles.depositSummary} ${!feeBreakdown.isFirstSessionPaid ? styles.depositPending : ''}`}
                      >
                        <div className={styles.depositSummaryHeader}>
                          <span>
                            <Check size={13} />
                            {feeBreakdown.isFirstSessionPaid
                              ? 'Phụ huynh đã thanh toán buổi đầu'
                              : 'Thanh toán buổi đầu dự kiến'}
                          </span>
                        </div>
                        <strong>{formatPrice(feeBreakdown.firstSessionPayment)}</strong>
                        {!feeBreakdown.isFirstSessionPaid && (
                          <small>Số tiền cần thanh toán để gửi yêu cầu cho gia sư.</small>
                        )}
                      </div>

                      <div className={styles.priceBreakdown}>
                        <div>
                          <span>Học phí gốc</span>
                          <strong>{formatPrice(feeBreakdown.originalTuition)}</strong>
                        </div>
                        {feeBreakdown.discount > 0 && (
                          <>
                            <div>
                              <span>Ưu đãi</span>
                              <strong className={styles.negativeAmount}>− {formatPrice(feeBreakdown.discount)}</strong>
                            </div>
                            <div>
                              <span>Học phí sau ưu đãi</span>
                              <strong>{formatPrice(feeBreakdown.baseAmount)}</strong>
                            </div>
                          </>
                        )}
                        <div>
                          <span>Phí phụ huynh (5%)</span>
                          <strong className={styles.positiveAmount}>+ {formatPrice(feeBreakdown.parentFee)}</strong>
                        </div>
                        <div className={styles.parentTotalRow}>
                          <span>Phụ huynh cần thanh toán</span>
                          <strong>{formatPrice(booking.finalPrice)}</strong>
                        </div>
                        <div className={styles.tutorFeeRow}>
                          <span>Phí gia sư (5%)</span>
                          <strong className={styles.negativeAmount}>
                            − {formatPrice(feeBreakdown.tutorServiceFee)}
                          </strong>
                        </div>
                      </div>
                      <p className={styles.payoutNote}>Hai khoản phí 5% được tính riêng cho phụ huynh và gia sư.</p>
                    </aside>
                  </div>

                  {bookingFeedback && (
                    <section className={styles.feedbackBlock}>
                      <div className={styles.feedbackHead}>
                        <Star size={16} />
                        <strong>
                          {bookingFeedback.reviewerRole === 'student'
                            ? 'Đánh giá của học viên'
                            : 'Đánh giá của phụ huynh'}
                        </strong>
                        <span className={styles.feedbackStars} aria-hidden="true">
                          {'★'.repeat(bookingFeedback.rating)}
                          <span className={styles.feedbackStarsDim}>
                            {'★'.repeat(Math.max(0, 5 - bookingFeedback.rating))}
                          </span>
                        </span>
                        <span className={styles.feedbackMeta}>{bookingFeedback.rating}/5</span>
                        {bookingFeedback.isVisible === false && (
                          <span className={styles.feedbackHidden}>Đang bị ẩn bởi quản trị viên</span>
                        )}
                      </div>

                      {bookingFeedback.isVisible === false && bookingFeedback.hiddenReason && (
                        <p className={styles.feedbackHiddenReason}>
                          Lý do ẩn: {bookingFeedback.hiddenReason}
                        </p>
                      )}

                      {bookingFeedback.comment && (
                        <p className={styles.feedbackComment}>“{bookingFeedback.comment}”</p>
                      )}

                      {bookingFeedback.reply ? (
                        <div className={styles.feedbackReply}>
                          <strong>Phản hồi của bạn</strong>
                          <p>{bookingFeedback.reply}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.feedbackReplyBtn}
                          onClick={() => setReplyModal({ open: true, feedback: bookingFeedback })}
                        >
                          <MessageCircle size={15} /> Phản hồi đánh giá
                        </button>
                      )}
                    </section>
                  )}

                  <footer className={styles.cardFooter}>
                    <div className={`${styles.responseHint} ${responseHintTone}`}>
                      <Clock size={16} />
                      <div>
                        {responseDeadline ? (
                          <>
                            <strong>
                              {responseDeadline.isExpired
                                ? 'Đã hết thời gian phản hồi'
                                : `Còn ${responseDeadline.remainingLabel} để xác nhận yêu cầu`}
                            </strong>
                            <span>{responseDeadline.deadlineLabel}</span>
                          </>
                        ) : (
                          <span>
                            {booking.status === 'pending_tutor'
                              ? 'Phản hồi sớm để phụ huynh chủ động sắp xếp lịch học.'
                              : `Yêu cầu hiện ở trạng thái “${status.label}”.`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.actions} data-tour="bookings-actions">
                      <button
                        type="button"
                        className={styles.chatBtn}
                        onClick={() => navigate(`/tutor-portal/bookings/${booking.bookingId}`)}
                      >
                        <Eye size={16} /> Xem chi tiết
                      </button>
                      {booking.status !== 'pending_tutor' && (
                        <button
                          type="button"
                          className={styles.chatBtn}
                          disabled={openingChatId === booking.bookingId}
                          onClick={() => handleContactParent(booking)}
                        >
                          <MessageCircle size={16} />
                          {openingChatId === booking.bookingId
                            ? 'Đang mở...'
                            : booking.parentId
                              ? 'Liên hệ phụ huynh'
                              : 'Liên hệ học viên'}
                          <ChevronRight size={16} />
                        </button>
                      )}
                      {booking.status === 'pending_tutor' && !responseDeadline?.isExpired && (
                        <>
                          <button
                            type="button"
                            className={styles.declineBtn}
                            disabled={isProcessing}
                            onClick={() => handleDecline(booking.bookingId)}
                          >
                            <X size={16} /> Từ chối
                          </button>
                          <button
                            type="button"
                            className={styles.acceptBtn}
                            disabled={isProcessing}
                            onClick={() =>
                              competitorCount > 0
                                ? setAcceptConfirmBookingId(booking.bookingId)
                                : handleAccept(booking.bookingId)
                            }
                          >
                            <Check size={16} />
                            {isAccepting ? 'Đang chấp nhận...' : 'Chấp nhận yêu cầu'}
                          </button>
                        </>
                      )}
                    </div>
                  </footer>
                </article>
                </div>
              );
            })}

            {totalCount > 0 && (
              <div className={styles.pagination}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalCount}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size || 10);
                  }}
                  showSizeChanger
                  showTotal={(total) => `${total} yêu cầu`}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <Modal
        title={null}
        footer={null}
        open={declineModalVisible}
        onCancel={closeDeclineModal}
        width={480}
        centered
        className={styles.declineModal}
      >
        <div className={styles.declineHeader}>
          <span className={styles.declineHeaderIcon}>
            <X size={20} />
          </span>
          <h2>Từ chối yêu cầu đặt lịch</h2>
        </div>

        <div className={styles.declineContent}>
          <p>
            Lý do này sẽ giúp phụ huynh hiểu tình trạng và chủ động tìm lịch học khác.
            <span className={styles.requiredMark}>*</span>
          </p>
          <Input.TextArea
            className={styles.declineTextarea}
            rows={4}
            placeholder="Ví dụ: Tôi hiện không còn lịch trống vào khung giờ này..."
            value={declineReason}
            maxLength={500}
            showCount
            onChange={(event) => setDeclineReason(event.target.value)}
            status={declineReason.trim().length > 0 && declineReason.trim().length < 10 ? 'error' : undefined}
          />
          {declineReason.trim().length > 0 && declineReason.trim().length < 10 && (
            <p className={styles.validationMessage}>
              Vui lòng nhập ít nhất 10 ký tự ({declineReason.trim().length}/10).
            </p>
          )}
        </div>

        <div className={styles.declineFooter}>
          <button
            type="button"
            className={styles.declineCancelBtn}
            disabled={processingBooking?.action === 'decline'}
            onClick={closeDeclineModal}
          >
            Quay lại
          </button>
          <button
            type="button"
            className={styles.declineConfirmBtn}
            disabled={processingBooking?.action === 'decline'}
            onClick={confirmDecline}
          >
            {processingBooking?.action === 'decline' ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </Modal>

      <Modal
        title={null}
        footer={null}
        open={acceptConfirmBookingId !== null}
        onCancel={() => setAcceptConfirmBookingId(null)}
        width={480}
        centered
        className={styles.declineModal}
      >
        <div className={styles.declineHeader}>
          <span className={styles.declineHeaderIcon}>
            <Check size={20} />
          </span>
          <h2>Xác nhận chấp nhận yêu cầu</h2>
        </div>

        <div className={styles.declineContent}>
          <p>
            Khung giờ này hiện có <strong>{acceptConfirmCompetitorCount}</strong> yêu cầu khác đang chờ. Chấp nhận
            yêu cầu của <strong>{acceptConfirmBooking?.student?.fullName || 'học sinh này'}</strong> sẽ{' '}
            <strong>tự động hủy</strong> {acceptConfirmCompetitorCount === 1 ? 'yêu cầu' : 'toàn bộ các yêu cầu'} còn
            lại trùng khung giờ, hoàn tiền cọc (nếu đã đóng) về ví của PHHS tương ứng.
          </p>
        </div>

        <div className={styles.declineFooter}>
          <button
            type="button"
            className={styles.declineCancelBtn}
            disabled={processingBooking?.action === 'accept'}
            onClick={() => setAcceptConfirmBookingId(null)}
          >
            Quay lại
          </button>
          <button
            type="button"
            className={styles.declineConfirmBtn}
            disabled={processingBooking?.action === 'accept'}
            onClick={async () => {
              if (acceptConfirmBookingId === null) return;
              await handleAccept(acceptConfirmBookingId);
              setAcceptConfirmBookingId(null);
            }}
          >
            {processingBooking?.action === 'accept' ? 'Đang xử lý...' : 'Xác nhận chấp nhận'}
          </button>
        </div>
      </Modal>

      <ReplyFeedbackModal
        open={replyModal.open}
        onClose={() => setReplyModal({ open: false, feedback: null })}
        onSuccess={() => {
          setReplyModal({ open: false, feedback: null });
          // Nạp lại để thẻ đổi từ nút "Phản hồi" sang nội dung đã trả lời.
          void fetchFeedbacksFor(bookings);
        }}
        feedbackId={replyModal.feedback?.feedbackId || 0}
        parentName={replyModal.feedback?.parentName}
        reviewerRole={replyModal.feedback?.reviewerRole}
        rating={replyModal.feedback?.rating}
        comment={replyModal.feedback?.comment}
        createdAt={replyModal.feedback?.createdAt}
      />
    </PageContainer>
  );
};

export default TutorPortalBookings;
