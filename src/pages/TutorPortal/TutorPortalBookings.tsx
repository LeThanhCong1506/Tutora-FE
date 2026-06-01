import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/pages/tutor-portal-bookings.module.css';
import { getTutorBookings, acceptBooking, declineBooking, type BookingResponseDTO } from '../../services/booking.service';
import { Calendar, Clock, User, BookOpen, ChevronRight, Check, X, Search } from 'lucide-react';
import { Tabs, Modal, Input, Pagination } from 'antd';
import { toast } from 'react-toastify';

const formatGrade = (grade?: string): string => {
    if (!grade) return '';
    return grade.toLowerCase().includes('lớp') ? grade : `Lớp ${grade}`;
};

const TutorPortalBookings = () => {
    const [bookings, setBookings] = useState<BookingResponseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending_tutor');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [declineModalVisible, setDeclineModalVisible] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    const navigate = useNavigate();

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await getTutorBookings({ status: activeTab, page: currentPage, pageSize });

            // API trả về payload dạng { items: [...], totalCount: ... }
            const payload = response.content;
            let items: BookingResponseDTO[] = [];
            let total = 0;

            if (Array.isArray(payload)) {
                items = payload;
                total = payload.length;
            } else if (payload && Array.isArray((payload as any).items)) {
                items = (payload as any).items;
                total = (payload as any).totalCount || items.length;
            } else if (payload && Array.isArray((payload as any).content)) {
                items = (payload as any).content;
                total = (payload as any).totalElements || (payload as any).totalCount || items.length;
            }

            setBookings(items);
            setTotalCount(total);
        } catch (error: any) {
            console.error('Fetch bookings error:', error);
            if (error.response?.status === 403) {
                toast.error('Bạn không có quyền truy cập (Lỗi 403). Vui lòng kiểm tra lại tài khoản hoặc quyền Tutor.');
            } else {
                toast.error('Không thể tải danh sách yêu cầu đặt lịch: ' + (error.message || 'Lỗi không xác định'));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    useEffect(() => {
        fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, currentPage, pageSize]);

    const handleAccept = async (id: number) => {
        try {
            await acceptBooking(id);
            toast.success('Đã chấp nhận yêu cầu!');
            fetchBookings();
        } catch (error) {
            toast.error('Có lỗi xảy ra khi chấp nhận yêu cầu.');
        }
    };

    const handleDecline = (id: number) => {
        setSelectedBookingId(id);
        setDeclineModalVisible(true);
    };

    const confirmDecline = async () => {
        if (!selectedBookingId) return;
        if (!declineReason.trim()) {
            toast.warning('Vui lòng nhập lý do từ chối trước khi xác nhận.');
            return;
        }
        if (declineReason.trim().length < 10) {
            toast.warning('Lý do từ chối phải có ít nhất 10 ký tự.');
            return;
        }
        try {
            await declineBooking(selectedBookingId, declineReason.trim());
            toast.success('Đã từ chối yêu cầu.');
            setDeclineModalVisible(false);
            setDeclineReason('');
            fetchBookings();
        } catch (error) {
            toast.error('Có lỗi xảy ra khi từ chối yêu cầu.');
        }
    };

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>Quản lý Yêu cầu Đặt lịch</h1>
                    <p>Theo dõi và phản hồi các yêu cầu từ phụ huynh</p>
                </div>
            </header>

            <div className={styles.content}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className={styles.tabs}
                    items={[
                        { key: 'pending_tutor', label: 'Chờ xác nhận' },
                        { key: 'accepted', label: 'Đã chấp nhận' },
                        { key: 'paid', label: 'Đã thanh toán' },
                        { key: 'cancelled', label: 'Đã huỷ' },
                    ]}
                />

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Search size={48} />
                        <h3>Không tìm thấy yêu cầu nào</h3>
                        <p>Các yêu cầu đặt lịch mới sẽ hiển thị tại đây.</p>
                    </div>
                ) : (
                    <div className={styles.bookingList}>
                        {bookings.map((booking) => (
                            <div key={booking.bookingId} className={styles.bookingCard}>
                                <div className={styles.cardMain}>
                                    <div className={styles.studentInfo}>
                                        <div className={styles.avatar}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4>{booking.student?.fullName || 'N/A'}</h4>
                                            <span>{booking.student?.gradeLevel ? formatGrade(booking.student.gradeLevel) : ''}</span>
                                        </div>
                                    </div>

                                    <div className={styles.detailsGrid}>
                                        <div className={styles.detailItem}>
                                            <BookOpen size={16} />
                                            <span>{booking.subject?.subjectName || 'N/A'}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <Clock size={16} />
                                            <span>{booking.sessionCount} buổi</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <Calendar size={16} />
                                            <div className={styles.scheduleTags}>
                                                {booking.schedule.map((s, i) => (
                                                    <span key={i} className={styles.scheduleTag}>
                                                        {DAY_NAMES[s.dayOfWeek]} {s.startTime}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.cardFooter}>
                                    <div className={styles.priceInfo}>
                                        <span className={styles.label}>Tổng phí nhận:</span>
                                        <span className={styles.totalPrice}>{formatPrice(booking.finalPrice - (booking.platformFee ?? 0))}</span>
                                        <span className={styles.feeNote}>(Sau phí hệ thống)</span>
                                    </div>

                                    <div className={styles.actions}>
                                        {booking.status === 'pending_tutor' && (
                                            <>
                                                <button
                                                    className={styles.acceptBtn}
                                                    onClick={() => handleAccept(booking.bookingId)}
                                                >
                                                    <Check size={16} /> Chấp nhận
                                                </button>
                                                <button
                                                    className={styles.declineBtn}
                                                    onClick={() => handleDecline(booking.bookingId)}
                                                >
                                                    <X size={16} /> Từ chối
                                                </button>
                                            </>
                                        )}
                                        <button
                                            className={styles.chatBtn}
                                            onClick={() => navigate('/tutor-portal/messages')}
                                        >
                                            Liên hệ phụ huynh <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {totalCount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', width: '100%' }}>
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={totalCount}
                                    onChange={(page, size) => {
                                        setCurrentPage(page);
                                        setPageSize(size || 10);
                                    }}
                                    showSizeChanger
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal
                title="Từ chối yêu cầu đặt lịch"
                open={declineModalVisible}
                onOk={confirmDecline}
                onCancel={() => setDeclineModalVisible(false)}
                okText="Xác nhận từ chối"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
            >
                <div style={{ padding: '16px 0' }}>
                    <p style={{ marginBottom: 8 }}>
                        Vui lòng nhập lý do từ chối <span style={{ color: '#ff4d4f' }}>*</span>:
                    </p>
                    <Input.TextArea
                        rows={4}
                        placeholder="Ví dụ: Tôi hiện không còn lịch trống vào khung giờ này... (tối thiểu 10 ký tự)"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        status={declineReason.trim().length > 0 && declineReason.trim().length < 10 ? 'error' : undefined}
                    />
                    {declineReason.trim().length > 0 && declineReason.trim().length < 10 && (
                        <p style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                            Lý do phải có ít nhất 10 ký tự ({declineReason.trim().length}/10)
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default TutorPortalBookings;
