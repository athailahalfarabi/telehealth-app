
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import AuthInput from "../components/AuthInput";
import { colors, styles } from "../styles/auth.styles";
import { supabase } from "../../supabase";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // REGISTRASI PASIEN
  async function handleRegister() {
    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirm
    ) {
      Alert.alert(
        "Perhatian",
        "Lengkapi semua kolom terlebih dahulu."
      );
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert(
        "Email Tidak Valid",
        "Masukkan alamat email yang benar."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Password Terlalu Pendek",
        "Gunakan minimal 8 karakter."
      );
      return;
    }

    if (password !== confirm) {
      Alert.alert(
        "Password Tidak Sama",
        "Konfirmasi password harus sama."
      );
      return;
    }

    if (!agreed) {
      Alert.alert(
        "Persetujuan Diperlukan",
        "Centang persetujuan untuk melanjutkan."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

      if (error) throw error;

      if (data.session) {
        Alert.alert(
          "Registrasi Berhasil",
          "Akun pasien berhasil dibuat."
        );

        router.replace("/auth-home");
      } else {
        Alert.alert(
          "Periksa Email",
          "Jika akun berhasil didaftarkan, ikuti petunjuk verifikasi email dari Supabase."
        );

        router.replace("/login");
      }

    } catch (err) {
      Alert.alert(
        "Registrasi Gagal",
        err instanceof Error
          ? err.message
          : "Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[
          "#DDF8F0",
          "#F7FCFB",
          "#FAF9FF",
        ]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.page,
            styles.authContent,
          ]}
        >
          {/* HEADER */}
          <View style={styles.authHeader}>
            <Pressable
              style={[
                styles.backButton,
                styles.registerBack,
              ]}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={colors.primary}
              />
            </Pressable>

            <View style={styles.headerBrand}>
              <Ionicons
                name="leaf"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.headerBrandText}>
                NutriCare AI
              </Text>
            </View>
          </View>

          {/* JUDUL */}
          <View style={styles.registerIntro}>
            <Text style={styles.authTitle}>
              Buat Akun
            </Text>

            <Text style={styles.authSubtitle}>
              Daftar untuk memulai konsultasi nutrisi Anda.
            </Text>
          </View>

          {/* FORM REGISTER */}
          <View style={styles.registerForm}>
            <AuthInput
              label="Nama Lengkap"
              icon="person-outline"
              placeholder="Contoh: Dina Rahma"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />

            <AuthInput
              label="Email"
              icon="mail-outline"
              placeholder="nama@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
            />

            <AuthInput
              label="Kata Sandi"
              icon="lock-closed-outline"
              placeholder="Minimal 8 karakter"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="new-password"
            />

            <AuthInput
              label="Konfirmasi Kata Sandi"
              icon="lock-closed-outline"
              placeholder="Ulangi kata sandi"
              value={confirm}
              onChangeText={setConfirm}
              secure
              autoComplete="new-password"
            />

            {/* PERSETUJUAN */}
            <Pressable
              style={styles.consentRow}
              onPress={() => setAgreed(!agreed)}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: agreed,
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxActive,
                ]}
              >
                {agreed && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color="#FFFFFF"
                  />
                )}
              </View>

              <Text style={styles.consentText}>
                Saya memahami bahwa aplikasi ini
                merupakan prototipe NutriCare AI.
              </Text>
            </Pressable>

            {/* TOMBOL DAFTAR */}
            <Pressable
              style={[
                styles.primaryButton,
                styles.registerButton,
                loading && styles.disabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>
                  Daftar
                </Text>
              )}
            </Pressable>
          </View>

          {/* PINDAH KE LOGIN */}
          <Pressable
            style={styles.authFooter}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.footerText}>
              Sudah punya akun?{" "}
            </Text>

            <Text style={styles.footerLink}>
              Masuk
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
