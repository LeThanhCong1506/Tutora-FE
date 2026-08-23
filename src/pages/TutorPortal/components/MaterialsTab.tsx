import React, { useEffect, useState } from 'react';
import { Upload, Button, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined, FilePdfOutlined, FileWordOutlined, FileImageOutlined, FilePptOutlined, FileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getMaterials, uploadMaterial, deleteMaterial, type LearningMaterialResponse } from '../../../services/materials.service';
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

const MaterialsTab: React.FC<MaterialsTabProps> = ({ bookingId }) => {
    const [materials, setMaterials] = useState<LearningMaterialResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            setMaterials([]);
            setLoading(false);
            return;
        }
        fetchMaterials(bookingId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId]);

    const fetchMaterials = async (id: number) => {
        try {
            setLoading(true);
            const response = await getMaterials(id);
            setMaterials(Array.isArray(response.content) ? response.content : []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể tải danh sách tài liệu.'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!bookingId) return false;
        setUploading(true);
        try {
            const title = file.name.replace(/\.[^/.]+$/, '');
            const response = await uploadMaterial(bookingId, file, title);
            setMaterials((prev) => [response.content, ...prev]);
            toast.success(`Tải lên ${file.name} thành công!`);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, `Tải lên ${file.name} thất bại.`));
        } finally {
            setUploading(false);
        }
        return false;
    };

    const handleRemove = async (materialId: number) => {
        if (!bookingId) return;
        try {
            await deleteMaterial(bookingId, materialId);
            setMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể xoá tài liệu.'));
        }
    };

    return (
        <div>
            <div className={`${styles.toolbar} ${styles.toolbarCenter}`}>
                <div>
                    <h3 className={styles.heading}>Tài liệu</h3>
                </div>
                <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" multiple>
                    <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={uploading}
                        disabled={!bookingId}
                        style={{ background: '#1a2238', borderColor: '#1a2238' }}
                    >
                        Tải tài liệu lên
                    </Button>
                </Upload>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Đang tải tài liệu...</div>
            ) : materials.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📁</div>
                    <h4>Chưa có tài liệu nào</h4>
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
                            <Popconfirm
                                title="Xóa tài liệu này?"
                                description={`"${m.title}" sẽ bị xóa khỏi lớp học và không thể khôi phục.`}
                                onConfirm={() => handleRemove(m.materialId)}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MaterialsTab;
