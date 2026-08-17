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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { styles } from "./login";

import { logoSvg } from "./logoSvg";

const nationalityOptions = [
  { label: "Filipino", value: "Filipino" },
  { label: "American", value: "American" },
  { label: "Canadian", value: "Canadian" },
  { label: "British", value: "British" },
  { label: "Australian", value: "Australian" },
  { label: "Japanese", value: "Japanese" },
  { label: "Chinese", value: "Chinese" },
  { label: "Korean", value: "Korean" },
  { label: "Indian", value: "Indian" },
  { label: "Other", value: "Other" },
];

const districtOptions = [
  { label: "District 1", value: "District 1" },
  { label: "District 2", value: "District 2" },
  { label: "District 3", value: "District 3" },
  { label: "District 4", value: "District 4" },
  { label: "District 5", value: "District 5" },
  { label: "District 6", value: "District 6" },
];

const barangaysByDistrict: Record<string, string[]> = {
  "District 1": [
    "Vasra", "Bagong Pag-asa", "Sto. Cristo", "Project 6", "Ramon Magsaysay", "Alicia",
    "Bahay Toro", "Katipunan", "San Antonio", "Veterans Village", "Bungad", "Phil-Am",
    "West Triangle", "Sta. Cruz", "Nayong Kanluran", "Paltok", "Paraiso", "Mariblo",
    "Damayan", "Del Monte", "Masambong", "Talayan", "Sto. Domingo", "Siena",
    "St. Peter", "San Jose", "Manresa", "Damar", "Pag-ibig sa Nayon", "Balingasa",
    "Sta. Teresita", "San Isidro Labrador", "Paang Bundok", "Salvacion", "N.S Amoranto",
    "Maharlika", "Lourdes",
  ],
  "District 2": [
    "Bagong Silangan", "Batasan Hills", "Commonwealth", "Holy Spirit", "Payatas",
  ],
  "District 3": [
    "Silangan", "Socorro", "E. Rodriguez", "West Kamias", "East Kamias", "Quirino 2-A",
    "Quirino 2-B", "Quirino 2-C", "Quirino 3-A", "Claro (Quirino 3-B)", "Duyan-Duyan",
    "Amihan", "Matandang Balara", "Pansol", "Loyola Heights", "San Roque", "Mangga",
    "Masagana", "Villa Maria Clara", "Bayanihan", "Camp Aguinaldo", "White Plains",
    "Libis", "Ugong Norte", "Bagumbayan", "Blue Ridge A", "Blue Ridge B", "St. Ignatius",
    "Milagrosa", "Escopa I", "Escopa II", "Escopa III", "Escopa IV", "Marilag",
    "Bagumbuhay", "Tagumpay", "Dioquino Zobel",
  ],
  "District 4": [
    "Sacred Heart", "Laging Handa", "Obrero", "Paligsahan", "Roxas", "Kamuning",
    "South Triangle", "Pinagkaisahan", "Immaculate Concepcion", "San Martin De Porres",
    "Kaunlaran", "Bagong Lipunan ng Crame", "Horseshoe", "Valencia", "Tatalon",
    "Kalusugan", "Kristong Hari", "Damayang Lagi", "Mariana", "Dona Imelda", "Santol",
    "Sto. Nino", "San Isidro Galas", "Dona Aurora", "Don Manuel", "Dona Josefa",
    "UP Village", "Old Capitol Site", "UP Campus", "San Vicente", "Teachers Village East",
    "Teachers Village West", "Central", "Pinyahan", "Malaya", "Sikatuna Village", "Botocan",
    "Krus Na Ligas",
  ],
  "District 5": [
    "Bagbag", "Capri", "Greater Lagro", "Gulod", "Kaligayahan", "Nagkaisang Nayon",
    "North Fairview", "Novaliches Proper", "Pasong Putik Proper", "San Agustin",
    "San Bartolome", "Sta. Lucia", "Sta. Monica", "Fairview",
  ],
  "District 6": [
    "Apolonio Samson", "Baesa", "Balon Bato", "Culiat", "New Era", "Pasong Tamo",
    "Sangandaan", "Tandang Sora", "Unang Sigaw", "Sauyo", "Talipapa",
  ],
};

const barangayOptions = Object.entries(barangaysByDistrict).flatMap(
  ([district, barangays]) =>
    barangays.map((name) => ({ label: name, value: name, district })),
);

