// import { StatusBar } from 'expo-status-bar';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// // Import all screens
// import LogoScreen from './Pages/LogoScreen';
// import NameScreen from './Pages/NameScreen';
// import ShopDetailsScreen from './Pages/ShopDetailsScreen';
// import MobileNumberScreen from './Pages/MobileNumberScreen';
// import ConfirmationCodeScreen from './Pages/ConfirmationCodeScreen';
// import TermsAgreementScreen from './Pages/TermsAgreementScreen';
// import ProfilePictureScreen from './Pages/ProfilePictureScreen';
// import OTPVerificationScreen from './Pages/OTPVerificationScreen';
// import VerificationCodeScreen from './Pages/VerificationCodeScreen';
// import SuccessScreen from './Pages/SuccessScreen';
// import HomeScreen from './Pages/HomeScreen';
// import PendingsScreen from './Pages/PendingsScreen';
// import CreateInvoiceScreen from './Pages/CreateInvoiceScreen';
// import InvoicePreviewScreen from './Pages/InvoicePreviewScreen';
// import ProfileScreen from './Pages/ProfileScreen';

// const Stack = createNativeStackNavigator();

// export default function App() {
//   return (
//     <NavigationContainer>
//       <StatusBar style="auto" />
//       <Stack.Navigator 
//         initialRouteName="Logo"
//         screenOptions={{
//           headerShown: false,
//           animation: 'fade',
//         }}
//       >
//         <Stack.Screen name="Logo" component={LogoScreen} />
//         <Stack.Screen name="Name" component={NameScreen} />
//         <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
//         <Stack.Screen name="MobileNumber" component={MobileNumberScreen} />
//         <Stack.Screen name="ConfirmationCode" component={ConfirmationCodeScreen} />
//         <Stack.Screen name="TermsAgreement" component={TermsAgreementScreen} />
//         <Stack.Screen name="ProfilePicture" component={ProfilePictureScreen} />
//         <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
//         <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
//         <Stack.Screen name="Success" component={SuccessScreen} />
//         <Stack.Screen name="Home" component={HomeScreen} />
//         <Stack.Screen name="Pendings" component={PendingsScreen} />
//         <Stack.Screen name="AddInvoice" component={CreateInvoiceScreen} />
//         <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
//         <Stack.Screen name="Profile" component={ProfileScreen} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Import all screens
import LogoScreen from './Pages/LogoScreen';
import NameScreen from './Pages/NameScreen';
import ShopDetailsScreen from './Pages/ShopDetailsScreen';
import MobileNumberScreen from './Pages/MobileNumberScreen';
import ConfirmationCodeScreen from './Pages/ConfirmationCodeScreen';
import TermsAgreementScreen from './Pages/TermsAgreementScreen';
import ProfilePictureScreen from './Pages/ProfilePictureScreen';
import OTPVerificationScreen from './Pages/OTPVerificationScreen';
import VerificationCodeScreen from './Pages/VerificationCodeScreen';
import SuccessScreen from './Pages/SuccessScreen';
import HomeScreen from './Pages/HomeScreen';
import PendingsScreen from './Pages/PendingsScreen';
import CreateInvoiceScreen from './Pages/CreateInvoiceScreen';
import InvoicePreviewScreen from './Pages/InvoicePreviewScreen';
import ProfileScreen from './Pages/ProfileScreen';
import DiscountOfferScreen from './Pages/DiscountOfferScreen';
import SubscriptionPlanScreen from './Pages/SubscriptionPlanScreen';
import ItemsScreen from './Pages/ItemsScreen';
import HistoryScreen from './Pages/HistoryScreen';
import OnboardingScreen1 from './Pages/OnboardingScreen1';
import OnboardingScreen2 from './Pages/OnboardingScreen2';
import OnboardingScreen3 from './Pages/OnboardingScreen3';
import VisitingCardScreen from './Pages/VisitingCardScreen';
// import OnboardingScreen4 from './Pages/OnboardingScreen4';

import InsightsScreen from './Pages/InsightsScreen';

import TaxAndDiscountScreen from './Pages/TaxAndDiscountScreen';
import ContactsScreen from './Pages/ContactsScreen';
import SettingsScreen from './Pages/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState("Logo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('@viveha_token');
        const clientId = await AsyncStorage.getItem('@viveha_client_id');

        console.log('🔍 Checking Login Status:');
        console.log('   - Token:', token ? 'Found' : 'Missing');
        console.log('   - ClientId:', clientId ? 'Found' : 'Missing');

        if (token && clientId) {
          console.log('✅ Auto-login to Home');
          // Verify token validity or just trust it exists for now (10 days requirement)
          // We could add a timestamp check if we stored login time, 
          // but typically token existence + backend 401 handling is enough.
          // For now, simple existence check to skip login screens.
          setInitialRoute("Home");
        } else {
          console.log('❌ Auto-login failed, defaulting to Logo');
          // Optional: Clear any partial data if one exists but not other?
          // setInitialRoute("Logo"); // Default is already Logo
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isLoading) {
    return null; // Or a splash screen component
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Logo" component={LogoScreen} />
          <Stack.Screen name="Name" component={NameScreen} />
          <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
          <Stack.Screen name="MobileNumber" component={MobileNumberScreen} />
          <Stack.Screen name="ConfirmationCode" component={ConfirmationCodeScreen} />
          <Stack.Screen name="TermsAgreement" component={TermsAgreementScreen} />
          <Stack.Screen name="ProfilePicture" component={ProfilePictureScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
          <Stack.Screen name="Success" component={SuccessScreen} />
          <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
          <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
          <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
          {/* <Stack.Screen name="Onboarding4" component={OnboardingScreen4} /> */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Pendings" component={PendingsScreen} />
          <Stack.Screen name="Items" component={ItemsScreen} />
          <Stack.Screen name="AddInvoice" component={CreateInvoiceScreen} />
          <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
          <Stack.Screen name="InvoicePreview" component={InvoicePreviewScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="VisitingCard" component={VisitingCardScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="DiscountOffer" component={DiscountOfferScreen} />
          <Stack.Screen name="SubscriptionPlan" component={SubscriptionPlanScreen} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
          <Stack.Screen name="TaxAndDiscount" component={TaxAndDiscountScreen} />
          <Stack.Screen name="MyContacts" component={ContactsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast position="bottom" bottomOffset={100} />
    </SafeAreaProvider>
  );
}
