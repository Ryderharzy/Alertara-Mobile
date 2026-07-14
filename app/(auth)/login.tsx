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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { signIn, activateSession } = useAuth();
  const colors = Colors[isDarkMode ? "dark" : "light"];
  const bgColor = isDarkMode ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pendingUser, setPendingUser] = useState<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: string | null;
    user_type: string | null;
  } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setLoginError(null);
      const user = await signIn(email, password);
      setPendingUser(user);
      setSuccessVisible(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Please check your credentials and try again.";
      setLoginError(message);
      Alert.alert("Login Failed", message);
      console.error("Login error:", error);
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
  }, [
    activateSession,
    pendingUser,
    router,
    successOpacity,
    successScale,
    successVisible,
  ]);

  const handleSignUp = () => {
    router.push("/(auth)/signup");
  };

  const handleContinueWithoutAccount = async () => {
    try {
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error continuing without account:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
              <Text style={[styles.title, { color: colors.text }]}>itizen</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Community Safety & Awareness
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
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
                  placeholder="Enter your password"
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

            {/* Forgot Password */}
            <TouchableOpacity>
              <Text
                style={[styles.forgotPassword, { color: TealColors.primary }]}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {loginError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {loginError}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: TealColors.primary,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.icon }]}>
                Don&apos;t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={handleSignUp} disabled={loading}>
                <Text
                  style={[styles.signupLink, { color: TealColors.primary }]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue Without Account */}
            <TouchableOpacity
              style={styles.continueWithoutButton}
              onPress={handleContinueWithoutAccount}
              disabled={loading}
            >
              <Text
                style={[
                  styles.continueWithoutText,
                  { color: TealColors.primary },
                ]}
              >
                Continue without account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {successVisible && (
        <Animated.View
          style={[styles.successOverlay, { opacity: successOpacity }]}
        >
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={34} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Account verified</Text>
            <Text style={styles.successSubtitle}>Login successful</Text>
            <ActivityIndicator
              color={TealColors.primary}
              style={{ marginTop: 12 }}
            />
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 150,
    height: 120,
    marginBottom: 25,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  formSection: {
    gap: 20,
    width: "100%",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    marginTop: 8,
  },
  buttonsContainer: {
    width: "100%",
    marginTop: 24,
    gap: 16,
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  continueWithoutButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  continueWithoutText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  signupButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  signupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  termsText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    width: "78%",
    maxWidth: 320,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TealColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1d1d1d",
  },
  successSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#666",
  },
});
