import {
  Colors,
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  TealColors,
} from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./login";

export default function SignupScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { signUp, activateSession } = useAuth();
  const colors = Colors[isDarkMode ? "dark" : "light"];
  const bgColor = isDarkMode ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: number; name: string; email: string; phone: string | null; status: string | null; user_type: string | null } | null>(null);
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const handleSignUp = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const user = await signUp(name, email, password, phone);
      setPendingUser(user);
      setSuccessVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again with different credentials";
      Alert.alert(
        "Sign Up Failed",
        message,
      );
      console.error("Sign up error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!successVisible) return;

    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      setSuccessVisible(false);
      if (pendingUser) {
        activateSession(pendingUser);
        router.replace("/(tabs)");
      }
      setPendingUser(null);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [activateSession, pendingUser, router, successOpacity, successScale, successVisible]);

  const handleLogin = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo */}
            <Image
              source={require("@/assets/images/alertara.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>
                  AlerTara
                </Text>
                <Text
                  style={[
                    styles.title,
                    { color: TealColors.primary, fontStyle: "italic" },
                  ]}
                >
                  QC
                </Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  itizen
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.icon }]}>
                Create Account
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formSection}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.text}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.icon}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Email
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.text} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.icon}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
              </View>
            </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Phone Number
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons name="call-outline" size={20} color={colors.text} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={colors.icon}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.text}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Create a password"
                    placeholderTextColor={colors.icon}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.text}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.icon}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-outline" : "eye-off-outline"
                      }
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms */}
              <Text style={[styles.termsText, { color: colors.icon }]}>
                By signing up, you agree to our Terms of Service and Privacy
                Policy
              </Text>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signupButton,
                {
                  backgroundColor: TealColors.primary,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.signupButtonText}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.icon }]}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={handleLogin} disabled={loading}>
                <Text style={[styles.loginLink, { color: TealColors.primary }]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {successVisible && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={34} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Registration complete</Text>
            <Text style={styles.successSubtitle}>Account verified successfully</Text>
            <ActivityIndicator color={TealColors.primary} style={{ marginTop: 12 }} />
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
