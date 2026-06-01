export interface UserProfileData {
    userid: string;
    email: string;
    fullname: string;
    phone?: string;
    birthdate?: string;
    address?: string;
    gender?: string;
    avatarurl?: string;
    role?: string;
    createdat?: string;
    lastloginat?: string;
    zabornotifyenabled?: boolean;
}

export interface EditForm {
    fullname: string;
    birthdate: string;
    address: string;
    gender: string;
}

export interface PasswordForm {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}
