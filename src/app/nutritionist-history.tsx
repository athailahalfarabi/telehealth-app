import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";
import { ConsultPhoto } from "../components/ConsultFlowUI";

const GREEN = "#087B58";
const INK = "#174538";
const MUTED = "#71837C";
const BORDER = "#E4ECE8";

type ExpertInfo = { display_name: string; specialty: string; photo_key: "female" | "male" };
type HistoryItem = {
  id: string;
  patientId: string;
  patientName: string;
  startsAt: string;
  concern: string;
};
type Filter = "current" | "previous" | "all";

function wibMonthKey(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 7);
}
function dateWib(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric",
  });
}
function timeWib(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(".", ":");
}
function initials(name: string) {
  const chunks = name.trim().split(/\s+/);
  return (chunks.length > 1 ? chunks[0][0] + chunks[1][0] : name.slice(0, 2)).toUpperCase();
}

export default function NutritionistHistory() {
  const [expert, setExpert] = useState<ExpertInfo | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("current");

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErrorText("");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error("Silakan login kembali.");
        const { data: profile, error: profileError } = await supabase
          .from("profiles").select("role").eq("id", auth.user.id).single();
        if (profileError) throw profileError;
        if (profile?.role !== "nutritionist") throw new Error("Halaman ini hanya untuk ahli gizi.");

        const { data: expertData, error: expertError } = await supabase
          .from("nutritionists")
          .select("id, display_name, specialty, photo_key")
          .eq("account_id", auth.user.id).maybeSingle();
        if (expertError) throw expertError;
        if (!expertData) throw new Error("Profil ahli gizi belum terhubung.");

        const { data: bookingRows, error: bookingError } = await supabase
          .from("consultation_bookings")
          .select("id, patient_id, slot_id")
          .eq("nutritionist_id", expertData.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });
        if (bookingError) throw bookingError;
        const bookings = bookingRows ?? [];
        const slotsIds = [...new Set(bookings.map((b) => b.slot_id))];
        const patientIds = [...new Set(bookings.map((b) => b.patient_id))];
        const bookingIds = bookings.map((b) => b.id);

        let slots: Array<{ id: string; starts_at: string }> = [];
        let patients: Array<{ id: string; full_name: string | null }> = [];
        let intakes: Array<{ booking_id: string; chief_concern: string | null }> = [];
        if (slotsIds.length > 0) {
          const { data, error } = await supabase.from("consultation_slots")
            .select("id, starts_at").in("id", slotsIds);
          if (error) throw error;
          slots = data ?? [];
        }
        // Jika policy profil tidak mengizinkan nama, tetap tampilkan Pasien tanpa membocorkan ID.
        if (patientIds.length > 0) {
          const { data, error } = await supabase.from("profiles")
            .select("id, full_name").in("id", patientIds);
          if (!error) patients = data ?? [];
        }
        if (bookingIds.length > 0) {
          const { data, error } = await supabase.from("consultation_intakes")
            .select("booking_id, chief_concern").in("booking_id", bookingIds);
          if (!error) intakes = data ?? [];
        }
        const slotMap = new Map(slots.map((s) => [s.id, s]));
        const patientMap = new Map(patients.map((p) => [p.id, p]));
        const intakeMap = new Map(intakes.map((i) => [i.booking_id, i]));
        const mapped: HistoryItem[] = bookings.flatMap((booking) => {
          const slot = slotMap.get(booking.slot_id);
          if (!slot) return [];
          return [{
            id: booking.id,
            patientId: booking.patient_id,
            patientName: patientMap.get(booking.patient_id)?.full_name?.trim() || "Pasien",
            startsAt: slot.starts_at,
            concern: intakeMap.get(booking.id)?.chief_concern?.trim() || "Konsultasi gizi",
          }];
        });
        mapped.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
        if (active) {
          setExpert({
            display_name: expertData.display_name || "Ahli Gizi",
            specialty: expertData.specialty || "Konsultasi Gizi",
            photo_key: expertData.photo_key === "male" ? "male" : "female",
          });
          setItems(mapped);
        }
      } catch (e) {
        if (active) setErrorText(e instanceof Error ? e.message : "Gagal mengambil riwayat.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []));

  const visible = useMemo(() => {
    const currentMonth = wibMonthKey(new Date().toISOString());
    const [year, month] = currentMonth.split("-").map(Number);
    const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
    const term = query.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      const key = wibMonthKey(item.startsAt);
      if (filter === "current" && key !== currentMonth) return false;
      if (filter === "previous" && key !== previousMonth) return false;
      return !term || `${item.patientName} ${item.concern}`.toLocaleLowerCase("id-ID").includes(term);
    });
  }, [items, filter, query]);

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <LinearGradient colors={["#FAFFFD", "#F6FBFC", "#F9F7FF"]} style={{ flex: 1 }}>
        <View style={s.header}>
          <Pressable onPress={() => router.replace("/nutritionist-dashboard")} style={s.back}>
            <Ionicons name="arrow-back" size={21} color={INK} />
          </Pressable>
          <Text style={s.title}>Riwayat Konsultasi</Text>
          <Ionicons name="search-outline" size={21} color={GREEN} />
        </View>
        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={GREEN} />
            <Text style={s.muted}>Memuat riwayat konsultasi...</Text>
          </View>
        ) : errorText ? (
          <View style={s.center}><Ionicons name="alert-circle-outline" size={40} color="#C68C35" />
            <Text style={s.muted}>{errorText}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            <View style={s.expertCard}>
              <View style={s.expertRow}>
                <ConsultPhoto photoKey={expert?.photo_key ?? "female"} size={45} />
                <View style={{ flex: 1 }}>
                  <Text style={s.expertName}>{expert?.display_name ?? "Ahli Gizi"}</Text>
                  <Text style={s.tiny}>{expert?.specialty ?? "Konsultasi Gizi"}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={17} color={GREEN} />
              </View>
              <View style={s.statRow}>
                <View style={s.statPill}>
                  <Ionicons name="people-outline" size={14} color={GREEN} />
                  <Text style={s.statText}>{new Set(items.map((i) => i.patientId)).size} pasien ditangani</Text>
                </View>
                <View style={s.statPill}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={GREEN} />
                  <Text style={s.statText}>{items.length} sesi selesai</Text>
                </View>
              </View>
            </View>

            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={18} color={MUTED} />
              <TextInput value={query} onChangeText={setQuery} style={s.searchInput}
                placeholder="Cari nama pasien atau fokus konsultasi..."
                placeholderTextColor="#9DAEA6" />
              {!!query && <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={MUTED} /></Pressable>}
            </View>
            <View style={s.filters}>
              {([
                ["current", "Bulan Ini"], ["previous", "Bulan Lalu"], ["all", "Semua"],
              ] as Array<[Filter, string]>).map(([value, label]) => (
                <Pressable key={value} onPress={() => setFilter(value)}
                  style={[s.filter, filter === value && s.filterActive]}>
                  <Text style={[s.filterText, filter === value && s.filterTextActive]}>
                    {filter === value ? "✓  " : ""}{label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.sectionHeading}>
              <Text style={s.sectionTitle}>Daftar Konsultasi Selesai</Text>
              <Text style={s.tiny}>{visible.length} sesi</Text>
            </View>
            {visible.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="calendar-clear-outline" size={35} color={GREEN} />
                <Text style={s.emptyTitle}>Belum ada riwayat pada filter ini</Text>
                <Text style={s.muted}>Coba pilih Semua atau ubah kata pencarian.</Text>
              </View>
            ) : visible.map((item) => (
              <View key={item.id} style={s.sessionCard}>
                <View style={s.sessionTop}>
                  <View style={s.avatar}><Text style={s.avatarText}>{initials(item.patientName)}</Text></View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.patientName} numberOfLines={1}>{item.patientName}</Text>
                    <Text style={s.tiny}><Ionicons name="calendar-outline" size={11} /> {dateWib(item.startsAt)} · {timeWib(item.startsAt)} WIB</Text>
                  </View>
                  <View style={s.completedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={GREEN} />
                    <Text style={s.completedText}>Selesai</Text>
                  </View>
                </View>
                <View style={s.concernBox}>
                  <Text style={s.tiny}>Fokus Konsultasi</Text>
                  <Text style={s.concernText} numberOfLines={2}>{item.concern}</Text>
                </View>
                <Pressable onPress={() => router.push({
                  pathname: "/nutritionist-session-result", params: { bookingId: item.id },
                })} style={s.resultButton}>
                  <Text style={s.resultButtonText}>Lihat Hasil Konsultasi</Text>
                  <Ionicons name="arrow-forward" size={15} color={GREEN} />
                </Pressable>
              </View>
            ))}
            <View style={s.notice}>
              <Ionicons name="shield-checkmark-outline" size={20} color={GREEN} />
              <Text style={s.noticeText}>Ringkasan dan saran diambil dari hasil konsultasi yang disimpan oleh ahli gizi, bukan hasil AI otomatis.</Text>
            </View>
          </ScrollView>
        )}
        
<View style={s.bottomNav}>
  {/* BERANDA */}
  <Pressable
    onPress={() =>
      router.replace("/nutritionist-dashboard")
    }
    style={s.navItem}
  >
    <Ionicons
      name="home-outline"
      size={21}
      color={MUTED}
    />
    <Text style={s.navText}>Beranda</Text>
  </Pressable>

  {/* JADWAL */}
  <Pressable
    onPress={() =>
      router.replace("/nutritionist-schedule")
    }
    style={s.navItem}
  >
    <Ionicons
      name="calendar-outline"
      size={21}
      color={MUTED}
    />
    <Text style={s.navText}>Jadwal</Text>
  </Pressable>

  {/* RIWAYAT - AKTIF */}
  <Pressable
    disabled
    style={[s.navItem, s.activeNav]}
  >
    <Ionicons
      name="time"
      size={21}
      color={GREEN}
    />
    <Text style={[s.navText, { color: GREEN }]}>
      Riwayat
    </Text>
  </Pressable>

  {/* PROFIL */}
  <Pressable
    onPress={() =>
      router.replace({
        pathname: "/nutritionist-dashboard",
        params: { tab: "profile" },
      })
    }
    style={s.navItem}
  >
    <Ionicons
      name="person-outline"
      size={21}
      color={MUTED}
    />
    <Text style={s.navText}>Profil</Text>
  </Pressable>
</View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFFFD" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", padding: 18, gap: 12 },
  back: { padding: 2 },
  title: { flex: 1, color: GREEN, fontSize: 17, fontWeight: "800" },
  content: { paddingHorizontal: 18, paddingBottom: 35, gap: 14 },
  expertCard: { backgroundColor: "#F8FAFF", padding: 14, borderRadius: 20, borderWidth: 1, borderColor: "#E1E8F6" },
  expertRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  expertName: { color: INK, fontWeight: "800", fontSize: 13 },
  tiny: { fontSize: 10, color: MUTED, lineHeight: 15 },
  statRow: { backgroundColor: "#EEF1FE", borderRadius: 13, padding: 10, marginTop: 15,
    flexDirection: "row", justifyContent: "space-between", gap: 6 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  statText: { color: GREEN, fontSize: 10, fontWeight: "700", flexShrink: 1 },
  searchBar: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, paddingVertical: 8, color: INK, fontSize: 12 },
  filters: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  filter: { borderRadius: 20, backgroundColor: "#EFF1FC", paddingHorizontal: 14, paddingVertical: 8 },
  filterActive: { backgroundColor: "#62F0BE" },
  filterText: { fontSize: 11, color: "#516276", fontWeight: "600" },
  filterTextActive: { color: INK, fontWeight: "800" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  sessionCard: { borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 12 },
  sessionTop: { flexDirection: "row", gap: 9, alignItems: "center" },
  avatar: { backgroundColor: "#EEF0FF", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "800", fontSize: 12, color: GREEN },
  patientName: { fontSize: 12, fontWeight: "800", color: INK },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#C3F6D8", borderRadius: 15, paddingVertical: 5, paddingHorizontal: 7 },
  completedText: { color: GREEN, fontSize: 9, fontWeight: "700" },
  concernBox: { backgroundColor: "#F0F2FD", padding: 10, borderRadius: 13 },
  concernText: { color: INK, fontSize: 12, fontWeight: "700", marginTop: 3, lineHeight: 17 },
  resultButton: { borderRadius: 20, backgroundColor: "#F2F1FF", borderWidth: 1,
    borderColor: "#8CE3C0", minHeight: 40, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  resultButtonText: { color: GREEN, fontSize: 11, fontWeight: "800" },
  empty: { padding: 26, alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 18, borderColor: BORDER, borderWidth: 1 },
  emptyTitle: { color: INK, fontSize: 13, fontWeight: "800", textAlign: "center" },
  muted: { color: MUTED, fontSize: 11, textAlign: "center", lineHeight: 17 },
  notice: { backgroundColor: "#E4FBF0", padding: 13, borderRadius: 15, flexDirection: "row", gap: 9 },
  noticeText: { color: GREEN, fontSize: 10, lineHeight: 16, flex: 1 },
  bottomNav: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  navItem: { alignItems: "center", gap: 4, minWidth: 65, paddingVertical: 4 },
  navText: { color: MUTED, fontSize: 10, fontWeight: "600" },
  activeNav: { backgroundColor: "#D8FDEC", borderRadius: 20, paddingHorizontal: 12 },
});
