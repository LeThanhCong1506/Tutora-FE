import React, { useState } from 'react';
import { Upload, Button, Switch } from 'antd';
import { UploadOutlined, DeleteOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FilePptOutlined, FileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { MOCK_MATERIALS, type LearningMaterial } from '../mockMaterials';
import styles from '../../../styles/pages/tutor-portal-homework.module.css';

interface MaterialsTabProps {
    bookingId?: number;
}

const getFileIcon = (fileType?: string): React.ReactNode => {
    switch (fileType) {
        case 'pdf': return <FilePdfOutlined style={{ color: '#dc2626' }} />;
        case 'doc':
        case 'docx': return <FileWordOutlined style={{ color: '#2563eb' }} />;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif': return <FileImageOutlined style={{ color: '#16a34a' }} />;
        case 'ppt':
        case 'pptx': return <FilePptOutlined style={{ color: '#d97706' }} />;
        default: return <FileOutlined style={{ color: '#687083' }} />;
    }
};

const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

/**
 * TODO: entity `Learningmaterial` (bảng `learning_materials`) đã tồn tại thật
 * trong DB nhưng BE chưa có controller/service nào expose nó — chưa có
 * endpoint để gọi thật. Mock theo đúng field của entity, thay lại khi BE
 * bổ sung `LearningMaterialController` (list/upload/delete theo bookingId).
 */
const MaterialsTab: React.FC<MaterialsTabProps> = ({ bookingId }) => {
    const [materials, setMaterials] = useState<LearningMaterial[]>(() =>
        MOCK_MATERIALS.filter((m) => m.bookingId === bookingId),
    );
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setUploading(true);
        await new Promise((r) => setTimeout(r, 400));

        const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
        const newMaterial: LearningMaterial = {
            materialId: Date.now(),
            bookingId,
            ownerType: 'tutor',
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileType: ext,
            fileUrl: `https://mock-storage.example.com/materials/${encodeURIComponent(file.name)}`,
            fileSize: file.size,
            isPublic: false,
            createdAt: new Date().toISOString(),
        };
        setMaterials((prev) => [newMaterial, ...prev]);
        toast.success(`Tải lên ${file.name} thành công!`);
        setUploading(false);
        return false;
    };

    const handleRemove = (materialId: number) => {
        setMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
    };

    const handleTogglePublic = (materialId: number, isPublic: boolean) => {
        setMaterials((prev) => prev.map((m) => (m.materialId === materialId ? { ...m, isPublic } : m)));
    };

    return (
        <div>
            <div className={styles.toolbar}>
                <div>
                    <h3 className={styles.heading}>Tài liệu</h3>
                    <p className={styles.subheading}>Tài liệu học tập chia sẻ cho lớp</p>
                </div>
                <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" multiple>
                    <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={uploading}
                        style={{ background: '#1a2238', borderColor: '#1a2238' }}
                    >
                        Tải tài liệu lên
                    </Button>
                </Upload>
            </div>

            {materials.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📁</div>
                    <h4>Chưa có tài liệu nào</h4>
                    <p>Tải lên tài liệu học tập đầu tiên cho lớp này.</p>
                </div>
            ) : (
                <div className={styles.fileList}>
                    {materials.map((m) => (
                        <div key={m.materialId} className={styles.fileRow}>
                            <span className={styles.fileIcon}>{getFileIcon(m.fileType)}</span>
                            <div className={styles.fileInfo}>
                                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileName}>
                                    {m.title}
                                </a>
                                <span className={styles.fileMeta}>
                                    {formatSize(m.fileSize)} · Tải lên {m.createdAt ? dayjs(m.createdAt).format('DD/MM/YYYY') : '—'}
                                    {m.description ? ` · ${m.description}` : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Switch
                                    size="small"
                                    checked={!!m.isPublic}
                                    onChange={(checked) => handleTogglePublic(m.materialId, checked)}
                                    checkedChildren="Công khai"
                                    unCheckedChildren="Riêng tư"
                                />
                                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(m.materialId)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MaterialsTab;
