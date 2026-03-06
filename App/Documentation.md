# Viveha - Invoice Management Application

## Overview
Viveha is a mobile application built with React Native and Expo for managing invoices, bills, and business transactions. It provides features for shop owners to create invoices, track pending payments, manage contacts, and handle business operations efficiently.

## Technologies Used
- **React Native** - Mobile app framework
- **Expo** - Development platform
- **React Navigation** - Navigation library
- **Expo Linear Gradient** - Gradient UI components
- **Expo Image Picker** - Image selection and camera access
- **AsyncStorage** - Local data persistence
- **Ionicons & MaterialIcons** - Icon libraries

## Features
### User Onboarding
- Shop details registration
- Mobile number verification with OTP
- Profile picture upload with camera/gallery
- Terms and conditions agreement

### Home & Dashboard
- Balance overview with gradient card design
- Quick action links (Create Invoice, Pendings, Insights, Items)
- Recent transactions list
- Business information display

### Invoice Management
- Create new invoices with multiple items
- Add customer details
- Calculate taxes and discounts automatically
- Preview invoices before generation
- Professional invoice templates

### Pending Payments
- Track overdue payments
- Send payment reminders
- View recent purchases
- Action required notifications
- Delivery tracking

### Profile Management
- Business profile view
- Account settings access
- Linked accounts management
- Payment methods
- Help & support
- Logout functionality

## Project Structure
```
App/
├── App.js                          # Main app entry with navigation
├── package.json                    # Dependencies and scripts
├── app.json                        # Expo configuration
├── README.md                       # This file
├── assets/                         # Images and static resources
│   └── logo2.png
├── Components/
│   └── Footer.js                   # Reusable bottom navigation
└── Pages/
    ├── LogoScreen.js              # App splash/logo screen
    ├── NameScreen.js              # User detection (new/returning)
    ├── ShopDetailsScreen.js       # Shop registration form
    ├── MobileNumberScreen.js      # Phone number input
    ├── ConfirmationCodeScreen.js  # 4-digit confirmation code
    ├── TermsAgreementScreen.js    # Terms acceptance
    ├── ProfilePictureScreen.js    # Profile image upload
    ├── OTPVerificationScreen.js   # OTP verification
    ├── VerificationCodeScreen.js  # Verification code entry
    ├── SuccessScreen.js           # Registration success
    ├── HomeScreen.js              # Main dashboard
    ├── PendingsScreen.js          # Pending payments view
    ├── CreateInvoiceScreen.js     # Invoice creation
    ├── InvoicePreviewScreen.js    # Invoice preview
    └── ProfileScreen.js           # User profile & settings
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

### Setup Steps
1. **Clone the repository**
   ```bash
   cd C:\Users\User\Documents\Projects\Viveha\App
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install required Expo packages**
   ```bash
   npm install expo-image-picker
   npm install @react-native-async-storage/async-storage
   npm install expo-linear-gradient
   npm install @react-navigation/native
   npm install @react-navigation/native-stack
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Navigation Flow

### New User Flow
```
Logo → Name → ShopDetails → MobileNumber → ConfirmationCode → 
TermsAgreement → ProfilePicture → Success → Home
```

### Returning User Flow
```
Logo → Name → OTPVerification → VerificationCode → Home
```

### Main App Navigation
```
Home ⟷ Pendings ⟷ Profile
  ↓
