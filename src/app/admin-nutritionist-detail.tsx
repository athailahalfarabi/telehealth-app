import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabase";

type Practitioner = {
  id: string;
  account_id: string | null;
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

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

const GREEN = "#067C56";
const DEEP = "#0B4735";
const BG = "#F8F7FD";
const INK = "#152923";
const MUTED = "#728179";
const BORDER = "#E1EAE5";

function getMonthBounds(): [string, string] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  // Kalender bulan ini dimulai dan berakhir pukul 00.00 WIB (UTC+7).
  const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600000).toISOString();
  const end = new Date(Date.UTC(year, month, 1) - 7 * 3600000).toISOString();
  return [start, end];
}

function photoSource(expert: Practitioner): ImageSourcePropType | null {
  if (expert.photo_storage_path?.trim()) {
    const { data } = supabase.storage
      .from("nutritionist-photos")
      .getPublicUrl(expert.photo_storage_path.trim());
    return { uri: data.publicUrl };
  }
  if (expert.photo_key === "male") {
    return require("../../assets/images/dokterL.png");
  }
  if (expert.photo_key === "female") {
    return require("../../assets/images/dokterP.png");
  }
  return null;
}

function Field({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={s.fieldRow}>
      <View style={s.fieldIcon}>
        <Ionicons name={icon} size={20} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.fieldLabel}>{title}</Text>
        <Text style={s.fieldValue}>{value}</Text>
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.navItem} accessibilityRole="button">
      <View style={[s.navIcon, active && s.navIconActive]}>
        <Ionicons name={icon} size={22} color={active ? DEEP : "#7D9189"} />
      </View>
      <Text style={[s.navLabel, active && s.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminNutritionistDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const practitionerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [expert, setExpert] = useState<Practitioner | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDetail = useCallback(async (isRefresh = false) => {
    if (!practitionerId) {
      setErrorMessage("ID ahli gizi tidak ditemukan. Buka dari halaman Kelola Ahli Gizi.");
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        router.replace("/login");
        return;
      }
      const { data: actor, error: actorError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      if (actorError) throw actorError;
      if (actor?.role !== "admin") {
        throw new Error("Hanya Admin yang boleh membuka halaman ini.");
      }

      const { data: practitioner, error: practitionerError } = await supabase
        .from("nutritionists")
        .select("id, account_id, display_name, specialty, bio, photo_key, photo_storage_path, education_formal, license_number, experience_years, session_minutes, price_idr, is_active, is_verified, is_demo")
        .eq("id", practitionerId)
        .single();
      if (practitionerError) throw practitionerError;
      if (!practitioner) throw new Error("Data ahli gizi tidak ditemukan.");
      setExpert(practitioner as Practitioner);

      const [start, end] = getMonthBounds();
      const { data: slotRows, error: slotError } = await supabase
        .from("consultation_slots")
        .select("id, starts_at, ends_at, is_booked")
        .eq("nutritionist_id", practitionerId)
        .gte("starts_at", start)
        .lt("starts_at", end)
        .order("starts_at", { ascending: true });
      if (slotError) throw slotError;
      setSlots((slotRows ?? []) as Slot[]);

      // Email login dibaca dari fungsi khusus Admin, bukan membuka auth.users ke aplikasi.
      const { data: loginEmail, error: emailError } = await supabase.rpc(
        "admin_get_nutritionist_email",
        { p_nutritionist_id: practitionerId }
      );
      if (emailError) {
        console.warn("Email login praktisi belum dapat dibaca:", emailError.message);
        setEmail(null);
      } else {
        setEmail(typeof loginEmail === "string" ? loginEmail : null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat detail ahli gizi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [practitionerId]);

  useFocusEffect(useCallback(() => {
    void loadDetail();
  }, [loadDetail]));

  const monthStats = useMemo(() => {
    const booked = slots.filter((item) => item.is_booked === true).length;
    const available = slots.length - booked;
    const uniqueDays = Array.from(new Set(slots.map((item) =>
      new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long" }).format(new Date(item.starts_at))
    )));
    const earliest = slots.length > 0 ? slots[0].starts_at : null;
    return { booked, available, uniqueDays, earliest };
  }, [slots]);

  const profilePhoto = expert ? photoSource(expert) : null;
  const nextStatus = expert ? !expert.is_active : false;

  async function updateStatus() {
    if (!expert || savingStatus) return;
    setSavingStatus(true);
    try {
      const { data, error } = await supabase.rpc("admin_set_nutritionist_active", {
        p_nutritionist_id: expert.id,
        p_is_active: !expert.is_active,
      });
      if (error) throw error;
      if (typeof data !== "boolean") throw new Error("Respons perubahan status tidak valid.");
      setExpert((current) => current ? { ...current, is_active: data } : current);
      setConfirmVisible(false);
      Alert.alert("Status berhasil diperbarui", data
        ? "Akun ahli gizi telah diaktifkan untuk daftar praktisi."
        : "Akun ahli gizi sudah dinonaktifkan. Data konsultasi lama tetap tersimpan.");
    } catch (error) {
      Alert.alert(
        "Tidak dapat mengubah status",
        error instanceof Error ? error.message : "Periksa fungsi Admin di Supabase."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  function unfinishedAction(name: string) {
    Alert.alert(name, "Halaman ini kita buat pada tahap berikutnya. Data ahli gizi tidak diubah.");
  }

  if (loading) {
    return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={GREEN}/><Text style={s.muted}>Memuat detail ahli gizi...</Text></SafeAreaView>;
  }

  if (errorMessage || !expert) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="alert-circle-outline" size={38} color="#BA6B2D" />
        <Text style={s.errorTitle}>Detail ahli gizi belum dapat dimuat</Text>
        <Text style={s.errorDescription}>{errorMessage || "Data tidak tersedia."}</Text>
        <Pressable style={s.primaryButton} onPress={() => void loadDetail()}><Text style={s.whiteButtonText}>Coba Lagi</Text></Pressable>
        <Pressable onPress={() => router.replace("/admin-nutritionists")}><Text style={s.link}>Kembali ke daftar</Text></Pressable>
      </SafeAreaView>
    );
  }

  const filledEducation = expert.education_formal?.trim() || "Belum dicantumkan";
  const filledLicense = expert.license_number?.trim() || "Belum dicantumkan";
  const years = expert.experience_years;
  const filledExperience = years === null || years === undefined
    ? "Belum dicantumkan"
    : `${years} tahun pengalaman praktik`;

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.replace("/admin-nutritionists")}
          accessibilityRole="button" accessibilityLabel="Kembali ke Kelola Ahli Gizi">
          <Ionicons name="arrow-back" size={24} color={DEEP} />
        </Pressable>
        <Text style={s.headerTitle}>Detail Ahli Gizi</Text>
        <Pressable style={s.more} onPress={() => unfinishedAction("Menu opsi lain")} accessibilityRole="button">
          <Ionicons name="ellipsis-vertical" size={20} color={DEEP}/>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDetail(true)} colors={[GREEN]} tintColor={GREEN}/>}
      >
        <LinearGradient colors={["#FFFFFF", "#E1FBF0", "#FFFFFF"]} style={s.hero}>
          <View style={s.photoRing}>
            {profilePhoto ? (
              <Image source={profilePhoto} style={s.avatar} resizeMode="cover" />
            ) : (
              <Ionicons name="person-outline" color={GREEN} size={53}/>
            )}
            {expert.is_verified && !expert.is_demo && (
              <View style={s.verifiedDot}><Ionicons name="checkmark" size={13} color="#FFFFFF" /></View>
            )}
          </View>
          <Text style={s.name}>{expert.display_name}</Text>
          <Text style={s.specialty}>{expert.specialty || "Spesialisasi belum dicantumkan"}</Text>
          <View style={s.badges}>
            <View style={[s.badge, expert.is_active ? s.badgeGreen : s.badgeGrey]}>
              <View style={[s.smallDot, { backgroundColor: expert.is_active ? GREEN : "#87969A" }]}/>
              <Text style={s.badgeText}>{expert.is_active ? "Akun Aktif" : "Akun Nonaktif"}</Text>
            </View>
            <View style={[s.badge, expert.is_verified && !expert.is_demo ? s.badgeGreen : s.badgeGold]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={DEEP}/>
              <Text style={s.badgeText}>{expert.is_verified && !expert.is_demo ? "Status Verifikasi Dicatat" : "Belum Terverifikasi"}</Text>
            </View>
          </View>
          <View style={s.contactRow}>
            <Ionicons name="mail-outline" size={15} color={DEEP}/>
            <Text style={s.contactText} numberOfLines={2}>{email || "Email login belum tersedia"}</Text>
            <Text style={s.idText}>ID: {expert.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          {expert.is_demo && <Text style={s.demoNote}>Profil simulasi — data kredensial tidak diverifikasi sebagai dokumen resmi.</Text>}
        </LinearGradient>

        <View style={s.card}>
          <View style={s.titleRow}>
            <View style={s.titleIcon}><Ionicons name="school-outline" size={20} color={DEEP}/></View>
            <Text style={s.cardTitle}>Pendidikan & Lisensi</Text>
          </View>
          <Field icon="school-outline" title="Pendidikan formal" value={filledEducation}/>
          <View style={s.divider}/>
          <Field icon="id-card-outline" title="Nomor STR / Lisensi" value={filledLicense}/>
          <View style={s.divider}/>
          <Field icon="briefcase-outline" title="Pengalaman praktik" value={filledExperience}/>
          {expert.bio?.trim() ? (
            <>
              <View style={s.divider}/>
              <Field icon="document-text-outline" title="Deskripsi profesional" value={expert.bio.trim()}/>
            </>
          ) : null}
          {!expert.is_verified && (
            <Text style={s.credentialNotice}>Nomor STR yang tercatat belum berarti dokumen sudah diverifikasi.</Text>
          )}
        </View>

        <View style={s.card}>
          <View style={s.titleRow}>
            <View style={s.titleIcon}><Ionicons name="calendar-outline" size={19} color={DEEP}/></View>
            <Text style={s.cardTitle}>Jadwal & Kuota Praktik</Text>
            <View style={[s.tinyStatus, { backgroundColor: expert.is_active ? "#C8F8E1" : "#E8EAEE" }]}>
              <Text style={s.tinyStatusText}>{expert.is_active ? "Aktif" : "Nonaktif"}</Text>
            </View>
          </View>
          <View style={s.scheduleTwoCols}>
            <View style={s.infoTile}>
              <Text style={s.tileLabel}>Hari terjadwal bulan ini</Text>
              <Text style={s.tileValue} numberOfLines={3}>{monthStats.uniqueDays.length ? monthStats.uniqueDays.join(", ") : "Belum ada jadwal"}</Text>
            </View>
            <View style={s.infoTile}>
              <Text style={s.tileLabel}>Jumlah slot bulan ini</Text>
              <Text style={s.tileBigValue}>{slots.length}</Text>
              <Text style={s.tileSmallText}>slot tercatat</Text>
            </View>
          </View>
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <Text style={s.progressTitle}>Total jadwal terdaftar</Text>
              <Text style={s.progressTitle}>{slots.length} slot bulan ini</Text>
            </View>
            <View style={s.progressRail}>
              <View style={[s.progressFill, { width: `${slots.length ? monthStats.available / slots.length * 100 : 0}%` as `${number}%` }]}/>
            </View>
            <View style={s.progressLegend}>
              <Text style={s.legendText}>● {monthStats.available} Tersedia</Text>
              <Text style={s.legendText}>● {monthStats.booked} Terbooking</Text>
            </View>
          </View>
          {slots.length === 0 && <Text style={s.scheduleHint}>Admin belum menambahkan slot pada bulan ini. Tidak ada jadwal contoh yang ditampilkan.</Text>}
        </View>

        <Pressable style={s.primaryButton} 
onPress={() =>
  router.push({
    pathname: "/admin-nutritionist-edit",
    params: { id: expert.id },
  })
}>
          <Ionicons name="pencil-outline" size={19} color="#FFFFFF"/>
          <Text style={s.whiteButtonText}>Edit Profil Ahli Gizi</Text>
        </Pressable>
        <Pressable style={s.secondaryButton} onPress={() => unfinishedAction("Kelola Jadwal Praktik")}>
          <Ionicons name="calendar-outline" size={19} color={DEEP}/>
          <Text style={s.secondaryButtonText}>Kelola Jadwal Praktik</Text>
        </Pressable>
        <Pressable style={[s.dangerButton, !expert.is_active && s.enableButton]} onPress={() => setConfirmVisible((value) => !value)}>
          <Ionicons name={expert.is_active ? "pause-circle-outline" : "checkmark-circle-outline"} size={22} color={expert.is_active ? "#BD343B" : GREEN}/>
          <View style={{ flex: 1 }}>
            <Text style={[s.dangerTitle, !expert.is_active && { color: DEEP }]}>{expert.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}</Text>
            <Text style={s.dangerSubtitle}>{expert.is_active ? "Akun akan disembunyikan dari daftar Pasien" : "Akun akan tersedia dalam daftar Pasien"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={expert.is_active ? "#BD343B" : DEEP}/>
        </Pressable>

        {confirmVisible && (
          <View style={s.confirmCard}>
            <View style={s.confirmHeader}>
              <Ionicons name="alert-circle-outline" size={27} color={expert.is_active ? "#C92D35" : GREEN}/>
              <Text style={s.confirmTitle}>Konfirmasi Status</Text>
            </View>
            <Text style={s.confirmQuestion}>{expert.is_active ? "Nonaktifkan" : "Aktifkan"} akun {expert.display_name}?</Text>
            <Text style={s.confirmInfo}>
              {expert.is_active
                ? "Akun tidak tampil di pencarian Pasien. Riwayat tetap tersimpan. Jika ada booking mendatang yang belum selesai, perubahan akan ditolak sampai booking ditangani. Sistem tidak memindahkan sesi otomatis."
                : "Akun dapat tampil di daftar Pasien lagi. Verifikasi kredensial tetap mengikuti status yang tercatat."}
            </Text>
            <View style={s.confirmActions}>
              <Pressable style={s.cancelButton} onPress={() => setConfirmVisible(false)} disabled={savingStatus}>
                <Text style={s.cancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[s.confirmButton, nextStatus && { backgroundColor: GREEN }]} onPress={() => void updateStatus()} disabled={savingStatus}>
                {savingStatus ? <ActivityIndicator size="small" color="#FFFFFF"/> : <Text style={s.confirmButtonText}>{nextStatus ? "Ya, Aktifkan" : "Ya, Nonaktifkan"}</Text>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.bottomNav}>
        <NavItem label="Beranda" icon="home-outline" onPress={() => router.replace("/admin-dashboard")}/>
        <NavItem label="Ahli Gizi" icon="people-outline" active onPress={() => router.replace("/admin-nutritionists")}/>
        <NavItem label="Jadwal" icon="calendar-outline" onPress={() => unfinishedAction("Kelola Jadwal")}/>
        <NavItem label="Profil" icon="person-outline" onPress={() => unfinishedAction("Profil Admin")}/>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  muted: { color: MUTED, fontSize: 13 },
  errorTitle: { fontSize: 17, color: DEEP, fontWeight: "800", textAlign: "center" },
  errorDescription: { fontSize: 12, color: MUTED, textAlign: "center" },
  link: { color: GREEN, fontWeight: "700", marginTop: 8 },
  header: { minHeight: 62, backgroundColor: BG, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderColor: "#E7ECEB" },
  back: { width: 42, height: 45, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 19, color: INK, fontWeight: "800" },
  more: { width: 36, height: 42, justifyContent: "center", alignItems: "flex-end" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 17, paddingTop: 14, paddingBottom: 32, gap: 15 },
  hero: { borderRadius: 30, borderWidth: 1, borderColor: BORDER, padding: 21, alignItems: "center", overflow: "hidden" },
  photoRing: { width: 116, height: 116, backgroundColor: "#E3F7EC", borderWidth: 3, borderColor: "#C3E7D5", borderRadius: 58, justifyContent: "center", alignItems: "center" },
  avatar: { width: 108, height: 108, borderRadius: 54 },
  verifiedDot: { position: "absolute", right: 1, bottom: 2, width: 22, height: 22, backgroundColor: GREEN, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  name: { color: INK, fontWeight: "800", fontSize: 19, textAlign: "center", marginTop: 13 },
  specialty: { color: DEEP, fontSize: 12, textAlign: "center", marginTop: 5, lineHeight: 18 },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 16 },
  badge: { borderRadius: 40, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 },
  badgeGreen: { backgroundColor: "#C7F6DF" },
  badgeGrey: { backgroundColor: "#E7EBF2" },
  badgeGold: { backgroundColor: "#FFF1D5" },
  smallDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "800", color: DEEP },
  contactRow: { marginTop: 17, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: "#EEF1FC", borderRadius: 30, flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "stretch", flexWrap: "wrap", justifyContent: "center" },
  contactText: { fontSize: 11, color: DEEP, flexShrink: 1 },
  idText: { fontSize: 9, color: GREEN, fontWeight: "800" },
  demoNote: { color: "#8B6B29", fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 15 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 27, borderWidth: 1, borderColor: BORDER, padding: 20, gap: 17 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: "#E7F7EF", justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: INK, flex: 1 },
  divider: { height: 1, backgroundColor: "#E6EBF0" },
  fieldRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  fieldIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#F1F9F4", alignItems: "center", justifyContent: "center" },
  fieldLabel: { color: MUTED, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  fieldValue: { color: INK, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  credentialNotice: { fontSize: 11, lineHeight: 17, color: "#8B6B29", backgroundColor: "#FFF9EA", padding: 10, borderRadius: 12 },
  tinyStatus: { borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  tinyStatusText: { color: DEEP, fontSize: 10, fontWeight: "800" },
  scheduleTwoCols: { flexDirection: "row", gap: 10 },
  infoTile: { flex: 1, minHeight: 91, borderRadius: 17, padding: 12, backgroundColor: "#F4F5FE", borderWidth: 1, borderColor: "#E4E6F7" },
  tileLabel: { color: MUTED, fontSize: 10 },
  tileValue: { color: INK, fontSize: 12, fontWeight: "700", marginTop: 9 },
  tileBigValue: { color: GREEN, fontSize: 24, fontWeight: "800", marginTop: 6 },
  tileSmallText: { color: MUTED, fontSize: 10 },
  progressCard: { backgroundColor: "#E4F5EE", borderRadius: 17, padding: 14, borderWidth: 1, borderColor: "#C4E9D7" },
  progressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  progressTitle: { color: DEEP, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  progressRail: { width: "100%", height: 8, borderRadius: 10, backgroundColor: "#B6DFC8", overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 10, backgroundColor: GREEN },
  progressLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  legendText: { fontSize: 10, color: DEEP, fontWeight: "700" },
  scheduleHint: { color: MUTED, fontSize: 11, lineHeight: 17 },
  primaryButton: { minHeight: 52, borderRadius: 28, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 15 },
  whiteButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  secondaryButton: { minHeight: 49, borderRadius: 27, borderWidth: 1, borderColor: GREEN, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  secondaryButtonText: { color: DEEP, fontWeight: "800", fontSize: 13 },
  dangerButton: { minHeight: 67, backgroundColor: "#FFF0F1", borderRadius: 20, borderWidth: 1, borderColor: "#F4C0C4", flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  enableButton: { backgroundColor: "#ECF8F0", borderColor: "#BBE9CF" },
  dangerTitle: { color: "#BE343B", fontSize: 13, fontWeight: "800" },
  dangerSubtitle: { color: MUTED, fontSize: 10, marginTop: 4 },
  confirmCard: { backgroundColor: "#FFFFFF", borderRadius: 20, borderColor: "#F2B7BB", borderWidth: 1, padding: 18, gap: 12 },
  confirmHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  confirmTitle: { color: INK, fontWeight: "800", fontSize: 16 },
  confirmQuestion: { color: INK, fontSize: 13 },
  confirmInfo: { color: MUTED, fontSize: 11, lineHeight: 18 },
  confirmActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18 },
  cancelText: { color: INK, fontWeight: "700" },
  confirmButton: { minHeight: 39, backgroundColor: "#C91926", borderRadius: 22, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  confirmButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  bottomNav: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderColor: BORDER, minHeight: 72, flexDirection: "row", paddingHorizontal: 12, paddingTop: 5 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navIcon: { width: 65, height: 37, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  navIconActive: { backgroundColor: "#A2F8CD" },
  navLabel: { fontSize: 10, fontWeight: "600", color: "#687F75" },
  navLabelActive: { color: DEEP, fontWeight: "800" },
});
