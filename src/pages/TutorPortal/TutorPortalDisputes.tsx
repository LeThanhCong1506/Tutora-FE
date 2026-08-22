import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, RefreshCw, Search, X } from 'lucide-react';
import { Button, ConfigProvider, Empty, Input, Pagination, Select, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import { getTutorDisputesList, type DisputeListResponse } from '../../services/classSession.service';
import {
  DISPUTE_PAGE_THEME,
  DISPUTE_SORT_OPTIONS,
  DISPUTE_STATUS_TABS,
  DISPUTE_TYPE_OPTIONS,
  getDisputePriorityMeta,
  getDisputeStatusMeta,
  getDisputeTypeLabel,
  type DisputeSortDirection,
  type DisputeStatusFilter,
  type DisputeTypeFilter,
} from '../../components/disputes/disputePresentation';
import { formatCurrency } from '../../utils/formatters';
import { formatLocalDateTime } from '../../utils/datetime';
import styles from '../../components/disputes/DisputesTable.module.css';

const SEARCH_DEBOUNCE_MS = 350;
const DISPUTES_PER_PAGE = 10;

const TutorPortalDisputes = () => {
  const navigate = useNavigate();
  const latestRequest = useRef(0);
  const skipNextAutoFetch = useRef(false);
  const [disputes, setDisputes] = useState<DisputeListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [usesLegacyUnpaginatedResponse, setUsesLegacyUnpaginatedResponse] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DisputeStatusFilter>('');
  const [typeFilter, setTypeFilter] = useState<DisputeTypeFilter>('');
  const [sortDirection, setSortDirection] = useState<DisputeSortDirection>('desc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDisputes = useCallback(async () => {
    const requestId = ++latestRequest.current;

    try {
      setLoading(true);
      setHasError(false);
      const response = await getTutorDisputesList({
        page: currentPage,
        pageSize: DISPUTES_PER_PAGE,
        status: statusFilter || undefined,
        disputeType: typeFilter || undefined,
        search: searchQuery || undefined,
        sortDirection,
      });

      if (requestId !== latestRequest.current) return;

      const content = response.content;
      if (Array.isArray(content)) {
        // Older API deployments may return the whole collection instead of a paged payload.
        // Keep the UI at 10 rows/page in that case too.
        setDisputes(content);
        setTotalItems(content.length);
        setUsesLegacyUnpaginatedResponse(true);
        return;
      }

      setDisputes(content?.items ?? []);
      setTotalItems(content?.totalCount ?? 0);
      setUsesLegacyUnpaginatedResponse(false);
      if (content?.page && content.page !== currentPage) {
        skipNextAutoFetch.current = true;
        setCurrentPage(content.page);
      }
    } catch {
      if (requestId !== latestRequest.current) return;
      setDisputes([]);
      setTotalItems(0);
      setUsesLegacyUnpaginatedResponse(false);
      setHasError(true);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [currentPage, searchQuery, sortDirection, statusFilter, typeFilter]);

  useEffect(() => {
    if (skipNextAutoFetch.current) {
      skipNextAutoFetch.current = false;
      return;
    }

    const timer = window.setTimeout(() => void fetchDisputes(), 0);
    return () => {
      window.clearTimeout(timer);
      latestRequest.current += 1;
    };
  }, [fetchDisputes]);

  // Tìm kiếm chạy ngay khi ngừng gõ: không còn "chữ đã gõ nhưng chưa tìm" để rồi bị áp dụng
  // bất ngờ lúc người dùng bấm sang bộ lọc khác.
  useEffect(() => {
    const normalized = searchInput.trim();
    if (normalized === searchQuery) return;

    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setSearchQuery(normalized);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchQuery]);

  // Sang trang chi tiết khiếu nại thay vì mở popup: có URL để chia sẻ, F5 không mất, và đủ
  // chỗ cho dòng thời gian, bằng chứng, bối cảnh buổi học.
  const openDispute = useCallback(
    (dispute: DisputeListResponse) => {
      if (dispute.classSessionId) navigate(`/tutor-portal/disputes/${dispute.classSessionId}`);
    },
    [navigate],
  );

  const applyFilterChange = (update: () => void) => {
    setCurrentPage(1);
    update();
  };

  /** Enter = tìm ngay, không đợi hết debounce. */
  const submitSearch = () => applyFilterChange(() => setSearchQuery(searchInput.trim()));

  const clearFilters = () => {
    setCurrentPage(1);
    setStatusFilter('');
    setTypeFilter('');
    setSortDirection('desc');
    setSearchInput('');
    setSearchQuery('');
  };

  const filtersAreActive = Boolean(statusFilter || typeFilter || searchQuery);
  const controlsAreModified = filtersAreActive || sortDirection !== 'desc';
  const visibleDisputes = useMemo(() => {
    if (!usesLegacyUnpaginatedResponse) return disputes;
    const startIndex = (currentPage - 1) * DISPUTES_PER_PAGE;
    return disputes.slice(startIndex, startIndex + DISPUTES_PER_PAGE);
  }, [currentPage, disputes, usesLegacyUnpaginatedResponse]);

  const columns = useMemo<ColumnsType<DisputeListResponse>>(
    () => [
      {
        title: 'Hồ sơ',
        key: 'case',
        width: 130,
        render: (_, dispute) => (
          <div className={styles.caseCell}>
            <span className={styles.caseId}>#{dispute.disputeId}</span>
            <span className={styles.secondaryText}>
              {dispute.bookingId ? `Booking #${dispute.bookingId}` : 'Chưa có booking'}
            </span>
            {dispute.createdAt && <span className={styles.mobileDate}>{formatLocalDateTime(dispute.createdAt)}</span>}
          </div>
        ),
      },
      {
        title: 'Nội dung khiếu nại',
        key: 'issue',
        width: 330,
        render: (_, dispute) => {
          const reason = dispute.reason || 'Không có mô tả bổ sung';
          return (
            <div className={styles.issueCell}>
              <span className={styles.typeLabel}>
                {getDisputeTypeLabel(dispute.disputeType, dispute.disputeTypeDisplay)}
              </span>
              <Tooltip title={reason} placement="topLeft">
                <span className={styles.reasonText}>{reason}</span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        title: 'Buổi học',
        key: 'lesson',
        width: 170,
        responsive: ['md'],
        render: (_, dispute) => (
          <div className={styles.lessonCell}>
            <span className={styles.primaryText}>
              {dispute.classSessionId ? `Buổi #${dispute.classSessionId}` : 'Chưa xác định'}
            </span>
            <span className={styles.secondaryText}>
              {typeof dispute.classSessionPrice === 'number'
                ? formatCurrency(dispute.classSessionPrice)
                : 'Chưa có học phí'}
            </span>
          </div>
        ),
      },
      {
        title: 'Mức độ',
        key: 'priority',
        width: 130,
        responsive: ['lg'],
        render: (_, dispute) => {
          const priority = getDisputePriorityMeta(dispute.priority, dispute.priorityDisplay);
          return (
            <Tooltip title={dispute.priorityReason || undefined}>
              <span
                className={styles.priorityTooltipTrigger}
                tabIndex={dispute.priorityReason ? 0 : undefined}
                aria-label={
                  dispute.priorityReason
                    ? `${priority.label}. Lý do ưu tiên: ${dispute.priorityReason}`
                    : priority.label
                }
              >
                <StatusBadge variant={priority.variant} shape="tag" className={styles.priorityBadge}>
                  {priority.label}
                </StatusBadge>
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Ngày tạo',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        responsive: ['lg'],
        render: (createdAt: string | null | undefined) => (
          <span className={styles.dateText}>{createdAt ? formatLocalDateTime(createdAt) : 'Chưa có thời gian'}</span>
        ),
      },
      {
        title: 'Trạng thái',
        key: 'status',
        width: 170,
        render: (_, dispute) => {
          const status = getDisputeStatusMeta(dispute.status, dispute.statusDisplay);
          return (
            <StatusBadge variant={status.variant} className={styles.statusBadge}>
              {status.label}
            </StatusBadge>
          );
        },
      },
      {
        title: '',
        key: 'action',
        width: 62,
        align: 'right',
        render: (_, dispute) => (
          <Tooltip title="Xem chi tiết khiếu nại">
            <button
              type="button"
              className={styles.openButton}
              aria-label={`Xem chi tiết khiếu nại ${dispute.disputeId}`}
              onClick={(event) => {
                event.stopPropagation();
                openDispute(dispute);
              }}
            >
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </Tooltip>
        ),
      },
    ],
    [openDispute],
  );

  const emptyDescription = hasError
    ? 'Không thể tải danh sách khiếu nại'
    : filtersAreActive
      ? 'Không tìm thấy khiếu nại phù hợp'
      : 'Bạn chưa có khiếu nại nào';

  return (
    <ConfigProvider theme={DISPUTE_PAGE_THEME}>
      <PageContainer
        className={styles.page}
        title="Khiếu nại"
        headerAction={
          <Button
            className={styles.refreshButton}
            icon={<RefreshCw size={15} />}
            onClick={() => void fetchDisputes()}
            loading={loading}
          >
            Làm mới
          </Button>
        }
      >
        <SectionCard className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeading}>
              <h2 className={styles.cardTitle}>Danh sách khiếu nại</h2>
              <div className={styles.cardMeta}>
                <p className={styles.cardSubtitle} aria-live="polite">
                  {loading ? 'Đang cập nhật dữ liệu...' : `${totalItems.toLocaleString('vi-VN')} hồ sơ`}
                </p>
                {totalItems > DISPUTES_PER_PAGE && (
                  <Pagination
                    className={styles.headerPagination}
                    size="small"
                    current={currentPage}
                    pageSize={DISPUTES_PER_PAGE}
                    total={totalItems}
                    showSizeChanger={false}
                    showLessItems
                    onChange={setCurrentPage}
                  />
                )}
              </div>
            </div>

            <div className={styles.toolbar}>
              <Input
                className={styles.searchInput}
                aria-label="Tìm kiếm khiếu nại"
                placeholder="Tìm mã, booking, người khiếu nại, nội dung..."
                prefix={<Search size={16} aria-hidden="true" />}
                value={searchInput}
                allowClear
                onChange={(event) => setSearchInput(event.target.value)}
                onPressEnter={submitSearch}
              />

              <Select
                className={styles.typeSelect}
                aria-label="Lọc theo loại khiếu nại"
                value={typeFilter}
                options={DISPUTE_TYPE_OPTIONS}
                onChange={(value: DisputeTypeFilter) => applyFilterChange(() => setTypeFilter(value))}
              />

              <Select
                className={styles.sortSelect}
                aria-label="Sắp xếp khiếu nại"
                value={sortDirection}
                options={DISPUTE_SORT_OPTIONS}
                onChange={(value: DisputeSortDirection) => applyFilterChange(() => setSortDirection(value))}
              />
            </div>
          </div>

          <div className={styles.statusTabs} role="group" aria-label="Lọc khiếu nại theo trạng thái" data-tour="disputes-tabs">
            {DISPUTE_STATUS_TABS.map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                aria-pressed={statusFilter === tab.key}
                className={statusFilter === tab.key ? styles.activeStatusTab : undefined}
                onClick={() => applyFilterChange(() => setStatusFilter(tab.key))}
              >
                {tab.label}
              </button>
            ))}

            {controlsAreModified && (
              <button type="button" className={styles.clearButton} onClick={clearFilters}>
                <X size={13} aria-hidden="true" />
                Xóa bộ lọc
              </button>
            )}
          </div>

          {hasError && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>Dữ liệu chưa tải được. Vui lòng kiểm tra kết nối và thử lại.</span>
              <button type="button" onClick={() => void fetchDisputes()}>
                Thử lại
              </button>
            </div>
          )}

          <Table<DisputeListResponse>
            className={styles.disputeTable}
            data-tour="disputes-table"
            columns={columns}
            dataSource={visibleDisputes}
            rowKey="disputeId"
            loading={loading}
            size="middle"
            scroll={{ x: 'max-content', y: 'calc(100dvh - 440px)' }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div className={styles.emptyState}>
                      <strong>{emptyDescription}</strong>
                      <span>
                        {hasError
                          ? 'Chọn “Thử lại” ở thông báo phía trên để tải lại dữ liệu.'
                          : filtersAreActive
                            ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc đang chọn.'
                            : 'Các khiếu nại liên quan đến buổi học sẽ xuất hiện tại đây.'}
                      </span>
                      {filtersAreActive && (
                        <button type="button" onClick={clearFilters}>
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  }
                />
              ),
            }}
            pagination={false}
            onRow={(dispute) => ({
              className: styles.clickableRow,
              onClick: () => openDispute(dispute),
            })}
          />
          {totalItems > 0 && (
            <div className={styles.paginationBar}>
              <span className={styles.paginationSummary}>
                Hiển thị {Math.min((currentPage - 1) * DISPUTES_PER_PAGE + 1, totalItems)}–{Math.min(currentPage * DISPUTES_PER_PAGE, totalItems)} trong {totalItems.toLocaleString('vi-VN')} hồ sơ
              </span>
              <Pagination
                current={currentPage}
                pageSize={DISPUTES_PER_PAGE}
                total={totalItems}
                showSizeChanger={false}
                showLessItems
                onChange={setCurrentPage}
              />
            </div>
          )}
        </SectionCard>
      </PageContainer>
    </ConfigProvider>
  );
};

export default TutorPortalDisputes;
