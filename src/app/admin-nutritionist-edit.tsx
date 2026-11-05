import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabase";

type Practitioner = {
  id: string;
  display_name: string;
  specialty: string;
  bio: string | null;
  photo_key: string | null;
  photo_storage_path: string | null;
  education_formal: string | null;
  license_number: string | null;
  experience_years: number | null;
  session_minutes: number | null;
  price_idr: number | null;
  is_active: boolean;
  is_verified: boolean;
  is_demo: boolean;
};

type PhotoSelection = { uri: string; mime: "image/jpeg" | "image/png"; base64: string };

const GREEN = "#087A55";
const DARK = "#114938";
const TEXT = "#1E322B";
const MUTED = "#75857C";
const BG = "#F8F7FC";
const BORDER = "#E1EAE5";

const SPECIALTIES = [
  "Nutrisi Klinis & Diet Sehat",
  "Manajemen Obesitas & Sindrom Metabolik",
  "Gizi Ibu dan Anak",
  "Gizi Olahraga",
  "Gizi Penyakit Kronis",
  "Gizi Umum",
];

function getPhotoSource(expert: Practitioner): ImageSourcePropType | null {
  if (expert.photo_storage_path?.trim()) {
    const { data } = supabase.storage
      .from("nutritionist-photos")
      .getPublicUrl(expert.photo_storage_path.trim());
    return { uri: data.publicUrl };
  }
  if (expert.photo_key === "male") return require("../../assets/images/dokterL.png");
  if (expert.photo_key === "female") return require("../../assets/images/dokterP.png");
  return null;
}

function displayMoney(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

type EntryProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  required?: boolean;
  hint?: string;
};

function Entry({
  label, value, onChangeText, placeholder, maxLength, keyboardType,
  autoCapitalize, multiline, required, hint,
}: EntryProps) {
  return (
    <View style={s.entryGroup}>
      <Text style={s.entryLabel}>{label}{required ? <Text style={s.asterisk}> *</Text> : null}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        placeholder={placeholder}
        placeholderTextColor="#9EABA4"
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        editable
      />
      {hint ? <Text style={s.helpText}>{hint}</Text> : null}
    </View>
  );
}

