import React, { useEffect, useState } from 'react';
import { Button, Steps } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { createWithdrawal, getFinanceSummary } from '../../../services/tutorFinance.service';
import { getBankAccount, type BankAccount } from '../../../services/bankAccount.service';
import type { FinanceSummary } from '../../../types/finance.types';
import FinancePageShell from '../components/FinancePageShell';
import WithdrawConfirmModal from './components/WithdrawConfirmModal';
import WithdrawForm from './components/WithdrawForm';
import WithdrawResultCard from './components/WithdrawResultCard';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';

const CreateWithdrawalPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [bankInfo, setBankInfo] = useState<BankAccount | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [resultStatus, setResultStatus] = useState<'success' | 'error' | 'warning' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sum, info] = await Promise.all([getFinanceSummary(), getBankAccount()]);
        setSummary(sum);
        setBankInfo(info);

        if (sum.hasActiveDispute) {
          toast.warn('Bạn đang có buổi học bị tranh chấp, vui lòng chờ xử lý xong trước khi tạo yêu cầu rút tiền', {
            toastId: 'active-dispute-blocked',
          });
          navigate('/tutor-portal/finance');
          return;
        }

        const hasBankInfo = Boolean(info?.bankName && info?.accountNumber && info?.accountHolderName);
        if (!hasBankInfo) {
          toast.warn('Bạn cần cập nhật tài khoản ngân hàng trước khi rút tiền', {
            toastId: 'bank-info-required',
          });
          navigate('/tutor-portal/finance/bank-info');
        }
      } catch (error) {
        console.error('Failed to prepare withdrawal:', error);
        toast.error('Không thể tải thông tin số dư hoặc ngân hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleSubmitForm = (amount: number) => {
    setWithdrawAmount(amount);
    setCurrentStep(1);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    setSubmitting(true);
    try {
      await createWithdrawal({ amount: withdrawAmount });
      setIsConfirmModalOpen(false);
      setResultStatus('success');
      setCurrentStep(2);
    } catch (error: unknown) {
      console.error('Withdrawal failed:', error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Có lỗi xảy ra khi thực hiện rút tiền';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setIsConfirmModalOpen(false);
    setCurrentStep(0);
  };

  return (
    <FinancePageShell
      title="Rút tiền về tài khoản"
      subtitle="Chuyển số dư khả dụng về tài khoản ngân hàng đã đăng ký."
      backLink={{ label: 'Về tổng quan tài chính', to: '/tutor-portal/finance' }}
      actions={
        <Button size="large" icon={<HistoryOutlined />} onClick={() => navigate('/tutor-portal/finance/withdrawals')}>
          Lịch sử rút tiền
        </Button>
      }
    >
      <div className={`finance-withdraw-flow${currentStep === 2 ? ' finance-withdraw-flow--complete' : ''}`}>
        <section className="finance-surface finance-withdraw-progress" aria-label="Tiến trình rút tiền">
          <Steps
            current={currentStep}
            responsive
            items={[
              { title: 'Nhập số tiền', icon: <WalletOutlined /> },
              { title: 'Xác nhận', icon: <SafetyCertificateOutlined /> },
              { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
            ]}
          />
        </section>

        {currentStep < 2 ? (
          <div className="finance-withdraw-layout">
            <WithdrawForm
              balance={summary?.availableBalance ?? 0}
              bankInfo={bankInfo}
              loading={loading}
              onSubmit={handleSubmitForm}
            />

            <aside className="finance-surface finance-withdraw-guide">
              <div className="finance-withdraw-guide__header">
                <span aria-hidden="true">
                  <ClockCircleOutlined />
                </span>
                <div>
                  <h2>Quy trình xử lý</h2>
                  <p>Dự kiến hoàn tất trong vòng 24 giờ</p>
                </div>
              </div>

              <ol className="finance-process-list">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Gửi yêu cầu</strong>
                    <p>Số tiền được tạm trừ khỏi số dư khả dụng.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Xét duyệt</strong>
                    <p>Admin/staff kiểm tra thông tin và số dư.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Chuyển khoản</strong>
                    <p>Tiền được chuyển vào tài khoản đã đăng ký.</p>
                  </div>
                </li>
              </ol>

              <div className="finance-withdraw-guide__summary">
                <div>
                  <span>Phí giao dịch</span>
                  <strong>Miễn phí</strong>
                </div>
                <div>
                  <span>Tài khoản nhận</span>
                  <strong>{bankInfo?.bankName || 'Chưa cập nhật'}</strong>
                </div>
              </div>

              <Button
                type="link"
                className="finance-text-action finance-withdraw-guide__link"
                icon={<BankOutlined />}
                onClick={() => navigate('/tutor-portal/finance/bank-info')}
              >
                Kiểm tra tài khoản ngân hàng
              </Button>
            </aside>
          </div>
        ) : (
          resultStatus && (
            <WithdrawResultCard
              status={resultStatus}
              amount={withdrawAmount}
              onClose={() => navigate('/tutor-portal/finance')}
            />
          )
        )}
      </div>

      <WithdrawConfirmModal
        open={isConfirmModalOpen}
        amount={withdrawAmount}
        bankInfo={bankInfo}
        loading={submitting}
        onConfirm={handleConfirmWithdraw}
        onCancel={handleCancelConfirm}
      />
    </FinancePageShell>
  );
};

export default CreateWithdrawalPage;
