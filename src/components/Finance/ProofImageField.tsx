import React, { useState } from 'react';
import { useProtectedImage } from '../../hooks/useProtectedImage';
import { ImageLightbox } from '../shared';

interface ProofImageFieldProps {
  /** Signed URL của ảnh biên lai (endpoint file private). Không có thì không render gì. */
  proofImageUrl: string | null | undefined;
}

/**
 * Ô "Biên lai chuyển khoản" trong bảng chi tiết yêu cầu rút tiền.
 *
 * Ảnh nằm sau `/api/files/private` — endpoint có `[Authorize]`, mà thẻ `<img>` của trình duyệt
 * KHÔNG gửi được header Authorization nên gán thẳng signed URL vào `src` sẽ luôn nhận 401 và
 * ảnh vỡ. Vì vậy phải tải bằng JS rồi hiển thị qua blob URL.
 *
 * Bấm vào ảnh mở lightbox ngay tại trang thay vì sang tab mới: giữ được ngữ cảnh đang đối chiếu,
 * và tab mới vốn cũng không mở được ảnh private (điều hướng không mang theo token).
 *
 * Gom thành component riêng vì khối này lặp ở nhiều màn hình — trước đây các nơi đều sao chép
 * cùng một lỗi.
 */
const ProofImageField: React.FC<ProofImageFieldProps> = ({ proofImageUrl }) => {
  const { objectUrl, failed } = useProtectedImage(proofImageUrl);
  const [zoomed, setZoomed] = useState(false);

  if (!proofImageUrl) return null;

  return (
    <div className="finance-proof-image-container">
      <dt>Biên lai chuyển khoản</dt>
      <dd>
        {failed ? (
          <p className="finance-proof-image-note">Không tải được ảnh. Vui lòng thử lại.</p>
        ) : !objectUrl ? (
          <p className="finance-proof-image-note">Đang tải ảnh…</p>
        ) : (
          <>
            <button
              type="button"
              className="finance-proof-image-link"
              onClick={() => setZoomed(true)}
              aria-label="Phóng to biên lai chuyển khoản"
            >
              <img src={objectUrl} alt="Biên lai chuyển khoản" className="finance-proof-image" />
            </button>
            <button type="button" className="finance-proof-image-btn" onClick={() => setZoomed(true)}>
              Xem ảnh đầy đủ →
            </button>
          </>
        )}
      </dd>

      <ImageLightbox
        imageUrl={zoomed ? objectUrl : null}
        title="Biên lai chuyển khoản"
        onClose={() => setZoomed(false)}
      />
    </div>
  );
};

export default ProofImageField;
