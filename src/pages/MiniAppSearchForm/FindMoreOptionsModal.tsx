import { useState } from "react";
import { tr, type Lang } from "./i18n";

interface FindMoreOptionsModalProps {
    lang: Lang;
    loading: boolean;
    onRefineWithExtraCriteria: (extraCriteria: string) => void;
    onStartOver: () => void;
    onClose: () => void;
}

/**
 * Popup 2 lựa chọn khi PH bấm "Tìm gia sư khác" trên màn kết quả:
 * (1) Thêm 1 tiêu chí phụ (vd "nhiều kinh nghiệm hơn") — GIỮ NGUYÊN môn/lớp/tiêu chí đã có,
 *     chỉ bổ sung thêm, loại các gia sư đang hiện (giống handleFindMore cũ + preferences mới).
 * (2) Tiêu chí khác hẳn (môn khác/giá khác...) — quay lại ĐẦU wizard, xoá hết lựa chọn cũ,
 *     PH điền lại từ đầu (không phải "sửa", mà là tìm kiếm hoàn toàn mới).
 */
const FindMoreOptionsModal = ({
    lang,
    loading,
    onRefineWithExtraCriteria,
    onStartOver,
    onClose,
}: FindMoreOptionsModalProps) => {
    // null = đang ở màn chọn 1 trong 2 lựa chọn; "" hoặc text = đã chọn (1), đang nhập tiêu chí thêm.
    const [refining, setRefining] = useState(false);
    const [extraCriteria, setExtraCriteria] = useState("");

    const handleConfirmRefine = () => {
        onRefineWithExtraCriteria(extraCriteria.trim());
    };

    return (
        <div className="find-more-modal__overlay" onClick={onClose}>
            <div className="find-more-modal__sheet" onClick={(e) => e.stopPropagation()}>
                <div className="find-more-modal__handle" />

                {!refining ? (
                    <>
                        <h3 className="find-more-modal__title">{tr("Tìm gia sư khác thế nào ạ?", lang)}</h3>
                        <button
                            type="button"
                            className="find-more-modal__option"
                            onClick={() => setRefining(true)}
                        >
                            <span className="find-more-modal__option-title">
                                {tr("Thêm 1 tiêu chí nữa", lang)}
                            </span>
                            <span className="find-more-modal__option-desc">
                                {tr("Vẫn môn/lớp này, chỉ thêm yêu cầu (vd: nhiều kinh nghiệm hơn, giá rẻ hơn...).", lang)}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="find-more-modal__option"
                            onClick={onStartOver}
                        >
                            <span className="find-more-modal__option-title">
                                {tr("Tìm với tiêu chí khác hẳn", lang)}
                            </span>
                            <span className="find-more-modal__option-desc">
                                {tr("Đổi môn học, giá, hoặc nhu cầu khác — điền lại từ đầu.", lang)}
                            </span>
                        </button>
                        <button type="button" className="find-more-modal__cancel" onClick={onClose}>
                            {tr("Đóng", lang)}
                        </button>
                    </>
                ) : (
                    <>
                        <h3 className="find-more-modal__title">{tr("Anh/chị muốn thêm yêu cầu gì?", lang)}</h3>
                        <textarea
                            className="find-more-modal__textarea"
                            rows={3}
                            autoFocus
                            placeholder={tr("VD: gia sư nhiều kinh nghiệm hơn, giá rẻ hơn, gần nhà hơn...", lang)}
                            value={extraCriteria}
                            onChange={(e) => setExtraCriteria(e.target.value)}
                        />
                        <button
                            type="button"
                            className="find-more-modal__submit"
                            disabled={loading}
                            onClick={handleConfirmRefine}
                        >
                            {loading ? tr("Đang tìm...", lang) : tr("Tìm gia sư", lang)}
                        </button>
                        <button
                            type="button"
                            className="find-more-modal__cancel"
                            onClick={() => setRefining(false)}
                        >
                            {tr("Quay lại", lang)}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default FindMoreOptionsModal;