AddInvoice → InvoicePreview
```

## Screen Details

### LogoScreen
- Displays app branding and logo
- Auto-navigates to Name screen

### NameScreen
- Checks if user is new or returning using AsyncStorage
- Routes to appropriate flow

### ShopDetailsScreen
- Collects business information
- Fields: Shop name, location, city, state, GSTIN (optional)
- State dropdown with Indian states
- Keyboard-avoiding scrollview for better UX

### MobileNumberScreen
- Phone number input with +91 prefix
- Auto-formats to 10 digits
- Validates before proceeding

### ConfirmationCodeScreen
- 4-digit code entry
- Auto-focus next input
- Backspace navigation support
- Resend code option

### TermsAgreementScreen
- Privacy policy and terms display
- Learn more links
- "I agree" confirmation button

### ProfilePictureScreen
- Camera or gallery selection
- Circular profile preview
- Optional skip option
- Image picker with permissions handling

### OTPVerificationScreen
- Gradient card design
- Phone number input for OTP
- Terms agreement notice
- Keyboard-avoiding scrollview

### VerificationCodeScreen
- 4-digit OTP entry
- Gradient UI design
- Auto-focus functionality
- Resend code option

### SuccessScreen
- Onboarding completion message
- Auto-navigation to Home

### HomeScreen
- Gradient header with business info
- Balance display with visibility toggle
- Quick action buttons
- Recent transactions list
- Bottom navigation footer

### PendingsScreen
- Overdue payments summary
- Deliveries today count
- Action required cards
- Recent purchases list
- Send reminder functionality
- Bottom navigation

### CreateInvoiceScreen
- Invoice details (number, date, due date)
- Business and customer information
- Multiple items with quantity, price, tax, discount
- Add new items dynamically
- Total calculations
- Preview and generate buttons

### InvoicePreviewScreen
- Full invoice display
- Print and share options
- Professional layout

### ProfileScreen
- Business profile card
- QR code access
- Menu items:
  - Insights
  - My Contacts
  - Notifications
  - Payment Methods
  - Linked Accounts
  - Help & Support
  - Rate us
  - Logout (with confirmation)

## Key Features Implementation

### Keyboard Handling
All input screens implement:
- `KeyboardAvoidingView` for iOS/Android compatibility
- `ScrollView` for content visibility
- `keyboardShouldPersistTaps="handled"` for better UX

### Image Upload
ProfilePictureScreen includes:
- Camera permission requests
- Gallery permission requests
- Image cropping (1:1 aspect ratio)
- Image quality optimization (0.8)

### Navigation
- Stack navigation with fade animations
- No headers (custom headers in each screen)
- Navigation reset on logout
- Back button handling

### Status Bar Padding
All screens include top padding (40-60px) to prevent status bar overlap on:
- Battery indicator
- Signal strength
- Time display

### Data Persistence
- AsyncStorage for user status
- Can be reset via App.js useEffect (currently active)

## Color Scheme
- **Primary Gradient**: #8B9FE8 → #E88E99
- **Accent Pink**: #E88E99
- **Accent Orange**: #FF6B35, #FF9A5F
- **Success Green**: #4CAF50
- **Alert Red**: #FF6B6B, #F44336
- **Blue**: #4A90E2
- **Text Dark**: #333, #000
- **Text Light**: #666, #999
- **Background**: #F5F5F5, #F8F8F8

## Development Notes

### AsyncStorage Reset
App.js contains a useEffect that removes 'isNewUser' on every app start:
```javascript
useEffect(() => {
  const resetStorage = async () => {
    await AsyncStorage.removeItem('isNewUser');
    console.log('isNewUser removed');
  };
  resetStorage();
}, []);
```
**Note**: Comment this out for production to maintain user state.

### Invoice Calculations
CreateInvoiceScreen calculates:
- Subtotal: Sum of all item prices
- Tax: (price × tax%) for each item
- Discount: (price × discount%) for each item
- Grand Total: Subtotal + Total Tax - Total Discount

### Footer Component
Reusable footer navigation with:
- Home, Add Invoice, Pendings, Profile tabs
- Active state highlighting
- Badge support for pending notifications

## Common Issues & Solutions

### Keyboard Hiding Input
✅ Solved with KeyboardAvoidingView + ScrollView on all input screens

### Status Bar Overlap
✅ Solved with increased top padding (40-60px) on all screens

### Image Picker Not Working
- Ensure `expo-image-picker` is installed
- Check permissions in app.json
- Test permissions requests on device

### Navigation Issues
- Ensure all screen names match in App.js and navigation calls
- Use navigation.reset() for logout flow
- Check stack navigator configuration

## Future Enhancements
- [ ] Backend API integration
- [ ] Real OTP/SMS integration
- [ ] Cloud storage for invoices
- [ ] PDF generation for invoices
- [ ] Payment gateway integration
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Offline mode with sync

## Support
For issues or questions, contact: viveha.ai

## License
Proprietary - All rights reserved

---

**Version**: 1.0.0  
**Last Updated**: January 8, 2026  
**Platform**: iOS & Android  
**Framework**: React Native (Expo)
