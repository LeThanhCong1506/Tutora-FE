import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Spin, Steps, Timeline } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import { getWithdrawalDetail, type WithdrawalDetail } from '../../services/wallet.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import FinanceShell from './components/FinanceShell';
import WithdrawalStatusBadge from '../../components/Finance/WithdrawalStatusBadge';
import '../../styles/pages/tutor-finance.css';
import ProofImageField from '../../components/Finance/ProofImageField';
import { getApiErrorMessage } from '../../utils/apiError';

const WithdrawalDetailPage = () => {
  const { id: idString } = useParams<{ id: string }>();
  const id = idString ? Number.parseInt(idString, 10) : 0;
  const navigate = useNavigate();
  const location = useLocation();
  const portalBase = useMemo(
    () => (location.pathname.startsWith('/student-portal') ? '/student-portal' : '/parent-portal'),
    [location.pathname],
  );

  const [loading, setLoading] = useState(true);
  const [withdrawal, setWithdrawal] = useState<WithdrawalDetail | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getWithdrawalDetail(id);
      setWithdrawal(res.content);
    } catch (error) {
      console.error('Failed to fetch withdrawal detail:', error);
      toast.error(getApiErrorMessage(error, 'Không thể tải thông tin chi tiết yêu cầu rút tiền'));
      navigate(`${portalBase}/wallet/withdrawals`);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, portalBase]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const status = (withdrawal?.status || '').toLowerCase();
  const isCompleted = status === 'completed';
  const isProcessing = ['approved', 'processing'].includes(status);
  const isRejected = status === 'rejected';
  const isCancelled = status === 'cancelled';
  const isPendingReview = ['pending', 'pending_review', 'delayed'].includes(status);
  const currentStep = isCompleted ? 2 : isProcessing ? 1 : 0;
  const stepsStatus: 'error' | 'finish' | 'process' =
    isRejected || isCancelled ? 'error' : isCompleted ? 'finish' : 'process';

  const historyItems = withdrawal
    ? [
        {
          color: '#3d4a3e',
          children: (
            <div className="finance-timeline-entry">
              <time>{formatDateTime(withdrawal.requestedAt)}</time>
              <strong>Đã tạo yêu cầu</strong>
              <p>Số tiền được tạm trừ khỏi số dư khả dụng.</p>
            </div>
          ),
        },
        ...(isProcessing
          ? [
              {
                color: '#d4b483',
                children: (
                  <div className="finance-timeline-entry">
                    <time>{withdrawal.claimedAt ? formatDateTime(withdrawal.claimedAt) : 'Đang xử lý'}</time>
                    <strong>Đã có nhân viên nhận xử lý</strong>
                    <p>Nhân viên đang kiểm tra và thực hiện chuyển khoản ngân hàng.</p>
                  </div>
                ),
              },
            ]
          : []),
        ...(isCompleted || isRejected || isCancelled
          ? [
              {
                color: isCompleted ? '#3d4a3e' : '#8b4545',
                children: (
                  <div className="finance-timeline-entry">
                    <time>{withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : 'Đã cập nhật'}</time>
                    <strong>
                      {isCompleted ? 'Chuyển khoản thành công' : isRejected ? 'Yêu cầu bị từ chối' : 'Yêu cầu đã hủy'}
                    </strong>
                    <p>
                      {isCompleted
                        ? 'Admin/staff đã xác nhận hoàn tất chuyển khoản.'
                        : 'Số tiền đã được hoàn lại vào số dư khả dụng.'}
                    </p>
                  </div>
                ),
              },
            ]
          : []),
      ]
    : [];

  return (
    <FinanceShell
      title={id ? `Yêu cầu rút tiền #${id}` : 'Chi tiết yêu cầu rút tiền'}
      subtitle="Kiểm tra tiến độ xử lý, thông tin giao dịch và tài khoản nhận tiền."
      backLink={{ label: 'Về lịch sử rút tiền', to: `${portalBase}/wallet/withdrawals` }}
      actions={
        <>
          {withdrawal && <WithdrawalStatusBadge status={withdrawal.status} />}
          <Button icon={<SyncOutlined />} onClick={fetchDetail} loading={loading}>
            Làm mới
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="finance-surface finance-detail-loading">
          <Spin size="large" />
          <span>Đang tải thông tin yêu cầu...</span>
        </div>
      ) : !withdrawal ? (
        <div className="finance-surface finance-detail-loading">
          <Empty description="Không tìm thấy yêu cầu rút tiền" />
        </div>
      ) : (
        <div className="finance-detail-grid">
          <div className="finance-detail-main">
            <section className="finance-surface finance-status-card">
              <div className="finance-panel-heading">
                <div>
                  <span className="finance-panel-heading__icon" aria-hidden="true">
                    <SafetyCertificateOutlined />
                  </span>
                  <div>
                    <h2>Trạng thái xử lý</h2>
                    <p>Theo dõi yêu cầu qua từng giai đoạn</p>
                  </div>
                </div>
              </div>

              <div className="finance-status-steps">
                <Steps
                  current={currentStep}
                  status={stepsStatus}
                  responsive
                  items={[
                    { title: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
                    { title: 'Chuyển tiền', icon: <SyncOutlined spin={isProcessing} /> },
                    { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
                  ]}
                />
              </div>

              {isPendingReview && (
                <Alert
                  type="info"
                  showIcon
                  message="Đang chờ xét duyệt"
                  description="Admin/staff đang kiểm tra yêu cầu và dự kiến chuyển khoản trong vòng 24 giờ. Số tiền đã được tạm trừ khỏi số dư khả dụng."
                  className="finance-status-alert"
                />
              )}
              {isProcessing && (
                <Alert
                  type="info"
                  showIcon
                  message="Đang chuyển tiền"
                  description="Một nhân viên đã nhận yêu cầu và đang thực hiện chuyển tiền vào tài khoản ngân hàng."
                  className="finance-status-alert"
                />
              )}
              {isCompleted && (
                <Alert
                  type="success"
                  showIcon
                  message="Đã chuyển tiền thành công"
                  description="Giao dịch đã hoàn tất. Vui lòng kiểm tra biến động số dư trong tài khoản ngân hàng."
                  className="finance-status-alert"
                />
              )}
              {isRejected && (
                <Alert
                  type="error"
                  showIcon
                  message="Yêu cầu bị từ chối"
                  description={`${withdrawal.rejectionReason || 'Yêu cầu không đáp ứng điều kiện xử lý.'} Số tiền đã được hoàn vào số dư khả dụng.`}
                  className="finance-status-alert"
                />
              )}
              {isCancelled && (
                <Alert
                  type="warning"
                  showIcon
                  message="Yêu cầu đã hủy"
                  description="Yêu cầu không còn hiệu lực và số tiền đã được hoàn vào số dư khả dụng."
                  className="finance-status-alert"
                />
              )}
            </section>

            <section className="finance-surface finance-transaction-detail-card">
              <div className="finance-panel-heading">
                <div>
                  <span className="finance-panel-heading__icon finance-panel-heading__icon--gold" aria-hidden="true">
                    <WalletOutlined />
                  </span>
                  <div>
                    <h2>Thông tin giao dịch</h2>
                    <p>Chi tiết số tiền và thời điểm xử lý</p>
                  </div>
                </div>
              </div>

              <div className="finance-detail-amount">
                <span>Số tiền rút</span>
                <strong>{formatCurrency(withdrawal.amount)}</strong>
                <small>Phí giao dịch: Miễn phí</small>
              </div>

              <dl className="finance-detail-list">
                <div>
                  <dt>Thời gian yêu cầu</dt>
                  <dd>{formatDateTime(withdrawal.requestedAt)}</dd>
                </div>
                <div>
                  <dt>Thời gian xử lý</dt>
                  <dd>{withdrawal.processedAt ? formatDateTime(withdrawal.processedAt) : 'Chưa xử lý'}</dd>
                </div>
                <div>
                  <dt>Mã yêu cầu</dt>
                  <dd>#{withdrawal.withdrawalId}</dd>
                </div>
                {withdrawal.transactionId && (
                  <div>
                    <dt>Mã tham chiếu thanh toán</dt>
                    <dd>{withdrawal.transactionId}</dd>
                  </div>
                )}
                {withdrawal.paidAt && (
                  <div>
                    <dt>Thời gian chuyển khoản</dt>
                    <dd>{formatDateTime(withdrawal.paidAt)}</dd>
                  </div>
                )}
                {withdrawal.completionNote && (
                  <div>
                    <dt>Ghi chú đối soát</dt>
                    <dd>{withdrawal.completionNote}</dd>
                  </div>
                )}
                {withdrawal.rejectionReason && (
                  <div>
                    <dt>Lý do từ chối</dt>
                    <dd>{withdrawal.rejectionReason}</dd>
                  </div>
                )}
                <ProofImageField proofImageUrl={withdrawal.proofImageUrl} />
              </dl>
            </section>
          </div>

          <aside className="finance-detail-sidebar">
            <section className="finance-surface finance-detail-bank-card">
              <div className="finance-panel-heading">
                <div>
                  <span className="finance-panel-heading__icon" aria-hidden="true">
                    <BankOutlined />
                  </span>
                  <div>
                    <h2>Tài khoản nhận tiền</h2>
                    <p>Thông tin tại thời điểm tạo yêu cầu</p>
                  </div>
                </div>
              </div>

              <dl className="finance-detail-list finance-detail-list--stacked">
                <div>
                  <dt>Ngân hàng</dt>
                  <dd>{withdrawal.bankName || '—'}</dd>
                </div>
                <div>
                  <dt>Số tài khoản</dt>
                  <dd>{withdrawal.accountNumber || '—'}</dd>
                </div>
                <div>
                  <dt>Chủ tài khoản</dt>
                  <dd>{withdrawal.accountHolderName || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="finance-surface finance-timeline-card">
              <div className="finance-panel-heading">
                <div>
                  <span className="finance-panel-heading__icon finance-panel-heading__icon--gold" aria-hidden="true">
                    <HistoryOutlined />
                  </span>
                  <div>
                    <h2>Lịch sử thay đổi</h2>
                    <p>Các mốc cập nhật của yêu cầu</p>
                  </div>
                </div>
              </div>
              <Timeline items={historyItems} />
            </section>
          </aside>
        </div>
      )}
    </FinanceShell>
  );
};

export default WithdrawalDetailPage;
