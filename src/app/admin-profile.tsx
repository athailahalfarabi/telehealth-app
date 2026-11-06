import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

const GREEN = "#087A55";
const DARK_GREEN = "#075238";
const MINT = "#B9F7D9";
const BG = "#F8F8FC";
const TEXT = "#172B26";
const MUTED = "#74817D";
const DANGER = "#BD343B";

function errText(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

export default function AdminProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [savedName, setSavedName] = useState("");
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", auth.user.id)
        .single();
      if (profileError) throw profileError;
      if (profile?.role !== "admin")
        throw new Error("Halaman ini hanya dapat dibuka oleh Admin.");

      setUserId(auth.user.id);
      setEmail(auth.user.email ?? "");
      const fullName = (profile?.full_name as string | null) ?? "";
      setSavedName(fullName);
      setName(fullName);
    } catch (err) {
      setErrorMessage(errText(err, "Gagal memuat profil."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleSaveName() {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      Alert.alert("Nama terlalu pendek", "Minimal 3 karakter.");
      return;
    }
    setSavingName(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", userId)
        .select("full_name");
      if (error) throw error;
      // RLS yang menolak update biasanya tidak error, tapi mengembalikan 0 baris.
      if (!data || data.length === 0) {
        throw new Error(
          "Perubahan ditolak database. Periksa kebijakan RLS tabel profiles (update baris sendiri).",
        );
      }
      setSavedName(trimmed);
      Alert.alert("Tersimpan", "Nama profil berhasil diperbarui.");
    } catch (err) {
      Alert.alert("Gagal menyimpan nama", errText(err, "Coba lagi."));
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      Alert.alert("Password terlalu pendek", "Minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password tidak sama", "Konfirmasi password harus sama.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Berhasil", "Password berhasil diganti.");
    } catch (err) {
      Alert.alert("Gagal mengganti password", errText(err, "Coba lagi."));
    } finally {
      setSavingPassword(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Keluar dari akun admin?",
      "Kamu perlu login lagi untuk membuka portal admin.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut({ scope: "local" });
            if (error) {
              Alert.alert("Gagal keluar", error.message);
              return;
            }
            router.replace("/login");
          },
        },
      ],
    );
  }

  const initial = (savedName || email || "A").trim().charAt(0).toUpperCase();
  const nameChanged = name.trim() !== savedName.trim();

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable
          style={s.headerBack}
          onPress={() => router.replace("/admin-dashboard")}
          accessibilityLabel="Kembali"
        >
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Profil Admin</Text>
          <Text style={s.headerSubtitle}>Kelola akun administrator</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : errorMessage ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={34} color={DANGER} />
          <Text style={s.helper}>{errorMessage}</Text>
          <Pressable style={s.primary} onPress={() => void load()}>
            <Text style={s.primaryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.hero}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
              <Text style={s.heroName}>{savedName || "Administrator"}</Text>
              <Text style={s.heroEmail}>{email || "Email tidak tersedia"}</Text>
              <View style={s.roleBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color={DARK_GREEN}
                />
                <Text style={s.roleText}>Admin</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Informasi akun</Text>
              <Text style={s.label}>Nama lengkap</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Nama admin"
                placeholderTextColor="#9AA8A3"
                autoCapitalize="words"
              />
              <Text style={s.label}>Email (tidak dapat diubah di sini)</Text>
              <View
                style={[
                  s.input,
                  { justifyContent: "center", backgroundColor: "#F1F4F2" },
                ]}
              >
                <Text style={{ color: MUTED, fontSize: 14 }}>{email}</Text>
              </View>
              <Pressable
                style={[
                  s.primary,
                  (!nameChanged || savingName) && { opacity: 0.5 },
                ]}
                disabled={!nameChanged || savingName}
                onPress={() => void handleSaveName()}
              >
                {savingName ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.primaryText}>Simpan Nama</Text>
                )}
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Ubah password</Text>
              <Text style={s.label}>Password baru</Text>
              <View style={s.passRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimal 8 karakter"
                  placeholderTextColor="#9AA8A3"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  style={s.eye}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel="Tampilkan password"
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={MUTED}
                  />
                </Pressable>
              </View>
              <Text style={s.label}>Konfirmasi password</Text>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor="#9AA8A3"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={[
                  s.primary,
                  (!newPassword || savingPassword) && { opacity: 0.5 },
                ]}
                disabled={!newPassword || savingPassword}
                onPress={() => void handleChangePassword()}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.primaryText}>Ganti Password</Text>
                )}
              </Pressable>
            </View>

            <Pressable style={s.logout} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={20} color={DANGER} />
              <Text style={s.logoutText}>Keluar</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* NAVIGASI BAWAH ADMIN */}
      <View style={s.bottomNav}>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-dashboard")}
        >
          <Ionicons name="home-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Beranda</Text>
        </Pressable>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-nutritionists")}
        >
          <Ionicons name="people-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Ahli Gizi</Text>
        </Pressable>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-schedule")}
        >
          <Ionicons name="calendar-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Jadwal</Text>
        </Pressable>
        <Pressable style={s.navItem} onPress={() => {}}>
          <View style={s.navActiveIcon}>
            <Ionicons name="person" size={22} color={DARK_GREEN} />
          </View>
          <Text style={s.navActiveText}>Profil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDEB",
  },
  headerBack: { width: 36, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  headerSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  content: { padding: 16, paddingBottom: 28 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  helper: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: "center" },
  hero: { alignItems: "center", paddingVertical: 18, gap: 4 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#DDF8EA",
    borderWidth: 3,
    borderColor: "#B0E8CD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarText: { color: DARK_GREEN, fontSize: 32, fontWeight: "800" },
  heroName: { fontSize: 18, fontWeight: "800", color: TEXT },
  heroEmail: { fontSize: 12, color: MUTED },
  roleBadge: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#CBF7E1",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  roleText: { fontSize: 11, fontWeight: "800", color: DARK_GREEN },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DCEFE7",
    padding: 15,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: TEXT, marginBottom: 2 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E1E8E4",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
    backgroundColor: "#FFFFFF",
  },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eye: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 24,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  logout: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#F0C9CB",
    backgroundColor: "#FFF5F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  logoutText: { color: DANGER, fontSize: 14, fontWeight: "800" },
  bottomNav: {
    flexDirection: "row",
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#E8ECE8",
    paddingHorizontal: 15,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  navActiveIcon: {
    width: 64,
    height: 35,
    borderRadius: 22,
    backgroundColor: MINT,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: { fontSize: 11, fontWeight: "600", color: MUTED },
  navActiveText: { fontSize: 11, fontWeight: "800", color: DARK_GREEN },
});
