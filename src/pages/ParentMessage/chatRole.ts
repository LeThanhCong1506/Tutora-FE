import type { ChatChannel } from '../../services/chat.service';

// Nhãn vai trò của người còn lại trong kênh chat, dựa trên otherUserRole thật từ BE
// thay vì giả định cố định — học sinh tự đăng ký (không có phụ huynh liên kết) chỉ hiển thị "Học sinh".
export const getOtherUserRoleLabel = (channel: Pick<ChatChannel, 'otherUserRole' | 'isOtherUserParentManaged'>): string => {
  switch (channel.otherUserRole) {
    case 'Parent':
      return 'Phụ huynh';
    case 'Student':
      return channel.isOtherUserParentManaged ? 'Phụ huynh / Học sinh' : 'Học sinh';
    case 'Tutor':
    default:
      return 'Gia sư';
  }
};
