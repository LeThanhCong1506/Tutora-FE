import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getParentDisputes, type DisputeListDto } from '../../services/parent-lesson.service';
import { Spin, Tag } from 'antd';
import { toast } from 'react-toastify';

const DISPUTE_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Đang mở', color: '#faad14' },
  investigating: { label: 'Đang xem xét', color: '#1890ff' },
  resolved: { label: 'Đã giải quyết', color: '#52c41a' },
  closed: { label: 'Đã đóng', color: '#999' },
};

const DISPUTE_TYPE: Record<string, string> = {
  no_show: 'Vắng mặt',
  quality: 'Chất lượng',
  payment: 'Thanh toán',
  other: 'Khác',
};

const ParentDisputes: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await getParentDisputes(currentPage, pageSize);
      const data = response.content;
      if (Array.isArray(data)) {
        setDisputes(data);
        setTotalItems(data.length);
      } else if (data?.items) {
        setDisputes(data.items);
        setTotalItems(data.totalCount || data.items.length);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a2238', marginBottom: '4px' }}>
          Khiếu nại của tôi
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>Theo dõi trạng thái các khiếu nại</p>
      </header>

      {/* Disputes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin size="large" />
        </div>
      ) : disputes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px', color: '#999',
          background: '#fff', borderRadius: '12px', border: '1px solid rgba(26,34,56,0.06)',
        }}>
          Bạn chưa có khiếu nại nào
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disputes.map((dispute) => {
            const statusInfo = DISPUTE_STATUS[dispute.status] || { label: dispute.status, color: '#999' };

            return (
              <div
                key={dispute.disputeId}
                style={{
                  background: '#fff', borderRadius: '12px', padding: '16px 20px',
                  border: '1px solid rgba(26,34,56,0.06)', cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a2238' }}>
                      Khiếu nại #{dispute.disputeId}
                    </span>
                    <Tag color={statusInfo.color} style={{ margin: 0, borderRadius: '6px' }}>
                      {statusInfo.label}
                    </Tag>
                  </div>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {dispute.disputeType && (DISPUTE_TYPE[dispute.disputeType] || dispute.disputeType)}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  {dispute.reason || 'Không có lý do'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#999' }}>
                  {dispute.createdAt && (
                    <span>Ngày tạo: {new Date(dispute.createdAt).toLocaleDateString('vi-VN')}</span>
                  )}
                  {dispute.bookingId && (
                    <span>Booking #{dispute.bookingId}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
          marginTop: '24px',
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e8e8e8',
              background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '13px', color: '#666' }}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e8e8e8',
              background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentDisputes;
