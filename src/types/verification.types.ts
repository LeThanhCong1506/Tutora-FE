// Types for eKYC / CCCD Verification

// eKYC extracted data (from backend ekycRawData JSON string)
export interface EKYCContent {
    id: string;           // CCCD number
    name: string;         // Full name from CCCD
    dob: string;          // Date of birth (DD/MM/YYYY format)
    home: string;         // Hometown/Place of origin
    address: string;      // Address from CCCD
    type_new: string;     // Card type (e.g., "cccd_chip_front")
    sex: string;          // Gender ("NAM" | "NỮ")
    id_prob: string;      // Confidence probability (e.g., "99.32")
}

// Backend API expects PascalCase field names
export interface VerificationRequest {
    FrontImgPath: string; // Full signed URL with token
    BackImgPath: string;  // Full signed URL with token
}

export interface VerificationResponse {
    success: boolean;
    message?: string;
    verificationId?: string;
    status?: 'pending' | 'approved' | 'rejected';
    content?: EKYCContent;
}

export interface UploadResult {
    path: string;
    publicUrl?: string;
    error?: string;
}

export interface IdCardUploadState {
    frontImage: File | null;
    backImage: File | null;
    frontPath: string | null; // Now stores signed URL
    backPath: string | null; // Now stores signed URL
    frontPreview: string | null;
    backPreview: string | null;
    isUploading: boolean;
    uploadProgress: number;
}

// User data from /api/users/{id} with eKYC fields
export interface UserWithEKYC {
    userid: string;
    username: string | null;
    email: string;
    fullname: string;
    phone: string;
    identityNumber: string | null;
    idcardfronturl: string | null;  // Signed URL
    idcardbackurl: string | null;   // Signed URL
    isidentityverified: boolean;    // lowercase (preferred)
    IsIdentityVerified?: boolean;   // PascalCase (C# backend)
    isIdentityVerified?: boolean;   // camelCase (alternative)
    birthdate: string | null;       // ISO format
    address: string | null;
    gender: string | null;
    avatarurl: string | null;
    status: number;
    createdat: string;
    role: string;
    ekycRawData: string | null;     // JSON string, needs parsing
}
