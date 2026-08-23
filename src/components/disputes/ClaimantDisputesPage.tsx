import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button, ConfigProvider, Empty, Input, Select, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer, SectionCard, StatusBadge } from '../shared';
import { getParentDisputesList, type DisputeListResponse } from '../../services/classSession.service';
import { formatLocalDateTime } from '../../utils/datetime';
import { formatCurrency } from '../../utils/formatters';
import {
  DISPUTE_PAGE_THEME,
  DISPUTE_SORT_OPTIONS,
  DISPUTE_STATUS_TABS,
  DISPUTE_TYPE_OPTIONS,
  getDisputeStatusMeta,
  getDisputeTypeLabel,
  type DisputeSortDirection,
  type DisputeStatusFilter,
  type DisputeTypeFilter,
} from './disputePresentation';
import styles from './DisputesTable.module.css';

export interface ClaimantDisputesPageProps {
  reloadKey: number;
  onCreate: () => void;
  infoText: string;
  /** Mở chi tiết một khiếu nại — mỗi portal tự dựng đường dẫn của mình. */
  onOpenDispute: (dispute: DisputeListResponse) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

const ClaimantDisputesPage = ({
  reloadKey,
  onCreate,
  onOpenDispute,
  infoText,
}: ClaimantDisputesPageProps) => {
  const latestRequest = useRef(0);
  const skipNextAutoFetch = useRef(false);
  const [disputes, setDisputes] = useState<DisputeListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
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
      const response = await getParentDisputesList({
        page: currentPage,
        pageSize,
        status: statusFilter || undefined,
        disputeType: typeFilter || undefined,
        search: searchQuery || undefined,
        sortDirection,
      });

      if (requestId !== latestRequest.current) return;

      const content = response.content;
      if (Array.isArray(content)) {
        // Compatibility with deployments where PagedList is still serialized as a bare array.
        setDisputes(content);
        setTotalItems(content.length);
        return;
      }

      setDisputes(content?.items ?? []);
      setTotalItems(content?.totalCount ?? 0);
      if (content?.page && content.page !== currentPage) {
        skipNextAutoFetch.current = true;
        setCurrentPage(content.page);
      }
    } catch {
      if (requestId !== latestRequest.current) return;
      setDisputes([]);
      setTotalItems(0);
      setHasError(true);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, sortDirection, statusFilter, typeFilter]);

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
  }, [fetchDisputes, reloadKey]);

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

  const openDispute = useCallback(
    (dispute: DisputeListResponse) => onOpenDispute(dispute),
    [onOpenDispute],
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

  const columns = useMemo<ColumnsType<DisputeListResponse>>(
    () => [
      {
        title: 'Hồ sơ',
        key: 'case',
        width: 128,
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
        width: 320,
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
        title: 'Gia sư',
        key: 'tutor',
        width: 180,
        responsive: ['md'],
        render: (_, dispute) => (
          <div className={styles.tutorCell}>
            <span className={styles.primaryText}>{dispute.tutorName || 'Chưa cập nhật'}</span>
            <span className={styles.secondaryText}>Gia sư phụ trách</span>
          </div>
        ),
      },
      {
        title: 'Buổi học',
        key: 'lesson',
        width: 165,
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
        titleInfo={infoText}
        maxWidth="wide"
        headerAction={
          <div className={styles.headerActions}>
            <Button
              className={styles.refreshButton}
              icon={<RefreshCw size={15} />}
              onClick={() => void fetchDisputes()}
              loading={loading}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              className={styles.createButton}
              icon={<Plus size={16} />}
              onClick={onCreate}
              data-tour="disputes-create-btn"
            >
              Tạo khiếu nại
            </Button>
          </div>
        }
      >
        <SectionCard className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeading}>
              <p className={styles.cardSubtitle} aria-live="polite">
                {loading ? 'Đang cập nhật dữ liệu...' : `${totalItems.toLocaleString('vi-VN')} hồ sơ`}
              </p>
            </div>

            <div className={styles.toolbar}>
              <Input
                className={styles.searchInput}
                aria-label="Tìm kiếm khiếu nại"
                placeholder="Tìm mã, booking, gia sư, nội dung..."
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
            dataSource={disputes}
            rowKey="disputeId"
            loading={loading}
            size="middle"
            scroll={{ x: 'max-content' }}
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
                            : 'Khi bạn gửi khiếu nại từ một buổi học, hồ sơ sẽ xuất hiện tại đây.'}
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
            pagination={{
              current: currentPage,
              pageSize,
              total: totalItems,
              showSizeChanger: totalItems > 10,
              pageSizeOptions: ['10', '20', '50'],
              showLessItems: true,
              showTotal: (total, range) => `Hiển thị ${range[0]}–${range[1]} trong ${total} hồ sơ`,
              onChange: (page, nextPageSize) => {
                if (nextPageSize !== pageSize) {
                  setPageSize(nextPageSize);
                  setCurrentPage(1);
                  return;
                }
                setCurrentPage(page);
              },
            }}
            onRow={(dispute) => ({
              className: styles.clickableRow,
              onClick: () => openDispute(dispute),
            })}
          />
        </SectionCard>
      </PageContainer>
    </ConfigProvider>
  );
};

export default ClaimantDisputesPage;
