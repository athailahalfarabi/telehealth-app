import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

const GREEN = "#087A55";
const INK = "#183D31";
const MUTED = "#71867B";
const BG = "#F8FAF9";
const BORDER = "#E4EDE8";
const PAGE_SIZE = 40;
const ZONE = "Asia/Jakarta";

type RawBooking = {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  slot_id: string;
  status: string;
  created_at: string;
};
type BookingItem = RawBooking & {
  patientLabel: string;
  expertName: string;
  sessionStartsAt: string | null;
};
type StatusFilter = "all" | "pending_payment" | "paid_simulated" | "completed" | "cancelled";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "pending_payment", label: "Menunggu" },
  { key: "paid_simulated", label: "Terkonfirmasi" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

function statusView(status: string) {
  switch (status) {
    case "paid_simulated": return { text: "Terkonfirmasi", bg: "#D9F8E8", fg: GREEN };
    case "completed": return { text: "Selesai", bg: "#E9EDFA", fg: "#4A5B91" };
    case "pending_payment": return { text: "Menunggu Pembayaran", bg: "#FFF0D2", fg: "#A56A12" };
    case "cancelled": return { text: "Dibatalkan", bg: "#FBE8E6", fg: "#A93C3C" };
    default: return { text: status, bg: "#EDF2EE", fg: MUTED };
  }
}

function formatWib(value: string | null) {
  if (!value) return "Jadwal belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Jadwal tidak valid";
  const day = date.toLocaleDateString("id-ID", {
    timeZone: ZONE, day: "numeric", month: "short", year: "numeric",
  });
  const time = date.toLocaleTimeString("id-ID", {
    timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(".", ":");
  return `${day} · ${time} WIB`;
}

async function checkAdmin() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (error) throw error;
  if (profile?.role !== "admin") throw new Error("Akses hanya untuk Admin.");
}

async function fetchBookings(offset: number): Promise<{ items: BookingItem[]; hasMore: boolean }> {
  await checkAdmin();
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select("id, patient_id, nutritionist_id, slot_id, status, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const bookings = (data ?? []) as RawBooking[];
  if (bookings.length === 0) return { items: [], hasMore: false };

  const expertIds = [...new Set(bookings.map((b) => b.nutritionist_id))];
  const slotIds = [...new Set(bookings.map((b) => b.slot_id).filter(Boolean))];

  const [expertRes, slotRes] = await Promise.all([
    supabase.from("nutritionists").select("id, display_name").in("id", expertIds),
    slotIds.length
      ? supabase.from("consultation_slots").select("id, starts_at").in("id", slotIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (expertRes.error) throw expertRes.error;
  if (slotRes.error) throw slotRes.error;

  const experts = new Map<string, string>(
    (expertRes.data ?? []).map((e: { id: string; display_name: string }) => [e.id, e.display_name] as const),
  );
  const slots = new Map<string, string>(
    (slotRes.data ?? []).map((s: { id: string; starts_at: string }) => [s.id, s.starts_at] as const),
  );

  // Opsional: jika fungsi admin_booking_patient_names sudah dibuat pada tahap sebelumnya,
  // nama pasien akan muncul. Jika belum, tetap tampilkan kode booking secara aman.
  const nameByBooking = new Map<string, string>();
  const { data: names, error: namesError } = await supabase.rpc("admin_booking_patient_names", {
    p_booking_ids: bookings.map((b) => b.id),
  });
  if (!namesError && names) {
    for (const row of names as Array<{ booking_id: string; patient_name: string }>) {
      nameByBooking.set(row.booking_id, row.patient_name);
    }
  }

  return {
    items: bookings.map((booking) => ({
      ...booking,
      patientLabel: nameByBooking.get(booking.id) ?? `Pasien • ${booking.id.slice(0, 6).toUpperCase()}`,
      expertName: experts.get(booking.nutritionist_id) ?? "Ahli gizi",
      sessionStartsAt: slots.get(booking.slot_id) ?? null,
    })),
    hasMore: bookings.length === PAGE_SIZE,
  };
}

export default function AdminBookingsScreen() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadFirst = useCallback(async () => {
    setErrorMessage("");
    try {
      const result = await fetchBookings(0);
      setItems(result.items);
      setHasMore(result.hasMore);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void loadFirst();
  }, [loadFirst]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchBookings(items.length);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.replace("/admin-dashboard")} style={s.back} accessibilityLabel="Kembali ke dashboard">
          <Ionicons name="arrow-back" size={22} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>Semua Konsultasi</Text>
          <Text style={s.subheading}>Monitoring booking Admin</Text>
        </View>
        <Pressable onPress={() => { setRefreshing(true); void loadFirst(); }} accessibilityLabel="Muat ulang" style={s.back}>
          <Ionicons name="refresh-outline" size={21} color={GREEN} />
        </Pressable>
      </View>
      <View style={s.intro}>
        <Text style={s.introTitle}>Daftar Booking</Text>
        <Text style={s.introText}>Menampilkan {visible.length} dari {items.length} booking yang sudah dimuat. Data dari semua tanggal.</Text>
      </View>
      <View style={{ height: 52 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map((entry) => (
            <Pressable key={entry.key} style={[s.filterChip, filter === entry.key && s.filterActive]} onPress={() => setFilter(entry.key)}>
              <Text style={[s.filterText, filter === entry.key && s.filterTextActive]}>{entry.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); void loadFirst(); }}
        ListEmptyComponent={loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={GREEN} /><Text style={s.muted}>Memuat booking...</Text></View>
        ) : (
          <View style={s.center}>
            <Ionicons name="calendar-clear-outline" size={31} color={GREEN} />
            <Text style={s.emptyTitle}>Belum ada booking untuk filter ini</Text>
            <Text style={s.muted}>Coba pilih status lainnya atau muat ulang halaman.</Text>
          </View>
        )}
        ListHeaderComponent={errorMessage ? (
          <View style={s.error}><Text style={s.errorText}>{errorMessage}</Text><Pressable onPress={() => { setLoading(true); void loadFirst(); }}><Text style={s.retry}>Coba Lagi</Text></Pressable></View>
        ) : undefined}
        renderItem={({ item }) => {
          const badge = statusView(item.status);
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.mini}>Pasien</Text>
                  <Text style={s.patient}>{item.patientLabel}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: badge.bg }]}><Text style={[s.pillText, { color: badge.fg }]}>{badge.text}</Text></View>
              </View>
              <View style={s.separator} />
              <View style={s.meta}><Ionicons name="medkit-outline" size={15} color={GREEN} /><Text style={s.metaText}>{item.expertName}</Text></View>
              <View style={s.meta}><Ionicons name="time-outline" size={15} color={GREEN} /><Text style={s.metaText}>{formatWib(item.sessionStartsAt)}</Text></View>
              <Text style={s.created}>Booking dibuat: {formatWib(item.created_at)}</Text>
            </View>
          );
        }}
        ListFooterComponent={hasMore ? (
          <Pressable disabled={loadingMore} onPress={() => void loadMore()} style={s.more}>
            {loadingMore ? <ActivityIndicator color={GREEN} /> : <Text style={s.moreText}>Muat booking berikutnya</Text>}
          </Pressable>
        ) : items.length ? <Text style={s.end}>Semua booking berhasil dimuat.</Text> : undefined}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { width: 39, height: 39, borderRadius: 14, backgroundColor: "#EDF8F2", justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 17, fontWeight: "800", color: GREEN },
  subheading: { fontSize: 11, color: MUTED, marginTop: 3 },
  intro: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 10 },
  introTitle: { fontSize: 21, fontWeight: "800", color: INK },
  introText: { fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 18 },
  filters: { gap: 8, paddingHorizontal: 18, paddingVertical: 5, alignItems: "center" },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 21 },
  filterActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { color: INK, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#FFFFFF" },
  list: { paddingHorizontal: 17, paddingTop: 6, paddingBottom: 30, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 19, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  mini: { color: MUTED, fontSize: 11 },
  patient: { color: INK, fontSize: 15, fontWeight: "800", marginTop: 4 },
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, maxWidth: "55%" },
  pillText: { fontSize: 10, fontWeight: "800" },
  separator: { height: 1, backgroundColor: "#EEF3EF", marginVertical: 12 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 },
  metaText: { color: MUTED, fontSize: 12, flex: 1 },
  created: { color: MUTED, fontSize: 10, marginTop: 12 },
  center: { padding: 35, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 14, color: INK, fontWeight: "800", textAlign: "center" },
  muted: { color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 18 },
  error: { backgroundColor: "#FFF1ED", borderRadius: 14, padding: 14, marginBottom: 15 },
  errorText: { color: "#9C4029", fontSize: 12 },
  retry: { color: GREEN, fontWeight: "800", marginTop: 8 },
  more: { borderWidth: 1, borderColor: GREEN, borderRadius: 24, alignItems: "center", padding: 13, marginVertical: 10 },
  moreText: { color: GREEN, fontWeight: "800", fontSize: 12 },
  end: { textAlign: "center", color: MUTED, marginVertical: 16, fontSize: 11 },
});