export default function AdminNutritionistEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const expertId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [expert, setExpert] = useState<Practitioner | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [selectingSpecialty, setSelectingSpecialty] = useState(false);
  const [education, setEducation] = useState("");
  const [license, setLicense] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("30");
  const [priceIdr, setPriceIdr] = useState("50000");
  const [newPhoto, setNewPhoto] = useState<PhotoSelection | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    if (!expertId) {
      setLoadError("ID ahli gizi tidak ditemukan. Buka dari halaman Kelola Ahli Gizi.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data: roleData, error: roleError } = await supabase
        .from("profiles").select("role").eq("id", userData.user.id).single();
      if (roleError) throw roleError;
      if (roleData?.role !== "admin") throw new Error("Halaman Edit hanya dapat dibuka oleh Admin.");

      const { data, error } = await supabase
        .from("nutritionists")
        .select("id, display_name, specialty, bio, photo_key, photo_storage_path, education_formal, license_number, experience_years, session_minutes, price_idr, is_active, is_verified, is_demo")
        .eq("id", expertId)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Data ahli gizi tidak ditemukan.");
      const item = data as Practitioner;
      setExpert(item);
      setFullName(item.display_name ?? "");
      setSpecialty(item.specialty ?? "");
      setEducation(item.education_formal ?? "");
      setLicense(item.license_number ?? "");
      setExperience(item.experience_years == null ? "" : String(item.experience_years));
      setBio(item.bio ?? "");
      setSessionMinutes(String(item.session_minutes ?? 30));
      setPriceIdr(String(item.price_idr ?? 50000));
      setNewPhoto(null);
      setImageFailed(false);

      // Email hanya dibaca. Mengubah email login perlu alur verifikasi terpisah.
      const { data: emailData, error: emailError } = await supabase.rpc(
        "admin_get_nutritionist_email", { p_nutritionist_id: expertId }
      );
      if (emailError) {
        console.warn("Email login belum dapat dibaca:", emailError.message);
        setLoginEmail("");
      } else {
        setLoginEmail(typeof emailData === "string" ? emailData : "");
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Gagal memuat data ahli gizi.");
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => { void load(); }, [load]);

  const oldPhoto = useMemo(() => expert ? getPhotoSource(expert) : null, [expert]);
  const photoSource: ImageSourcePropType | null = newPhoto
    ? { uri: newPhoto.uri }
    : imageFailed ? null : oldPhoto;

  async function choosePhoto() {
    if (saving) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Akses galeri dibutuhkan", "Izinkan akses foto agar Admin bisa mengganti foto praktisi.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const selected = result.assets[0];
      if (!selected.base64) throw new Error("Foto tidak dapat dibaca. Coba gambar JPG/PNG lain.");
      if ((selected.fileSize ?? 0) > 2 * 1024 * 1024 || selected.base64.length > 2800000) {
        throw new Error("Ukuran foto maksimal 2 MB. Pilih atau kompres gambar terlebih dahulu.");
      }
      const mime: "image/jpeg" | "image/png" = selected.mimeType === "image/png" ? "image/png" : "image/jpeg";
      setNewPhoto({ uri: selected.uri, base64: selected.base64, mime });
      setImageFailed(false);
    } catch (error) {
      Alert.alert("Gagal memilih foto", error instanceof Error ? error.message : "Silakan coba lagi.");
    }
  }

  async function saveChanges() {
    if (!expert || saving) return;
    const name = fullName.trim();
    const field = specialty.trim();
    const yearsText = experience.trim();
    const years = yearsText === "" ? null : Number(yearsText);
    const minutes = Number(sessionMinutes.trim());
    const price = Number(priceIdr.replace(/[^0-9]/g, ""));

    if (name.length < 3 || !field) {
      Alert.alert("Form belum lengkap", "Nama lengkap dan spesialisasi wajib diisi.");
      return;
    }
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) {
      Alert.alert("Pengalaman tidak valid", "Isi pengalaman dalam tahun antara 0–60, atau kosongkan.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 180) {
      Alert.alert("Durasi tidak valid", "Durasi konsultasi harus antara 15–180 menit.");
      return;
    }
    if (!Number.isInteger(price) || price < 1000 || price > 5000000) {
      Alert.alert("Tarif tidak valid", "Isi tarif antara Rp1.000–Rp5.000.000 tanpa simbol Rp.");
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Sesi Admin telah berakhir. Silakan login ulang.");
      }
      const { data, error } = await supabase.functions.invoke("admin-update-nutritionist", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: {
          nutritionist_id: expert.id,
          display_name: name,
          specialty: field,
          education_formal: education.trim() || null,
          license_number: license.trim() || null,
          experience_years: years,
          bio: bio.trim() || null,
          session_minutes: minutes,
          price_idr: price,
          photo_base64: newPhoto?.base64 ?? null,
          photo_mime: newPhoto?.mime ?? null,
        },
      });
      if (error) {
        let message = error.message;
        const context = "context" in error ? error.context : null;
        if (context && typeof context === "object" && "json" in context) {
          try {
            const payload = await (context as Response).json();
            if (payload && typeof payload.error === "string") message = payload.error;
          } catch { /* pertahankan pesan awal */ }
        }
        throw new Error(message);
      }
      if (!data?.success) throw new Error(data?.error || "Server tidak mengonfirmasi perubahan.");

      const title = data.verification_reset
        ? "Profil tersimpan • perlu verifikasi ulang"
        : "Profil berhasil diperbarui";
      const extra = data.profile_sync_warning
        ? "Nama di tabel profiles belum tersinkron. Periksa Supabase."
        : "Perubahan akan terlihat setelah halaman lain memuat ulang datanya.";
      Alert.alert(title, extra, [
        {
          text: "Lihat Detail",
          onPress: () => router.replace({
            pathname: "/admin-nutritionist-detail", params: { id: expert.id },
          }),
        },
      ]);
    } catch (error) {
      Alert.alert("Gagal menyimpan perubahan", error instanceof Error ? error.message : "Coba kembali.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={s.muted}>Memuat profil ahli gizi...</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !expert) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="alert-circle-outline" size={37} color="#B56B29" />
        <Text style={s.errorTitle}>Halaman Edit belum dapat dibuka</Text>
        <Text style={s.mutedCentered}>{loadError || "Data ahli gizi tidak ditemukan."}</Text>
        <Pressable style={s.submit} onPress={() => void load()}>
          <Text style={s.submitText}>Coba Lagi</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}><Text style={s.link}>Kembali</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} disabled={saving} style={s.back} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={DARK} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Edit Profil Ahli Gizi</Text>
            <Text style={s.headerSubtitle}>Perbarui informasi praktisi NutriCare AI</Text>
          </View>
          <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <LinearGradient colors={["#E5FAF0", "#FFFFFF"]} style={s.previewCard}>
            <View style={s.previewPhotoRing}>
              {photoSource ? (
                <Image
                  source={photoSource}
                  style={s.previewPhoto}
                  onError={() => { if (!newPhoto) setImageFailed(true); }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-outline" size={40} color={GREEN} />
              )}
            </View>
            <Text style={s.previewName} numberOfLines={2}>{fullName || "Nama Praktisi"}</Text>
            <Text style={s.previewSpecialty}>{specialty || "Spesialisasi belum diisi"}</Text>
            <View style={s.statusRow}>
              <View style={[s.statusPill, expert.is_active ? s.activePill : s.inactivePill]}>
                <Ionicons name="ellipse" size={7} color={expert.is_active ? GREEN : "#8B9995"} />
                <Text style={s.statusText}>{expert.is_active ? "Akun Aktif" : "Akun Nonaktif"}</Text>
              </View>
              <View style={[s.statusPill, s.verifyPill]}>
                <Ionicons name="shield-checkmark-outline" color={GREEN} size={13} />
                <Text style={s.statusText}>{expert.is_verified && !expert.is_demo ? "Verifikasi tercatat" : "Belum diverifikasi"}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={s.card}>
            <View style={s.sectionHeading}>
              <View style={s.sectionIcon}><Ionicons name="camera-outline" size={21} color={GREEN} /></View>
              <Text style={s.sectionTitle}>Foto Profil</Text>
              <Text style={s.optional}>Opsional</Text>
            </View>
            <Text style={s.helpText}>Ganti foto jika diperlukan. Format JPG/PNG, maksimal 2 MB.</Text>
            <Pressable style={s.outlineButton} onPress={() => void choosePhoto()} disabled={saving}>
              <Ionicons name="cloud-upload-outline" size={18} color={DARK} />
              <Text style={s.outlineButtonText}>{newPhoto ? "Pilih Foto Lain" : "Ganti Foto Profil"}</Text>
            </Pressable>
            {newPhoto ? (
              <Pressable onPress={() => setNewPhoto(null)} disabled={saving} style={s.textButton}>
                <Text style={s.link}>Batalkan penggantian foto</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={s.card}>
            <View style={s.sectionHeading}>
              <View style={s.sectionIcon}><Ionicons name="person-outline" size={20} color={GREEN} /></View>
              <Text style={s.sectionTitle}>Informasi Akun</Text>
            </View>
            <View style={s.divider} />
            <Entry label="Nama Lengkap & Gelar" required value={fullName} onChangeText={setFullName} placeholder="Nama dan gelar ahli gizi" maxLength={120} />
            <Text style={s.entryLabel}>Email Login Praktisi</Text>
            <View style={s.readOnlyRow}>
              <Ionicons name="mail-outline" size={17} color={MUTED} />
              <Text style={s.readOnlyText}>{loginEmail || "Email belum tersedia"}</Text>
              <Ionicons name="lock-closed-outline" size={15} color={MUTED} />
            </View>
            <Text style={s.helpText}>Email tidak diubah di halaman ini, agar akun login tetap aman.</Text>
            <View style={s.readOnlyRow}>
              <Ionicons name="toggle-outline" size={17} color={GREEN}/>
              <Text style={s.readOnlyText}>Status akun: {expert.is_active ? "Aktif" : "Nonaktif"}</Text>
            </View>
            <Text style={s.helpText}>Aktif/nonaktifkan akun melalui halaman Detail supaya booking mendatang tetap terlindungi.</Text>
          </View>

          <View style={s.card}>
            <View style={s.sectionHeading}>
              <View style={s.sectionIcon}><Ionicons name="medkit-outline" size={20} color={GREEN} /></View>
              <Text style={s.sectionTitle}>Informasi Profesional</Text>
            </View>
            <View style={s.divider}/>
            <Text style={s.entryLabel}>Bidang Spesialisasi <Text style={s.asterisk}>*</Text></Text>
            <Pressable style={s.selectField} onPress={() => setSelectingSpecialty((value) => !value)}>
              <Text style={s.selectText}>{specialty || "Pilih spesialisasi"}</Text>
              <Ionicons name={selectingSpecialty ? "chevron-up" : "chevron-down"} size={18} color={DARK} />
            </Pressable>
            {selectingSpecialty ? (
              <View style={s.selectOptions}>
                {[...new Set([specialty, ...SPECIALTIES].filter(Boolean))].map((option) => (
                  <Pressable
                    key={option}
                    style={s.selectOption}
                    onPress={() => { setSpecialty(option); setSelectingSpecialty(false); }}
                  >
                    <Text style={s.selectOptionText}>{option}</Text>
                    {specialty === option ? <Ionicons name="checkmark" size={18} color={GREEN} /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Entry label="Pendidikan Formal" value={education} onChangeText={setEducation} placeholder="Contoh: S1 Ilmu Gizi, Profesi Dietisien" maxLength={500}/>
            <Entry label="Nomor STR / Lisensi" value={license} onChangeText={setLicense} placeholder="Isi berdasarkan dokumen asli, atau kosongkan" maxLength={120} autoCapitalize="characters"/>
            <Entry label="Pengalaman (Tahun)" value={experience} onChangeText={setExperience} placeholder="Contoh: 5" maxLength={2} keyboardType="number-pad"/>
            <Entry label="Deskripsi Singkat Profil" value={bio} onChangeText={setBio} placeholder="Ringkasan keahlian dan pendekatan konsultasi..." maxLength={300} multiline hint={`${bio.length}/300 karakter`}/>
          </View>

          <View style={s.card}>
            <View style={s.sectionHeading}>
              <View style={s.sectionIcon}><Ionicons name="chatbox-ellipses-outline" size={20} color={GREEN}/></View>
              <Text style={s.sectionTitle}>Pengaturan Konsultasi</Text>
            </View>
            <View style={s.divider}/>
            <Entry label="Durasi Sesi (Menit)" required value={sessionMinutes} onChangeText={setSessionMinutes} placeholder="30" keyboardType="number-pad" maxLength={3}/>
            <Entry label="Tarif Konsultasi (Rp)" required value={priceIdr} onChangeText={setPriceIdr} placeholder="50000" keyboardType="number-pad" maxLength={7} hint={`Pratinjau tarif: Rp${displayMoney(Number(priceIdr.replace(/[^0-9]/g, "")) || 0)}/sesi`}/>
            <View style={s.importantNotice}>
              <Ionicons name="information-circle-outline" size={18} color="#98702C" />
              <Text style={s.importantText}>Perubahan tarif/durasi hanya untuk informasi dan slot baru. Booking lama tidak diubah.</Text>
            </View>
          </View>

          <View style={s.card}>
            <View style={s.sectionHeading}>
              <View style={s.sectionIcon}><Ionicons name="shield-checkmark-outline" size={20} color={GREEN} /></View>
              <Text style={s.sectionTitle}>Status Verifikasi</Text>
            </View>
            <Text style={s.helpText}>
              {expert.is_demo
                ? "Profil ini data simulasi. Kredensial belum terverifikasi."
                : expert.is_verified
                  ? "Status sudah tercatat. Jika nama, spesialisasi, pendidikan, atau nomor STR diubah, verifikasi akan dikembalikan menjadi belum diverifikasi."
                  : "Kredensial belum diverifikasi. Mengisi nomor STR tidak otomatis membuat profil terverifikasi."}
            </Text>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable style={[s.submit, saving && { opacity: 0.6 }]} onPress={() => void saveChanges()} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF"/> : <Ionicons name="save-outline" size={19} color="#FFFFFF"/>}
            <Text style={s.submitText}>{saving ? "Menyimpan perubahan..." : "Simpan Perubahan"}</Text>
          </Pressable>
          <Pressable style={s.cancel} onPress={() => router.back()} disabled={saving}>
            <Text style={s.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  muted: { color: MUTED },
  mutedCentered: { color: MUTED, textAlign: "center", lineHeight: 19 },
  errorTitle: { color: DARK, fontSize: 18, fontWeight: "800", textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", minHeight: 66, paddingHorizontal: 16, backgroundColor: BG, borderBottomWidth: 1, borderColor: "#EBF0ED" },
  back: { width: 40, height: 42, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  headerSubtitle: { fontSize: 11, color: MUTED, marginTop: 3 },
  adminBadge: { backgroundColor: "#E0F7EB", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  adminBadgeText: { color: GREEN, fontWeight: "800", fontSize: 10 },
  content: { padding: 16, gap: 15, paddingBottom: 24 },
  previewCard: { borderRadius: 24, padding: 22, alignItems: "center", borderColor: "#D6F0E1", borderWidth: 1 },
  previewPhotoRing: { width: 115, height: 115, borderRadius: 58, borderColor: "#7ADCB1", borderWidth: 3, justifyContent: "center", alignItems: "center", backgroundColor: "#E6F9EE", overflow: "hidden" },
  previewPhoto: { width: 109, height: 109, borderRadius: 55 },
  previewName: { fontSize: 17, fontWeight: "800", color: DARK, textAlign: "center", marginTop: 13 },
  previewSpecialty: { color: MUTED, fontSize: 12, textAlign: "center", marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 13 },
  statusPill: { flexDirection: "row", alignItems: "center", borderRadius: 24, gap: 5, paddingHorizontal: 11, paddingVertical: 7 },
  activePill: { backgroundColor: "#D9F8E8" },
  inactivePill: { backgroundColor: "#E5E8EC" },
  verifyPill: { backgroundColor: "#E8F0FB" },
  statusText: { color: DARK, fontWeight: "700", fontSize: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 23, borderColor: BORDER, borderWidth: 1, padding: 18, gap: 7 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#E7F8EF", justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: DARK, flex: 1 },
  optional: { fontSize: 11, color: MUTED },
  divider: { height: 1, backgroundColor: "#E7EEEA", marginVertical: 7 },
  entryGroup: { marginTop: 10, gap: 6 },
  entryLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 7 },
  asterisk: { color: "#D04952" },
  input: { borderRadius: 13, minHeight: 49, borderColor: "#CDDCD3", borderWidth: 1, paddingHorizontal: 12, backgroundColor: "#FFFFFF", color: TEXT, fontSize: 13 },
  inputMultiline: { minHeight: 92, paddingVertical: 12 },
  helpText: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 4 },
  readOnlyRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#F1F3FC", borderRadius: 14, padding: 13, marginTop: 6 },
  readOnlyText: { flex: 1, color: DARK, fontSize: 12, fontWeight: "600" },
  selectField: { borderRadius: 13, borderColor: "#CDDCD3", borderWidth: 1, paddingHorizontal: 13, minHeight: 51, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9, marginTop: 9 },
  selectText: { flex: 1, color: TEXT, fontSize: 13 },
  selectOptions: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, overflow: "hidden", marginTop: 5 },
  selectOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  selectOptionText: { color: TEXT, fontSize: 12, flex: 1 },
  outlineButton: { minHeight: 43, borderRadius: 22, borderWidth: 1, borderColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
  outlineButtonText: { color: GREEN, fontWeight: "800", fontSize: 12 },
  textButton: { alignItems: "center", paddingTop: 8 },
  link: { color: GREEN, fontWeight: "700", fontSize: 13 },
  importantNotice: { backgroundColor: "#FFF9EA", borderRadius: 14, padding: 12, flexDirection: "row", gap: 8, marginTop: 11 },
  importantText: { color: "#866D36", fontSize: 11, lineHeight: 17, flex: 1 },
  footer: { borderTopWidth: 1, borderTopColor: "#EBEFED", backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 10, gap: 9 },
  submit: { borderRadius: 26, minHeight: 49, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 },
  submitText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  cancel: { minHeight: 40, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EDF0FC" },
  cancelText: { color: TEXT, fontSize: 13, fontWeight: "700" },
});
