// DTOs for mockOtp module

export interface SendOTPDto {
    phoneNumber: string;
    purpose: 'register' | 'login';
}
