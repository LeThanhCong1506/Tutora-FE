import React from 'react';
import { Modal, Descriptions, Typography, Alert, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../../utils/formatters';
import type { BankInfo } from '../../../../types/finance.types';

const { Text, Title } = Typography;

interface Props {
    open: boolean;
    amount: number;
    bankInfo: BankInfo | null;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

const WithdrawConfirmModal: React.FC<Props> = ({ open, amount, bankInfo, onConfirm, onCancel, loading }) => {
    return (
        <Modal
            title="Xác nhận yêu cầu rút tiền"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Xác nhận rút tiền"
            cancelText="Quay lại"
            width={500}
        >
            <div style={{ marginTop: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px', background: '#fafafa', padding: '20px', borderRadius: '8px' }}>
                    <Text type="secondary">Số tiền rút</Text>
                    <Title level={2} style={{ margin: '8px 0 0', color: '#1890ff' }}>{formatCurrency(amount)}</Title>
                </div>

                <Descriptions column={1} labelStyle={{ color: '#888' }}>
                    <Descriptions.Item label="Ngân hàng thụ hưởng">{bankInfo?.bankName}</Descriptions.Item>
                    <Descriptions.Item label="Số tài khoản">{bankInfo?.accountNumber}</Descriptions.Item>
                    <Descriptions.Item label="Chủ tài khoản">{bankInfo?.accountHolderName}</Descriptions.Item>
                    <Descriptions.Item label="Phí giao dịch">
                        <Text type="success">Miễn phí</Text>
                    </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '16px 0' }} />

                <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    message="Lưu ý quan trọng"
                    description="Tiền sẽ được chuyển vào tài khoản ngân hàng bạn đã đăng ký. Vui lòng kiểm tra kỹ thông tin trước khi xác nhận. Sau khi xác nhận, yêu cầu không thể chỉnh sửa."
                />
            </div>
        </Modal>
    );
};

export default WithdrawConfirmModal;
