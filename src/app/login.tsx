
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // PROSES LOGIN SUPABASE
  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(
        "Perhatian",
        "Email dan kata sandi wajib diisi."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Akun tidak ditemukan.");
      }

      // Mengambil role pengguna dari database
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        throw new Error(
          "Profil pengguna belum ditemukan di Supabase."
        );
      }
      
      // Mengarahkan pengguna berdasarkan role
      if (profile.role === "nutritionist") {
        // Ahli gizi masuk dashboard khusus
        router.replace("/nutritionist-dashboard");

      } else if (profile.role === "patient") {
        // Pasien tetap masuk halaman sebelumnya
        router.replace("/auth-home");
 
} else if (profile.role === "admin") {
  router.replace("/admin-dashboard");

      } else {
        throw new Error(
          "Role akun tidak dikenali."
        );
      }


    } catch (err) {
      Alert.alert(
        "Login Gagal",
        err instanceof Error
          ? err.message
          : "Silakan coba kembali."
      );
    } finally {
      setLoading(false);
    }
  }

  // PERMINTAAN RESET PASSWORD
  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert(
        "Masukkan Email",
        "Isi alamat email terlebih dahulu."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase()
        );

      if (error) throw error;

      Alert.alert(
        "Periksa Email",
        "Jika akun terdaftar, email pemulihan akan dikirim."
      );
    } catch (err) {
      Alert.alert(
        "Gagal",
        err instanceof Error
          ? err.message
          : "Coba kembali."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[
          "#FAF9FF",
          "#FAF8FF",
          "#FBFBFE",
        ]}
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
              style={styles.backButton}
              onPress={() => router.replace("/")}
            >
              <Ionicons
                name="arrow-back-outline"
                size={23}
                color={colors.text}
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
          <View style={styles.loginIntro}>
            <Text style={styles.authTitle}>
              Selamat Datang
            </Text>

            <Text style={styles.authSubtitle}>
              Masuk ke akun NutriCare AI Anda.
            </Text>
          </View>

          {/* FORM LOGIN */}
          <View style={styles.loginForm}>
            <AuthInput
              label="Alamat Email"
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
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="password"
            />

            <View style={styles.forgotRow}>
              <Pressable
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.smallLink}>
                  Lupa Password?
                </Text>
              </Pressable>
            </View>

            {/* TOMBOL MASUK */}
            <Pressable
              style={[
                styles.primaryButton,
                styles.loginButton,
                loading && styles.disabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryText}>
                    Masuk
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color="#FFFFFF"
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* PINDAH KE REGISTER */}
          <Pressable
            style={styles.authFooter}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.footerText}>
              Belum punya akun?{" "}
            </Text>

            <Text style={styles.footerLink}>
              Daftar
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
