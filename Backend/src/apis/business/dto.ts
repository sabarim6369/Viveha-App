// DTOs for business module

export interface CreateItemGroupDto {
    clientId: string;
    name: string;
    description?: string;
}

export interface CreateItemDto {
    clientId: string;
    name: string;
    price: number;
    stock?: number;
    unit?: string;
    groupId?: string;
    description?: string;
}

export interface CreateClientCustomerDto {
    clientId: string;
    name: string;
    phone: string;
    address?: string;
    emailId?: string;
    gstNo?: string;
}

export interface CreateCartDto {
    clientId: string;
    clientCustomerPhone?: string;
}

export interface AddToCartDto {
    cartId: string;
    itemId: string;
    itemName: string;
    unitPrice: number;
    quantity: number;
}

export interface GenerateInvoiceDto {
    clientId: string;
    clientCustomerId?: string;
    cartId: string;
    totalAmount: number;
    paidAmount: number;
    notes?: string;
}

export interface RecordPaymentDto {
    clientId: string;
    invoiceId: string;
    amount: number;
    method?: string;
    note?: string;
}
