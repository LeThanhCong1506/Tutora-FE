import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, Steps, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { WalletOutlined, SafetyCertificateOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getFinanceSummary, getBankInfo, createWithdrawal } from '../../../services/tutorFinance.service';
import type { FinanceSummary, BankInfo } from '../../../types/finance.types';
import WithdrawForm from './components/WithdrawForm';
import WithdrawConfirmModal from './components/WithdrawConfirmModal';
import WithdrawResultCard from './components/WithdrawResultCard';
import '../../../styles/pages/tutor-finance.css';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

const CreateWithdrawalPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);

    const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [resultStatus, setResultStatus] = useState<'success' | 'error' | 'warning' | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sum, info] = await Promise.all([
                    getFinanceSummary(),
                    getBankInfo()
                ]);
                setSummary(sum);
                setBankInfo(info);

                if (!info || !info.isVerified) {
                    toast.warn('Bạn cần xác thực tài khoản ngân hàng trước khi rút tiền', { toastId: 'bank-verify-required' });
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
        setIsConfirmModalOpen(true);
    };

    const handleConfirmWithdraw = async () => {
        setSubmitting(true);
        try {
            await createWithdrawal({ amount: withdrawAmount });
            setIsConfirmModalOpen(false);
            setResultStatus('success');
            setCurrentStep(2);
        } catch (error: any) {
            console.error('Withdrawal failed:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thực hiện rút tiền');
            setResultStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="tutor-finance-container">
            <div className="finance-header">
                <Breadcrumb
                    items={[
                        { title: <a onClick={() => navigate('/tutor-portal/finance')}>Tài chính</a> },
                        { title: 'Rút tiền' },
                    ]}
                    style={{ marginBottom: '16px' }}
                />
                <Title level={2}>Rút tiền về tài khoản</Title>
                <Text type="secondary">Chuyển tiền từ số dư khả dụng về tài khoản ngân hàng của bạn</Text>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <Steps
                    current={currentStep}
                    items={[
                        { title: 'Nhập số tiền', icon: <WalletOutlined /> },
                        { title: 'Xác nhận', icon: <SafetyCertificateOutlined /> },
                        { title: 'Hoàn tất', icon: <CheckCircleOutlined /> },
                    ]}
                    style={{ marginBottom: '32px' }}
                />

                {currentStep === 0 && (
                    <WithdrawForm
                        balance={summary?.balance || 0}
                        bankInfo={bankInfo}
                        loading={loading}
                        onSubmit={handleSubmitForm}
                    />
                )}

                {currentStep === 2 && resultStatus && (
                    <WithdrawResultCard
                        status={resultStatus}
                        amount={withdrawAmount}
                        onClose={() => navigate('/tutor-portal/finance')}
                    />
                )}
            </div>

            <WithdrawConfirmModal
                open={isConfirmModalOpen}
                amount={withdrawAmount}
                bankInfo={bankInfo}
                loading={submitting}
                onConfirm={handleConfirmWithdraw}
                onCancel={() => setIsConfirmModalOpen(false)}
            />

            {currentStep === 0 && (
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/tutor-portal/finance')}>
                        Quay lại Tổng quan
                    </Button>
                </div>
            )}
        </div>
    );
};

export default CreateWithdrawalPage;
