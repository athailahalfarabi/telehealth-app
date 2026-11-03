
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import { colors, styles } from "../styles/auth.styles";

type Profile = {
  full_name: string;
  role: "patient" | "nutritionist" | "admin";
};

export default function AuthHomeScreen() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data: userProfile, error: profileError } =
          await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", authData.user.id)
            .single();

        if (profileError || !userProfile) {
          throw new Error("Profil akun tidak ditemukan.");
        }

        // KHUSUS PASIEN
        if (userProfile.role === "patient") {
          const { data: health, error: healthError } =
            await supabase
              .from("patient_health_profiles")
              .select("user_id")
              .eq("user_id", authData.user.id)
              .maybeSingle();

          if (healthError) throw healthError;

          // Jika belum mengisi data kesehatan
          if (!health) {
            router.replace("/health-profile");
            return;
          }
          router.replace("/dashboard");
            return;
        }

        if (active) {
          setProfile(userProfile as Profile);
        }
      } catch (error) {
        Alert.alert(
          "Gagal Memuat Akun",
          error instanceof Error
            ? error.message
            : "Silakan coba kembali."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    checkUser();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Gagal Keluar", error.message);
      return;
    }

    router.replace("/login");
  }

  if (loading || !profile) {
    return (
      <View style={styles.testPage}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  const roleName =
    profile.role === "admin"
      ? "Admin"
      : profile.role === "nutritionist"
      ? "Ahli Gizi"
      : "Pasien";

  return (
    <View style={styles.testPage}>
      <View style={styles.testCard}>
        <Ionicons
          name="checkmark-circle"
          size={65}
          color={colors.primary}
        />

        <Text style={styles.testTitle}>
          Selamat Datang!
        </Text>

        <Text style={styles.testSubtitle}>
          Halo, {profile.full_name || "Pengguna"}!
          {"\n"}
          Role akun: {roleName}
        </Text>

        <Text style={styles.testSubtitle}>
          {profile.role === "patient"
            ? "Profil kesehatan berhasil dilengkapi. Dashboard pasien akan dibuat berikutnya."
            : "Dashboard untuk role ini akan dibuat berikutnya."}
        </Text>

        {profile.role === "patient" && (
          <Pressable
            style={[
              styles.primaryButton,
              { alignSelf: "stretch", width: "100%" },
            ]}
            onPress={() => router.push("/health-profile")}
          >
            <Text style={styles.primaryText}>
              Edit Profil Kesehatan
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleLogout}
          style={{ padding: 15 }}
        >
          <Text style={{ color: "#C94A4A" }}>
            Keluar Akun
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
