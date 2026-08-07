import React, { useState } from 'react';
import { Download, Paperclip } from 'lucide-react';
import { Image } from 'antd';
import { getAttachmentDisplayName, getAttachmentKind } from './attachmentKind';
import styles from './AttachmentGallery.module.css';

export interface AttachmentItem {
    /** Khoá React; mặc định dùng chính url. */
    key?: string;
    url: string;
    /** Ghi đè nhãn hiển thị (vd mô tả người upload nhập). Bỏ trống thì lấy tên file gốc. */
    label?: string | null;
    /** Content type nếu BE có lưu — chính xác hơn đoán theo đuôi file. */
    mimeType?: string | null;
}

export interface AttachmentGalleryProps {
    items: AttachmentItem[];
    /** Hiện khi không có tệp nào; bỏ trống thì component không render gì. */
    emptyText?: string;
    className?: string;
}

const FileRow = ({ href, label, note }: { href: string; label: string; note?: string }) => (
    <a className={styles.fileItem} href={href} target="_blank" rel="noopener noreferrer">
        <Paperclip size={14} className={styles.icon} aria-hidden="true" />
        <span className={styles.fileName}>
            {label}
            {note && <small> · {note}</small>}
        </span>
        <Download size={14} className={styles.icon} aria-hidden="true" />
    </a>
);

/** Ảnh xem phóng to tại chỗ, video phát tại chỗ, tài liệu mở tab mới. */
const AttachmentTile = ({ item }: { item: AttachmentItem }) => {
    const [failed, setFailed] = useState(false);
    const kind = getAttachmentKind(item.url, item.mimeType);
    const label = item.label || getAttachmentDisplayName(item.url);

    if (failed || kind === 'file') {
        return (
            <div className={styles.fileRow}>
                <FileRow href={item.url} label={label} note={failed ? 'không tải được, mở ở tab mới' : undefined} />
            </div>
        );
    }

    if (kind === 'video') {
        return (
            <figure className={styles.video}>
                <video src={item.url} controls preload="metadata" playsInline onError={() => setFailed(true)} />
                <figcaption className={styles.caption}>{label}</figcaption>
            </figure>
        );
    }

    return (
        <figure className={styles.image}>
            <Image
                src={item.url}
                alt={label}
                onError={() => setFailed(true)}
                // antd v6: nhãn hover là `cover` (`mask` giờ là cấu hình lớp nền của lightbox).
                preview={{ cover: 'Xem ảnh' }}
                rootClassName={styles.imageRoot}
            />
            <figcaption className={styles.caption}>{label}</figcaption>
        </figure>
    );
};

/**
 * Danh sách tệp đính kèm dùng chung cho mọi portal — cùng một cách hiển thị bằng chứng khiếu nại,
 * tài liệu báo cáo buổi học… để người dùng không phải học lại cách xem ở từng trang.
 */
const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({ items, emptyText, className }) => {
    const visible = items.filter((item) => Boolean(item.url));

    if (visible.length === 0) return emptyText ? <p className={styles.empty}>{emptyText}</p> : null;

    return (
        <Image.PreviewGroup>
            <div className={`${styles.grid} ${className || ''}`}>
                {visible.map((item) => (
                    <AttachmentTile key={item.key || item.url} item={item} />
                ))}
            </div>
        </Image.PreviewGroup>
    );
};

export default AttachmentGallery;
