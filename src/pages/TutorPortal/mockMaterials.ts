import dayjs from 'dayjs';

/**
 * Mock data cho tab "Tài liệu" — mirror đúng entity `Learningmaterial` bên BE
 * (`MV.DomainLayer/Entities/Learningmaterial.cs`, bảng `learning_materials`).
 * Entity đã tồn tại thật trong DB (EF Core đã wire, có migration) nhưng
 * CHƯA có controller/service nào dùng — chưa có endpoint để gọi thật.
 *
 * Field/type dưới đây khớp 1:1 với entity BE (PascalCase → camelCase):
 *   Materialid, Studentid?, Bookingid?, Uploadedby?, Ownertype, Title,
 *   Description?, Filetype?, Fileurl, Filesize?, Ispublic?, Createdat?
 */

export interface LearningMaterial {
    materialId: number;
    studentId?: string;
    bookingId?: number;
    uploadedBy?: string;
    ownerType: 'tutor' | 'admin' | string;
    title: string;
    description?: string;
    fileType?: string;
    fileUrl: string;
    fileSize?: number;
    isPublic?: boolean;
    createdAt?: string;
}

const now = dayjs();

export const MOCK_MATERIALS: LearningMaterial[] = [
    {
        materialId: 1,
        bookingId: 5001,
        uploadedBy: 'tutor-alex',
        ownerType: 'tutor',
        title: 'Chương 5 - Đạo hàm',
        description: 'Tài liệu lý thuyết và bài tập mẫu chương Đạo hàm.',
        fileType: 'pdf',
        fileUrl: 'https://mock-storage.example.com/materials/chuong-5-dao-ham.pdf',
        fileSize: 862208, // bytes
        isPublic: false,
        createdAt: now.subtract(6, 'day').toISOString(),
    },
    {
        materialId: 2,
        bookingId: 5001,
        uploadedBy: 'tutor-alex',
        ownerType: 'tutor',
        title: 'Slide ôn tập giữa kỳ',
        fileType: 'pptx',
        fileUrl: 'https://mock-storage.example.com/materials/slide-on-tap.pptx',
        fileSize: 2191360,
        isPublic: false,
        createdAt: now.subtract(2, 'day').toISOString(),
    },
    {
        materialId: 3,
        bookingId: 5002,
        uploadedBy: 'tutor-alex',
        ownerType: 'tutor',
        title: 'Bài giảng Định luật Newton',
        fileType: 'docx',
        fileUrl: 'https://mock-storage.example.com/materials/dinh-luat-newton.docx',
        fileSize: 364544,
        isPublic: false,
        createdAt: now.subtract(3, 'day').toISOString(),
    },
    {
        materialId: 4,
        bookingId: 5003,
        uploadedBy: 'tutor-alex',
        ownerType: 'tutor',
        title: 'Bảng tuần hoàn nguyên tố',
        fileType: 'png',
        fileUrl: 'https://mock-storage.example.com/materials/bang-tuan-hoan.png',
        fileSize: 524288,
        isPublic: true,
        createdAt: now.subtract(1, 'day').toISOString(),
    },
];
