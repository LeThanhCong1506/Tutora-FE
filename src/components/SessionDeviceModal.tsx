import { Modal } from 'antd';

interface SessionDeviceModalProps {
  open: boolean;
  mode: 'conflict' | 'replaced';
  activeDeviceLabel?: string | null;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Modal dùng chung cho hai phía của luồng chuyển thiết bị:
 * - conflict: thiết bị mới xin xác nhận takeover;
 * - replaced: thiết bị cũ đã bị thu hồi lease và chỉ được quay về lịch học.
 */
const SessionDeviceModal = ({
  open,
  mode,
  activeDeviceLabel,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: SessionDeviceModalProps) => {
  const wasReplaced = mode === 'replaced';
  const deviceText = activeDeviceLabel?.trim() || 'một thiết bị khác';

  return (
    <Modal
      open={open}
      title={wasReplaced ? 'Buổi học đã được chuyển sang thiết bị khác' : 'Bạn đang tham gia trên thiết bị khác'}
      okText={wasReplaced ? 'Về lịch học' : 'Chuyển sang thiết bị này'}
      cancelText="Tiếp tục trên thiết bị cũ"
      onOk={onConfirm}
      onCancel={wasReplaced || confirmLoading ? undefined : onCancel}
      confirmLoading={confirmLoading}
      closable={!wasReplaced && !confirmLoading}
      maskClosable={!wasReplaced && !confirmLoading}
      keyboard={!wasReplaced && !confirmLoading}
      cancelButtonProps={wasReplaced ? { style: { display: 'none' } } : { disabled: confirmLoading }}
      centered
      zIndex={3000}
    >
      <p style={{ margin: 0 }}>
        {wasReplaced
          ? 'Phiên trên thiết bị này đã được ngắt. Bạn có thể tiếp tục buổi học trên thiết bị mới.'
          : `Tài khoản của bạn đang ở trong buổi học này trên ${deviceText}. Bạn có muốn chuyển sang thiết bị hiện tại không? Thiết bị trước sẽ bị ngắt kết nối.`}
      </p>
    </Modal>
  );
};

export default SessionDeviceModal;
