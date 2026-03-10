import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import API_URL from "../api";
import Toast from "react-native-toast-message";

const { height } = Dimensions.get("window");

interface OTPVerificationScreenProps {
  navigation: any;
}

export default function OTPVerificationScreen({ navigation }: OTPVerificationScreenProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, "");

    if (numericOnly.length <= 10) {
      setPhone(numericOnly);
      setError("");
    }
  };

  const handleContinue = async () => {
    if (!phone.length) {
      setError("Phone number is required");
      return;
    }

    if (phone.length < 10) {
      setError("Phone number must be 10 digits");
      return;
    }

    if (!["6", "7", "8", "9"].includes(phone[0])) {
      setError("Please enter a valid mobile number");
      return;
    }

    setError("");
    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/otp/send`,
        {
          phoneNumber: phone,
          purpose: "login",
        },
        {
          timeout: 30000,
        }
      );

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "OTP Sent",
          text2: response.data.message || "Please check your phone",
          position: "bottom",
          visibilityTime: 2000,
        });

        navigation.navigate("VerificationCode", { phoneNumber: phone });
        return;
      }

      Toast.show({
        type: "error",
        text1: "Failed to Send OTP",
        text2: response.data.message || "Please try again",
        position: "bottom",
        visibilityTime: 3000,
      });
    } catch (requestError: any) {
      Toast.show({
        type: "error",
        text1: "Connection Error",
        text2:
          requestError.response?.data?.message ||
          "Failed to send OTP. Please check your connection.",
        position: "bottom",
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}

      > */}
        {/* <ScrollView
    contentContainerStyle={{ flexGrow: 1 }}
    keyboardShouldPersistTaps="handled"
  > */}
        {/* TOP LOGO */}
        <View style={styles.topSection}>
          <View style={styles.logoRow}>
            <Image
              source={require("../assets/loginpage.jpeg")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* BOTTOM CARD */}
        <LinearGradient
          colors={["#7E93E6", "#E76E6A"]}
          style={styles.bottomCard}
        >
          {/* Floating logo */}
          <View style={styles.floatingLogo}>
            <Image
              source={require("../assets/logo2.png")}
              style={styles.floatingLogoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>OTP Verification</Text>

          <Text style={styles.subtitle}>
            Enter phone number to send one time password
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Phone Number</Text>

            <View style={styles.inputBox}>
              <Text style={styles.countryCode}>+91-</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, (phone.length < 10 || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={phone.length < 10 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ShopDetails")}
            activeOpacity={0.8}
          >
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerBold}>Register Now</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("TermsAgreement", {})}
            activeOpacity={0.8}
          >
            <Text style={styles.terms}>
              By continuing, you agree to the Terms of Service and confirm that
              you have read our Privacy Policy.
            </Text>
          </TouchableOpacity>
        </LinearGradient>
        {/* </ScrollView> */}
      {/* </KeyboardAvoidingView> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: "#F5F5F5", // or "#fff"
  },

  topSection: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoImage: {
     width: 120,   // increased size
  height: 120,  // increased size
  marginRight: 8,
  },

  brand: {
    fontSize: 26,
    fontWeight: "600",
    color: "#222",
  },

  bottomCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
height: height * 0.70,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 80,
    paddingHorizontal: 30,
    alignItems: "center",
  },

floatingLogo: {
  position: "absolute",
  top: -55,
  alignItems: "center",
  justifyContent: "center",
},

 floatingLogoImage: {
  width: 110,
  height: 110,
},

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
  },

  inputWrapper: {
    width: "100%",
    marginBottom: 25,
  },

  label: {
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },

  inputBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  countryCode: {
    fontSize: 16,
    marginRight: 6,
    color: "#333",
  },

  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },

  errorText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    marginLeft: 12,
  },

  button: {
    backgroundColor: "#FF8A3C",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 15,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  registerText: {
    color: "#fff",
    marginBottom: 12,
  },

  registerBold: {
    fontWeight: "700",
  },

  terms: {
    fontSize: 11,
    textAlign: "center",
    color: "#fff",
    opacity: 0.9,
  },
});