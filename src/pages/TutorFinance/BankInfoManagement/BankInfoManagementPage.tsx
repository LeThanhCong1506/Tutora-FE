import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { CheckCircleFilled, InfoCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { getBankInfo, deleteBankInfo } from '../../../services/tutorFinance.service';
import type { BankInfo } from '../../../types/finance.types';
import FinancePageShell from '../components/FinancePageShell';
import BankInfoCard from './components/BankInfoCard';
import BankInfoForm from './components/BankInfoForm';
import '../../../styles/pages/tutor-finance.css';

const BankInfoManagementPage: React.FC = () => {
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const info = await getBankInfo();
      setBankInfo(info);
    } catch (error) {
      console.error('Failed to fetch bank info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBankInfo();
      toast.success('Đã xoá tài khoản ngân hàng.');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete bank info:', error);
      toast.error('Không thể xoá tài khoản ngân hàng. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FinancePageShell
      title="Tài khoản ngân hàng"
      subtitle="Quản lý tài khoản nhận tiền khi yêu cầu rút thu nhập từ TUTORA."
    >
      <div className="finance-bank-layout">
        <BankInfoCard
          bankInfo={bankInfo}
          loading={loading}
          deleting={deleting}
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={handleDelete}
        />

        <aside className="finance-surface finance-policy-card">
          <div className="finance-policy-card__header">
            <span className="finance-policy-card__icon" aria-hidden="true">
              <InfoCircleOutlined />
            </span>
            <div>
              <h2>Chính sách thanh toán</h2>
              <p>Những điều cần biết trước khi rút tiền</p>
            </div>
          </div>

          <ul className="finance-policy-list">
            <li>
              <CheckCircleFilled aria-hidden="true" />
              <span>Tiền được chuyển vào đúng tài khoản bạn đăng ký tại trang này.</span>
            </li>
            <li>
              <CheckCircleFilled aria-hidden="true" />
              <span>Yêu cầu được admin/staff xét duyệt và chuyển khoản trong vòng 24 giờ.</span>
            </li>
            <li>
              <CheckCircleFilled aria-hidden="true" />
              <span>Số tiền rút tối thiểu là 10,000 VND cho mỗi giao dịch.</span>
            </li>
            <li>
              <CheckCircleFilled aria-hidden="true" />
              <span>Mỗi thời điểm chỉ có một yêu cầu rút tiền đang được xử lý.</span>
            </li>
          </ul>

          <div className="finance-security-note">
            <SafetyCertificateOutlined aria-hidden="true" />
            <div>
              <strong>Kiểm tra kỹ trước khi lưu</strong>
              <span>Thông tin sai có thể khiến giao dịch bị chậm hoặc chuyển nhầm tài khoản.</span>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        className="finance-modal"
        title={bankInfo?.bankName ? 'Cập nhật tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={620}
      >
        <BankInfoForm bankInfo={bankInfo} onSuccess={handleUpdateSuccess} onCancel={() => setIsEditModalOpen(false)} />
      </Modal>
    </FinancePageShell>
  );
};

export default BankInfoManagementPage;
