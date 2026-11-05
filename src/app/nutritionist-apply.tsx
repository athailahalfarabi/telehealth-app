
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
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
const DARK = "#183C2B";
const MUTED = "#72897B";
const BG = "#F7FBF8";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words";
  maxLength?: number;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "words",
  maxLength = 120,
}: FormFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.inputWrap}>
        <Ionicons
          name={icon}
          size={19}
          color={GREEN}
          style={{ marginRight: 10 }}
        />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9EADA3"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

export default function NutritionistApplyScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialty, setSpecialty] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitApplication() {
    if (submitting) return;

    const name = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const phone = whatsapp.trim().replace(/[\s()-]/g, "");
    const field = specialty.trim();

    if (name.length < 3 || name.length > 120) {
      Alert.alert(
        "Nama belum sesuai",
        "Isi nama lengkap minimal 3 karakter."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanEmail.length > 254
    ) {
      Alert.alert(
        "Email tidak valid",
        "Masukkan alamat email yang aktif."
      );
      return;
    }

    if (!/^\+?\d{8,15}$/.test(phone)) {
      Alert.alert(
        "Nomor WhatsApp tidak valid",
        "Gunakan nomor 8–15 digit, boleh diawali +62."
      );
      return;
    }

    if (field.length < 3 || field.length > 100) {
      Alert.alert(
        "Bidang keahlian belum lengkap",
        "Isi bidang keahlian minimal 3 karakter."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("nutritionist_applications")
        .insert({
          full_name: name,
          email: cleanEmail,
          whatsapp: phone,
          specialty: field,
        });

      if (error) {
        throw error;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Gagal mengirim pengajuan:", error);

      Alert.alert(
        "Pengajuan belum terkirim",
        error instanceof Error
          ? error.message
          : "Periksa koneksi internet, lalu coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.root}
      edges={["top", "bottom"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/login")}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={GREEN}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Pengajuan Mitra
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {submitted ? (
            /* HALAMAN BERHASIL */
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={60}
                  color={GREEN}
                />
              </View>

              <Text style={styles.successTitle}>
                Pengajuan Terkirim!
              </Text>

              <Text style={styles.successDesc}>
                Terima kasih sudah mengajukan kerja sama
                dengan NutriCare AI. Data kamu telah
                diterima dan akan ditinjau oleh pengelola.
              </Text>

              <View style={styles.noticeCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={GREEN}
                />

                <Text style={styles.noticeText}>
                  Pengajuan ini belum membuat akun ahli
                  gizi. Pengelola akan menghubungi kontak
                  yang kamu cantumkan jika diperlukan.
                </Text>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.primaryText}>
                  Kembali ke Login
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* HERO */}
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    name="leaf-outline"
                    size={30}
                    color={GREEN}
                  />
                </View>

                <Text style={styles.heroTitle}>
                  Bergabung dengan NutriCare AI
                </Text>

                <Text style={styles.heroSubtitle}>
                  Ingin menjadi mitra ahli gizi?
                  Isi informasi awal berikut.
                  Tim pengelola akan meninjau pengajuanmu.
                </Text>
              </View>

              {/* FORM */}
              <View style={styles.formCard}>
                <View style={styles.sectionHead}>
                  <Ionicons
                    name="person-outline"
                    color={GREEN}
                    size={20}
                  />

                  <Text style={styles.sectionTitle}>
                    Informasi Calon Mitra
                  </Text>
                </View>

                <FormField
                  label="Nama Lengkap dan Gelar"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Contoh: Nadia Prameswari, S.Gz."
                  icon="person-outline"
                  maxLength={120}
                />

                <FormField
                  label="Email Aktif"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nama@email.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={254}
                />

                <FormField
                  label="Nomor WhatsApp"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder="Contoh: 081234567890"
                  icon="logo-whatsapp"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  maxLength={20}
                />

                <FormField
                  label="Bidang Keahlian"
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="Contoh: Gizi Ibu dan Anak"
                  icon="nutrition-outline"
                  maxLength={100}
                />

                {/* INFORMASI */}
                <View style={styles.noticeCard}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    color={GREEN}
                    size={20}
                  />

                  <Text style={styles.noticeText}>
                    Informasi ini digunakan pengelola
                    untuk menindaklanjuti pengajuan.
                    Jangan masukkan password atau
                    dokumen pribadi pada formulir ini.
                  </Text>
                </View>

                {/* TOMBOL SIMPAN */}
                <Pressable
                  style={[
                    styles.primaryButton,
                    submitting && { opacity: 0.7 },
                  ]}
                  onPress={() => void submitApplication()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryText}>
                        Kirim Pengajuan
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        color="#FFFFFF"
                        size={19}
                      />
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={styles.footerText}>
                Pembuatan akun ahli gizi hanya dilakukan
                Admin setelah pemeriksaan dan persetujuan
                kerja sama.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EFE8",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E9F8EE",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: DARK,
    fontWeight: "800",
    fontSize: 16,
  },

  content: {
    padding: 19,
    paddingBottom: 36,
    flexGrow: 1,
  },

  hero: {
    backgroundColor: "#E5F8EE",
    padding: 23,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D0EFDF",
  },

  heroIcon: {
    width: 65,
    height: 65,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  heroTitle: {
    fontSize: 19,
    color: DARK,
    fontWeight: "800",
    textAlign: "center",
  },

  heroSubtitle: {
    color: "#587665",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3EEE7",
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  fieldBlock: {
    gap: 8,
  },

  fieldLabel: {
    color: DARK,
    fontSize: 12,
    fontWeight: "700",
  },

  inputWrap: {
    borderColor: "#DBEAE0",
    borderWidth: 1,
    backgroundColor: "#F9FCF9",
    minHeight: 53,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    color: DARK,
    fontSize: 13,
    flex: 1,
    paddingVertical: 11,
  },

  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#EDF9F2",
    borderRadius: 15,
    padding: 13,
    gap: 10,
    alignItems: "flex-start",
  },

  noticeText: {
    color: "#537565",
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  footerText: {
    marginTop: 17,
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 14,
  },

  successCard: {
    marginTop: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 25,
    gap: 18,
    borderWidth: 1,
    borderColor: "#D5ECDD",
    alignItems: "center",
  },

  successIcon: {
    height: 78,
    width: 78,
    borderRadius: 39,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E3F8EC",
  },

  successTitle: {
    fontSize: 21,
    color: DARK,
    fontWeight: "800",
  },

  successDesc: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
