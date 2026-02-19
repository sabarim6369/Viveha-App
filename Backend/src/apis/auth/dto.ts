// DTOs for auth module

export interface RegisterDto {
    phoneNumber: string;
    otp: string;
    ownerName: string;
    businessName: string;
    deviceId?: string;
    shopName?: string;
    location?: string;
    city?: string;
    state?: string;
    gstin?: string;
    profileUrl?: string;
}

export interface LoginDto {
    phoneNumber: string;
    otp: string;
    deviceId?: string;
}

export interface LogoutDto {
    deviceSessionId?: string;
}
