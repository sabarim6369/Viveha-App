// DTOs for otp module

export interface SendOTPDto {
    phoneNumber: string;
    purpose: 'register' | 'login';
}
