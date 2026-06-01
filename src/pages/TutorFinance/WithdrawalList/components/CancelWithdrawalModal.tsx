import { Modal, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../../utils/formatters';

const { Text, Paragraph } = Typography;

interface Props {
    open: boolean;
    withdrawalId: string;
    amount: number;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

const CancelWithdrawalModal: React.FC<Props> = ({ open, withdrawalId, amount, onConfirm, onCancel, loading }) => {
    return (
        <Modal
            title="Hủy yêu cầu rút tiền"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Xác nhận hủy"
            cancelText="Đóng"
            okButtonProps={{ danger: true }}
        >
            <div style={{ marginTop: '16px' }}>
                <Paragraph>
                    Bạn có chắc chắn muốn hủy yêu cầu rút tiền <Text strong>#{withdrawalId}</Text> trị giá <Text strong color="error">{formatCurrency(amount)}</Text>?
                </Paragraph>
                <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message="Lưu ý"
                    description="Sau khi hủy, số tiền sẽ được hoàn lại vào số dư khả dụng của bạn ngay lập tức. Hành động này không thể hoàn tác."
                />
            </div>
        </Modal>
    );
};

export default CancelWithdrawalModal;