export default function SignupScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? "dark" : "light"];
  const bgColor = isDarkMode ? DARK_BACKGROUND : LIGHT_BACKGROUND;

  const { signUp, activateSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [barangay, setBarangay] = useState("");
  const [barangayQuery, setBarangayQuery] = useState("");
  const [houseUnit, setHouseUnit] = useState("");
  const [street, setStreet] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showNationalityModal, setShowNationalityModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const filteredBarangays = useMemo(
    () =>
      barangayOptions
        .filter((item) => item.district === selectedDistrict)
        .filter((item) =>
          item.label.toLowerCase().includes(barangayQuery.toLowerCase()),
        ),
    [selectedDistrict, barangayQuery],
  );

  const handleSelectNationality = (value: string) => {
    setNationality(value);
    setShowNationalityModal(false);
  };

  const handleSelectDistrict = (value: string) => {
    setSelectedDistrict(value);
    setBarangay("");
    setBarangayQuery("");
    setShowDistrictModal(false);
  };

  const handleSelectBarangay = (value: string) => {
    setBarangay(value);
    setBarangayQuery("");
    setShowBarangayModal(false);
  };

  const handleCreateAccount = async () => {
    if (
      !fullName ||
      !email ||
      !password ||
      !confirmPassword ||
      !nationality ||
      !phone ||
      !selectedDistrict ||
      !barangay ||
      !houseUnit ||
      !street
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (!consentChecked) {
      Alert.alert(
        "Consent Required",
        "You must agree to the privacy and data processing terms to continue.",
      );
      return;
    }

    setLoading(true);
    setSignupError(null);

    try {
      const createdUser = await signUp({
        name: fullName,
        email,
        password,
        phone,
        nationality,
        district: selectedDistrict,
        barangay,
        house_unit: houseUnit,
        street,
      });

      await activateSession(createdUser);
      setSuccessVisible(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.";
      setSignupError(message);
      Alert.alert("Registration Failed", message);
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
      router.replace("/(tabs)");
    }, 1200);

    return () => clearTimeout(timeout);
  }, [router, successOpacity, successScale, successVisible]);

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
          <View style={[styles.content, signupStyles.signupContent]}>
            <View style={signupStyles.logoWrapper}>
              <SvgXml xml={logoSvg} width={140} height={96} />
            </View>

            <View style={[styles.headerSection, signupStyles.headerCentered]}>
              <Text
                style={[styles.title, { color: colors.text, fontSize: 32 }]}
              >
                Create an Account
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colors.icon,
                    marginTop: 10,
                    textAlign: "left",
                    lineHeight: 22,
                  },
                ]}
              >
                Sign up to receive alerts, manage your preferences, and access
                emergency tools.
              </Text>
            </View>

            <View
              style={[styles.formSection, signupStyles.formSectionOverride]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
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
                    placeholder="Juan Dela Cruz"
                    placeholderTextColor={colors.icon}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Email Address
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.text} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="juan@example.com"
                    placeholderTextColor={colors.icon}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
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
                    placeholder="Enter password"
                    placeholderTextColor={colors.icon}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
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
                    placeholder="Confirm password"
                    placeholderTextColor={colors.icon}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Nationality
                </Text>
                <Pressable
                  onPress={() => setShowNationalityModal(true)}
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons name="flag-outline" size={20} color={colors.text} />
                  <Text
                    style={[
                      styles.input,
                      { color: nationality ? colors.text : colors.icon },
                    ]}
                  >
                    {nationality || "Select nationality"}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Mobile Number
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Text
                    style={[signupStyles.mobilePrefix, { color: colors.text }]}
                  >
                    +63
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      signupStyles.mobileInput,
                      { color: colors.text },
                    ]}
                    placeholder="9XXXXXXXXX"
                    placeholderTextColor={colors.icon}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  District (Quezon City)
                </Text>
                <Pressable
                  onPress={() => setShowDistrictModal(true)}
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons name="map-outline" size={20} color={colors.text} />
                  <Text
                    style={[
                      styles.input,
                      { color: selectedDistrict ? colors.text : colors.icon },
                    ]}
                  >
                    {selectedDistrict || "Select District"}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Barangay (Quezon City)
                </Text>
                <Pressable
                  onPress={() => {
                    if (!selectedDistrict) {
                      Alert.alert(
                        "Select District",
                        "Please select a district first.",
                      );
                      return;
                    }
                    setShowBarangayModal(true);
                  }}
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.text}
                  />
                  <Text
                    style={[
                      styles.input,
                      { color: barangay ? colors.text : colors.icon },
                    ]}
                  >
                    {barangay ||
                      "Select district first, then type to search barangay..."}
                  </Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  House / Unit No.
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.text}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. #123"
                    placeholderTextColor={colors.icon}
                    value={houseUnit}
                    onChangeText={setHouseUnit}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Street (Quezon City)
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    signupStyles.textInputWrapper,
                    {
                      borderColor: TealColors.primary,
                      backgroundColor: `${TealColors.primary}05`,
                    },
                  ]}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={20}
                    color={colors.text}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your street name"
                    placeholderTextColor={colors.icon}
                    value={street}
                    onChangeText={setStreet}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={signupStyles.consentCard}>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  By providing my personal information, including my full name,
                  contact number, address, and location, I hereby give my
                  explicit consent to LGU #4 EMERGENCY COMMUNICATION SYSTEM to
                  collect, store, and process my personal data in accordance
                  with the Data Privacy Act of 2012 (Republic Act No. 10173).
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I understand that the information I provide will be used
                  solely for the purposes of emergency communication, public
                  safety notifications, and other related services, and that it
                  will be handled with strict confidentiality and security
                  measures to prevent unauthorized access, disclosure, or
                  misuse.
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I acknowledge that LGU #4 EMERGENCY COMMUNICATION SYSTEM will
                  only collect the minimum amount of personal information
                  necessary to provide its services and that my data will not be
                  shared with any third party except as required by law or for
                  the execution of emergency response protocols.
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I understand that I have the right to access my personal
                  information at any time and request corrections to any
                  inaccurate or incomplete data. I also have the right to
                  request the deletion of my personal information if I no longer
                  wish to participate in the system or withdraw my consent.
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I am aware that providing my personal information is
                  voluntary, but that refusal to provide certain information may
                  limit my ability to receive timely emergency alerts and
                  notifications.
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I further acknowledge that I may withdraw my consent at any
                  time by contacting the designated Data Protection Officer of
                  LGU #4 EMERGENCY COMMUNICATION SYSTEM through the provided
                  contact details, and that such withdrawal will not affect the
                  legality of any data processing conducted prior to my
                  withdrawal.
                </Text>
                <Text
                  style={[signupStyles.consentText, { color: colors.text }]}
                >
                  I consent to the collection, storage, and processing of my
                  personal information by LGU #4 EMERGENCY COMMUNICATION SYSTEM.
                </Text>
                <Pressable
                  onPress={() => setConsentChecked((current) => !current)}
                  style={signupStyles.consentCheckboxRow}
                >
                  <View
                    style={[
                      signupStyles.checkbox,
                      { borderColor: TealColors.primary },
                    ]}
                  >
                    {consentChecked && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={TealColors.primary}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      signupStyles.consentCheckboxLabel,
                      { color: colors.text },
                    ]}
                  >
                    I agree to the collection and processing of my personal
                    information.
                  </Text>
                </Pressable>
              </View>
            </View>

            {signupError ? (
              <Text
                style={[
                  styles.subtitle,
                  { color: "#ef4444", textAlign: "center", marginBottom: 12 },
                ]}
              >
                {signupError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.signupButton,
                signupStyles.createAccountButton,
                {
                  backgroundColor: TealColors.primary,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
              onPress={handleCreateAccount}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.signupButtonText}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.subtitle,
                { color: colors.icon, textAlign: "center", marginVertical: 16 },
              ]}
            >
              Or sign up with
            </Text>

            <View style={signupStyles.socialRow}>
              <TouchableOpacity
                style={[signupStyles.socialButton, signupStyles.googleButton]}
                disabled
              >
                <Ionicons name="logo-google" size={18} color="#fff" />
                <Text
                  style={[signupStyles.socialButtonText, { color: "#fff" }]}
                >
                  Google
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[signupStyles.socialButton, signupStyles.appleButton]}
                disabled
              >
                <Ionicons name="logo-apple" size={18} color="#fff" />
                <Text
                  style={[signupStyles.socialButtonText, { color: "#fff" }]}
                >
                  Apple
                </Text>
              </TouchableOpacity>
            </View>

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

            <View style={signupStyles.footer}>
              <Text style={[signupStyles.footerText, { color: colors.icon }]}>
                © 2026 LGU #4. All rights reserved.
              </Text>
              <View style={signupStyles.footerLinks}>
                <TouchableOpacity>
                  <Text
                    style={[
                      signupStyles.footerLink,
                      { color: TealColors.primary },
                    ]}
                  >
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
                <Text style={[signupStyles.footerDot, { color: colors.icon }]}>
                  •
                </Text>
                <TouchableOpacity>
                  <Text
                    style={[
                      signupStyles.footerLink,
                      { color: TealColors.primary },
                    ]}
                  >
                    Terms of Service
                  </Text>
                </TouchableOpacity>
                <Text style={[signupStyles.footerDot, { color: colors.icon }]}>
                  •
                </Text>
                <TouchableOpacity>
                  <Text
                    style={[
                      signupStyles.footerLink,
                      { color: TealColors.primary },
                    ]}
                  >
                    Cookie Policy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
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
            <Text style={styles.successTitle}>Registration complete</Text>
            <Text style={styles.successSubtitle}>
              Account created successfully
            </Text>
            <ActivityIndicator
              color={TealColors.primary}
              style={{ marginTop: 12 }}
            />
          </Animated.View>
        </Animated.View>
      )}

      <Modal transparent visible={showNationalityModal} animationType="fade">
        <Pressable
          style={signupStyles.modalOverlay}
          onPress={() => setShowNationalityModal(false)}
        />
        <View style={[signupStyles.modalContent, { backgroundColor: bgColor }]}>
          <Text
            style={[
              styles.title,
              { fontSize: 18, marginBottom: 16, color: colors.text },
            ]}
          >
            Select nationality
          </Text>
          <ScrollView>
            {nationalityOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelectNationality(option.value)}
                style={({ pressed }) => [
                  signupStyles.modalItem,
                  {
                    backgroundColor: pressed
                      ? `${TealColors.primary}15`
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[signupStyles.modalItemText, { color: colors.text }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal transparent visible={showDistrictModal} animationType="fade">
        <Pressable
          style={signupStyles.modalOverlay}
          onPress={() => setShowDistrictModal(false)}
        />
        <View style={[signupStyles.modalContent, { backgroundColor: bgColor }]}>
          <Text
            style={[
              styles.title,
              { fontSize: 18, marginBottom: 16, color: colors.text },
            ]}
          >
            Select District
          </Text>
          <ScrollView>
            {districtOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelectDistrict(option.value)}
                style={({ pressed }) => [
                  signupStyles.modalItem,
                  {
                    backgroundColor: pressed
                      ? `${TealColors.primary}15`
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[signupStyles.modalItemText, { color: colors.text }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal transparent visible={showBarangayModal} animationType="fade">
        <Pressable
          style={signupStyles.modalOverlay}
          onPress={() => setShowBarangayModal(false)}
        />
        <View style={[signupStyles.modalContent, { backgroundColor: bgColor }]}>
          <Text
            style={[
              styles.title,
              { fontSize: 18, marginBottom: 12, color: colors.text },
            ]}
          >
            Select Barangay
          </Text>
          <TextInput
            style={[
              styles.input,
              signupStyles.barangaySearchInput,
              { color: colors.text, borderColor: TealColors.primary },
            ]}
            placeholder="Type to search barangay"
            placeholderTextColor={colors.icon}
            value={barangayQuery}
            onChangeText={setBarangayQuery}
          />
          <ScrollView style={{ maxHeight: 260, marginTop: 8 }}>
            {filteredBarangays.length > 0 ? (
              filteredBarangays.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelectBarangay(option.value)}
                  style={({ pressed }) => [
                    signupStyles.modalItem,
                    {
                      backgroundColor: pressed
                        ? `${TealColors.primary}15`
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[signupStyles.modalItemText, { color: colors.text }]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={[signupStyles.emptyText, { color: colors.icon }]}>
                No barangays match your search.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const signupStyles = StyleSheet.create({
  signupContent: {
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerLeftAligned: {
    alignItems: "flex-start",
    width: "100%",
  },
  formSectionOverride: {
    gap: 18,
  },
  textInputWrapper: {
    width: "100%",
  },
  consentCard: {
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    gap: 12,
  },
  consentText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748b",
  },
  consentCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  consentCheckboxLabel: {
    fontSize: 13,
    flex: 1,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  socialButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerDot: {
    fontSize: 12,
  },
  logoWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  headerCentered: {
    alignItems: "center",
    width: "100%",
  },
  createAccountButton: {
    marginTop: 20,
  },
  mobilePrefix: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    minWidth: 56,
  },
  mobileInput: {
    paddingLeft: 0,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    borderColor: "#4285F4",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalContent: {
    position: "absolute",
    top: "20%",
    left: 20,
    right: 20,
    borderRadius: 18,
    padding: 18,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalItemText: {
    fontSize: 15,
  },
  barangaySearchInput: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  emptyText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
  },
});
