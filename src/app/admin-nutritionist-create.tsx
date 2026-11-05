import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../supabase";

const GREEN = "#087A55";
const DEEP = "#075238";
const TEXT = "#1D2C28";
const MUTED = "#798680";
const BG = "#F8F7FC";
const OUTLINE = "#DAE5DF";
const SPECIALTIES = [
  "Nutrisi Klinis & Diet Sehat",
  "Manajemen Obesitas & Sindrom Metabolik",
  "Gizi Ibu dan Anak",
  "Gizi Olahraga",
  "Gizi Penyakit Kronis",
  "Gizi Umum",
];

type PhotoChoice = {
  uri: string;
  mime: string;
  base64: string;
};

type CreatedCredential = {
  email: string;
  temporary_password: string;
};

export default function AdminNutritionistCreateScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [specialty, setSpecialty] = useState("");
  const [chooseSpecialty, setChooseSpecialty] = useState(false);
  const [education, setEducation] = useState("");
  const [license, setLicense] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<PhotoChoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [credential, setCredential] = useState<CreatedCredential | null>(null);

  async function pickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Izin dibutuhkan", "Berikan izin akses foto agar dapat memilih foto profil.");
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      if (!asset.base64) {
        Alert.alert("Foto gagal dibaca", "Coba pilih foto lain dalam format JPG atau PNG.");
        return;
      }
      if ((asset.fileSize ?? 0) > 2 * 1024 * 1024 || asset.base64.length > 2800000) {
        Alert.alert("Foto terlalu besar", "Pilih foto dengan ukuran maksimum 2 MB.");
        return;
      }
      // Gambar hasil edit bisa berformat JPEG meskipun file asal PNG.
      const mime = asset.mimeType === "image/png" ? "image/png" : "image/jpeg";
      setPhoto({ uri: asset.uri, base64: asset.base64, mime });
    } catch (error) {
      Alert.alert("Gagal memilih foto", error instanceof Error ? error.message : "Silakan coba lagi.");
    }
  }

  async function handleCreate() {
    if (saving) return;
    const name = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const years = Number(experience.trim());

    if (name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Periksa informasi akun", "Isi nama lengkap dan email login yang valid.");
      return;
    }
    if (!specialty || !education.trim() || !license.trim() || !experience.trim()) {
      Alert.alert("Form belum lengkap", "Spesialisasi, pendidikan, STR/lisensi, dan pengalaman wajib diisi.");
      return;
    }
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      Alert.alert("Pengalaman tidak valid", "Isi pengalaman dalam tahun, antara 0 sampai 60.");
      return;
    }
    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Sesi login berakhir. Silakan masuk kembali sebagai Admin.");
      }

      // Auth account created on a secure Edge Function, not via signUp() here.
      const { data, error } = await supabase.functions.invoke("admin-create-nutritionist", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: {
          display_name: name,
          email: cleanEmail,
          is_active: active,
          specialty,
          education_formal: education.trim(),
          license_number: license.trim(),
          experience_years: years,
          bio: bio.trim(),
          photo_base64: photo?.base64 ?? null,
          photo_mime: photo?.mime ?? null,
        },
      });

      if (error) {
        // FunctionsHttpError.context can contain the error body returned by Edge Function.
        let message = error.message;
        const context = "context" in error ? error.context : null;
        if (context && typeof context === "object" && "json" in context) {
          try {
            const body = await (context as Response).json();
            if (body && typeof body.error === "string") message = body.error;
          } catch { /* Keep the original error. */ }
        }
        throw new Error(message);
      }
      if (!data?.success || !data?.temporary_password || !data?.email) {
        throw new Error(data?.error || "Server tidak mengembalikan hasil pembuatan akun.");
      }
      setCredential({ email: data.email, temporary_password: data.temporary_password });
    } catch (err) {
      Alert.alert("Gagal menambah ahli gizi", err instanceof Error ? err.message : "Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (credential) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.successPage}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={GREEN} />
          </View>
          <Text style={s.successTitle}>Ahli Gizi Berhasil Dibuat!</Text>
          <Text style={s.successSub}>
            Profil dan akun login sudah tersimpan di Supabase. Berikut kata sandi sementara untuk disampaikan kepada ahli gizi secara privat.
          </Text>
          <View style={s.credentialsCard}>
            <Text style={s.fieldHint}>EMAIL LOGIN</Text>
            <Text style={s.credentialValue} selectable>{credential.email}</Text>
            <View style={s.divider} />
            <Text style={s.fieldHint}>KATA SANDI SEMENTARA • TAMPIL SEKALI</Text>
            <Text style={s.passwordValue} selectable>{credential.temporary_password}</Text>
            <Text style={s.credentialWarning}>
              Tekan lama teks untuk menyalin. Simpan dan bagikan secara aman. Aplikasi tidak mengirim email otomatis dan sandi ini tidak disimpan di perangkat.
            </Text>
          </View>
          <Pressable
            style={s.submit}
            onPress={() => { setCredential(null); router.replace("/admin-nutritionists"); }}
          >
            <Text style={s.submitText}>Selesai — Kembali ke Daftar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={s.header}>
          <Pressable onPress={() => router.back()} disabled={saving} style={s.back}>
            <Ionicons name="arrow-back" color={DEEP} size={24} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Tambah Ahli Gizi</Text>
            <Text style={s.subtitle}>Pembuatan akun praktisi baru</Text>
          </View>
          <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.notice}>
            <View style={s.noticeIcon}><Ionicons name="shield-checkmark-outline" color={GREEN} size={23} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>Portal Kredensial Medis</Text>
              <Text style={s.noticeBody}>
                Pastikan identitas dan dokumen STR/SIP yang diinput benar. Status verifikasi akan tetap menunggu pemeriksaan berkas.
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <View style={s.sectionRow}>
              <Ionicons name="person-circle-outline" color={DEEP} size={19} />
              <Text style={s.sectionTitle}>Foto Profil</Text>
              <View style={{ flex: 1 }} />
              <Text style={s.optional}>Opsional</Text>
            </View>
            <View style={s.photoFrame}>
              {photo ? <Image source={{ uri: photo.uri }} style={s.photoPreview} /> : <Ionicons name="camera-outline" color="#70818E" size={39} />}
            </View>
            <Text style={s.photoHint}>Format JPG/PNG, maksimum 2 MB</Text>
            <Pressable style={s.outlineBtn} onPress={() => void pickPhoto()} disabled={saving}>
              <Ionicons name="cloud-upload-outline" color={DEEP} size={18} />
              <Text style={s.outlineBtnText}>{photo ? "Ganti Foto" : "Unggah Foto"}</Text>
            </Pressable>
          </View>

          <View style={s.card}>
            <View style={s.sectionRow}>
              <Ionicons name="id-card-outline" color={DEEP} size={20} />
              <Text style={s.sectionTitle}>Informasi Akun (Login)</Text>
            </View>
            <View style={s.sectionLine} />
            <FormField label="Nama Lengkap & Gelar *" placeholder="Contoh: Maya Safitri, S.Gz, M.Nutr" value={fullName} onChangeText={setFullName} maxLength={120} />
            <FormField label="Email Login Praktisi *" placeholder="nama@contoh.com" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} icon="mail-outline" />
            <Text style={s.tip}>Gunakan email yang berhak dipakai praktisi. Email akan dianggap terkonfirmasi pada akun demo ini.</Text>
            <View style={s.switchArea}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>Status Akun Aktif</Text>
                <Text style={s.switchSub}>Akun dapat menerima booking jika ada jadwal</Text>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: "#CBD5D2", true: GREEN }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={s.card}>
            <View style={s.sectionRow}>
              <Ionicons name="medkit-outline" color={DEEP} size={20} />
              <Text style={s.sectionTitle}>Informasi Profesional</Text>
            </View>
            <View style={s.sectionLine} />
            <Text style={s.inputLabel}>Bidang Spesialisasi *</Text>
            <Pressable style={s.dropdown} onPress={() => setChooseSpecialty(!chooseSpecialty)}>
              <Text style={[s.dropdownText, !specialty && { color: "#9AA6A0" }]} numberOfLines={2}>
                {specialty || "Pilih Bidang Spesialisasi"}
              </Text>
              <Ionicons name={chooseSpecialty ? "chevron-up" : "chevron-down"} color={DEEP} size={18} />
            </Pressable>
            {chooseSpecialty && (
              <View style={s.options}>
                {SPECIALTIES.map((value) => (
                  <Pressable key={value} style={s.option} onPress={() => { setSpecialty(value); setChooseSpecialty(false); }}>
                    <Text style={s.optionText}>{value}</Text>
                    {specialty === value && <Ionicons name="checkmark" color={GREEN} size={17} />}
                  </Pressable>
                ))}
              </View>
            )}
            <FormField label="Pendidikan Formal *" placeholder="Contoh: S1 Gizi, Profesi Dietisien" value={education} onChangeText={setEducation} maxLength={500} />
            <FormField label="Nomor STR / Lisensi Medis *" placeholder="Masukkan sesuai dokumen resmi" value={license} onChangeText={setLicense} maxLength={120} autoCapitalize="characters" />
            <FormField label="Pengalaman (Tahun) *" placeholder="Contoh: 5" value={experience} onChangeText={setExperience} keyboardType="number-pad" maxLength={2} />
            <Text style={s.inputLabel}>Deskripsi Singkat Profil</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Ringkasan keahlian dan pendekatan konsultasi..."
              placeholderTextColor="#9BA6A1"
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={[s.tip, { textAlign: "right" }]}>{bio.length}/300 karakter</Text>
          </View>

          <View style={s.card}>
            <View style={s.sectionRow}>
              <Ionicons name="checkbox-outline" color={DEEP} size={19} />
              <Text style={s.sectionTitle}>Status Verifikasi Berkas</Text>
            </View>
            <View style={s.sectionLine} />
            <View style={s.pendingBox}>
              <Ionicons name="radio-button-on" color="#D97706" size={21} />
              <View style={{ flex: 1 }}>
                <Text style={s.pendingTitle}>Belum Diverifikasi</Text>
                <Text style={s.pendingBody}>Status awal untuk akun baru. Admin perlu meninjau dokumen sebelum menyatakan verifikasi resmi.</Text>
              </View>
            </View>
            <View style={s.disabledVerified}>
              <Ionicons name="radio-button-off" color="#A5B0AE" size={21} />
              <View style={{ flex: 1 }}>
                <Text style={s.disabledTitle}>Terverifikasi Resmi</Text>
                <Text style={s.pendingBody}>Akan tersedia setelah fitur pemeriksaan berkas dan verifikasi dibuat.</Text>
              </View>
            </View>
            <View style={s.securityMessage}>
              <Ionicons name="lock-closed-outline" color={DEEP} size={18} />
              <Text style={s.securityText}>
                Akun dibuat oleh server Supabase. Sandi sementara ditampilkan satu kali kepada Admin, bukan dikirim otomatis lewat email.
              </Text>
            </View>
            <Text style={s.tip}>Durasi sesi awal: 30 menit • Harga awal: Rp50.000. Pengaturan lengkap menyusul di halaman Edit.</Text>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable style={[s.submit, saving && { opacity: 0.65 }]} disabled={saving} onPress={() => void handleCreate()}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="person-add-outline" size={19} color="#FFFFFF" />}
            <Text style={s.submitText}>{saving ? "Menyimpan..." : "Simpan Ahli Gizi"}</Text>
          </Pressable>
          <Pressable style={s.cancel} disabled={saving} onPress={() => router.back()}>
            <Text style={s.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

function FormField({ label, value, onChangeText, placeholder, maxLength, keyboardType, autoCapitalize, autoCorrect, icon }: FormFieldProps) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={[s.input, { flex: 1, borderWidth: 0, paddingRight: 8 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0ABA5"
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
        {icon && <Ionicons name={icon} size={18} color={MUTED} style={{ marginRight: 14 }} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BG, minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 17, borderBottomWidth: 1, borderColor: "#ECEFF0" },
  back: { width: 37, height: 42, justifyContent: "center" },
  title: { fontSize: 19, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  adminBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 30, backgroundColor: "#E6F6ED" },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: GREEN },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  notice: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#E2EEE8", padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  noticeIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#D9F9E8", alignItems: "center", justifyContent: "center" },
  noticeTitle: { fontSize: 14, color: DEEP, fontWeight: "800", marginBottom: 4 },
  noticeBody: { fontSize: 12, color: MUTED, lineHeight: 18 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7ECE9", borderRadius: 23, padding: 18, gap: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  optional: { fontSize: 11, color: MUTED },
  sectionLine: { height: 1, backgroundColor: "#E7EEEA", marginTop: 7, marginBottom: 2 },
  photoFrame: { alignSelf: "center", marginTop: 8, width: 105, height: 105, borderRadius: 53, backgroundColor: "#E8EDFF", borderWidth: 2, borderColor: "#C1D3C8", borderStyle: "dashed", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photoPreview: { width: "100%", height: "100%", borderRadius: 53 },
  photoHint: { textAlign: "center", color: MUTED, fontSize: 11, marginBottom: 4 },
  outlineBtn: { minHeight: 42, borderRadius: 25, borderWidth: 1, borderColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  outlineBtnText: { color: DEEP, fontSize: 13, fontWeight: "700" },
  inputLabel: { color: TEXT, fontSize: 12, fontWeight: "600", marginBottom: 7 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 13, borderColor: "#CDDCD3", minHeight: 49, backgroundColor: "#FFFFFF" },
  input: { minHeight: 49, paddingHorizontal: 12, fontSize: 13, color: TEXT, backgroundColor: "#FFFFFF", borderRadius: 13, borderWidth: 1, borderColor: "#CDDCD3" },
  multiline: { marginTop: 2, minHeight: 90, paddingTop: 12 },
  tip: { color: MUTED, fontSize: 10, lineHeight: 16, marginTop: 4 },
  switchArea: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F3FE", borderRadius: 14, marginTop: 14, padding: 12 },
  switchTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  switchSub: { color: MUTED, fontSize: 10, marginTop: 2 },
  dropdown: { borderWidth: 1, borderColor: "#CDDCD3", borderRadius: 13, minHeight: 49, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  dropdownText: { fontSize: 13, color: TEXT, flex: 1 },
  options: { borderColor: OUTLINE, borderWidth: 1, borderRadius: 13, backgroundColor: "#FAFDFC", overflow: "hidden" },
  option: { padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: OUTLINE, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionText: { fontSize: 12, color: TEXT, flex: 1 },
  pendingBox: { borderWidth: 1, borderColor: "#F6C55E", backgroundColor: "#FFFAEF", borderRadius: 13, padding: 12, flexDirection: "row", gap: 9, marginTop: 4 },
  pendingTitle: { color: "#8C4D10", fontWeight: "700", fontSize: 13 },
  pendingBody: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 3 },
  disabledVerified: { borderWidth: 1, borderColor: OUTLINE, borderRadius: 13, padding: 12, flexDirection: "row", gap: 9, opacity: 0.7 },
  disabledTitle: { color: TEXT, fontWeight: "700", fontSize: 13 },
  securityMessage: { backgroundColor: "#F1F3FE", borderRadius: 13, padding: 12, flexDirection: "row", gap: 10, marginTop: 4 },
  securityText: { flex: 1, color: MUTED, fontSize: 11, lineHeight: 17 },
  footer: { backgroundColor: BG, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8, borderTopWidth: 1, borderColor: "#EDF1F0" },
  submit: { minHeight: 49, backgroundColor: GREEN, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancel: { minHeight: 39, backgroundColor: "#EBEEFD", borderRadius: 23, justifyContent: "center", alignItems: "center" },
  cancelText: { fontSize: 13, fontWeight: "600", color: TEXT },
  successPage: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  successIcon: { alignSelf: "center" },
  successTitle: { fontSize: 23, fontWeight: "800", color: DEEP, textAlign: "center" },
  successSub: { fontSize: 13, color: MUTED, lineHeight: 20, textAlign: "center" },
  credentialsCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: OUTLINE, gap: 9 },
  fieldHint: { fontSize: 10, fontWeight: "700", color: MUTED },
  credentialValue: { fontSize: 16, fontWeight: "700", color: DEEP },
  passwordValue: { fontSize: 20, fontWeight: "800", color: DEEP, letterSpacing: 0.5 },
  credentialWarning: { fontSize: 11, color: "#9B6819", lineHeight: 17, marginTop: 4 },
  divider: { height: 1, backgroundColor: OUTLINE, marginVertical: 8 },
});
