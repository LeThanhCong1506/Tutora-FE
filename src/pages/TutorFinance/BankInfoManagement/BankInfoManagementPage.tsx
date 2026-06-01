import React, { useState, useEffect } from 'react';
import { Typography, Card, Modal, Space, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { InfoCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getBankInfo } from '../../../services/tutorFinance.service';
import { getVerificationStatus } from '../../../services/bankVerification.service';
import type { BankInfo, BankVerificationStatus } from '../../../types/finance.types';
import BankInfoCard from './components/BankInfoCard';
import BankVerifyFlow from './components/BankVerifyFlow';
import '../../../styles/pages/tutor-finance.css';

const { Title, Text, Paragraph } = Typography;

const BankInfoManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [verifyStatus, setVerifyStatus] = useState<BankVerificationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [info, status] = await Promise.all([
                getBankInfo(),
                getVerificationStatus()
            ]);
            setBankInfo(info);
            setVerifyStatus(status);
        } catch (error) {
            console.error('Failed to fetch bank info:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleVerificationSuccess = () => {
        setIsVerifyModalOpen(false);
        fetchData();
    };

    return (
        <div className="tutor-finance-container">
            <div className="finance-header">
                <div style={{ marginBottom: '16px' }}>
                    <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/tutor-portal/finance')}
                        style={{ padding: '4px 8px', marginLeft: '-8px', fontSize: '15px', color: '#4b5563', display: 'inline-flex', alignItems: 'center', fontWeight: 500 }}
                    >
                        Quay lại
                    </Button>
                </div>
                <Title level={2}>Tài khoản ngân hàng</Title>
                <Text type="secondary">Cài đặt tài khoản ngân hàng để nhận thu nhập từ TUTORA</Text>
            </div>

            <div style={{ maxWidth: '800px' }}>
                <BankInfoCard
                    bankInfo={bankInfo}
                    verifyStatus={verifyStatus}
                    loading={loading}
                    onVerify={() => setIsVerifyModalOpen(true)}
                    onUpdate={() => setIsVerifyModalOpen(true)}
                />

                <Card style={{ marginTop: '24px', background: '#f0f5ff', border: 'none' }}>
                    <Space align="start">
                        <InfoCircleOutlined style={{ color: '#1890ff', marginTop: '4px' }} />
                        <div>
                            <Title level={5} style={{ margin: 0, color: '#003a8c' }}>Chính sách thanh toán</Title>
                            <Paragraph style={{ margin: '8px 0 0', color: '#003a8c' }}>
                                <ul style={{ paddingLeft: '20px' }}>
                                    <li>Tiền sẽ được chuyển vào tài khoản đã được xác thực của bạn.</li>
                                    <li>Hổ trợ rút tiền 24/7 thông qua hệ thống PayOS.</li>
                                    <li>Mỗi giao dịch rút tiền tối thiểu là 100,000đ.</li>
                                    <li>Để đảm bảo an toàn, việc thay đổi thông tin ngân hàng sẽ cần xác thực lại từ đầu.</li>
                                </ul>
                            </Paragraph>
                        </div>
                    </Space>
                </Card>
            </div>

            <Modal
                title="Xác thực tài khoản ngân hàng"
                open={isVerifyModalOpen}
                onCancel={() => setIsVerifyModalOpen(false)}
                footer={null}
                destroyOnClose
                width={600}
            >
                <BankVerifyFlow
                    status={verifyStatus}
                    onSuccess={handleVerificationSuccess}
                    onCancel={() => setIsVerifyModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default BankInfoManagementPage;
