import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
const ZONE = "Asia/Jakarta";

type EventItem = {
  key: string;
  title: string;
  detail: string;
  at: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  bookingRelated: boolean;
};

type Booking = {
  id: string;
  nutritionist_id: string;
  status: string;
  created_at: string;
  paid_at: string | null;
};
type Expert = { id: string; display_name: string; created_at: string | null };

function formatWib(value: string) {
  const date = new Date(value);
  return date.toLocaleString("id-ID", {
    timeZone: ZONE,
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).replace(/\.(\d{2})$/, ":$1") + " WIB";
}

async function checkAdmin() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  const { data: profile, error } = await supabase
    .from("profiles").select("role").eq("id", auth.user.id).single();
  if (error) throw error;
  if (profile?.role !== "admin") throw new Error("Akses hanya untuk Admin.");
}

async function fetchActivity(): Promise<EventItem[]> {
  await checkAdmin();
  const [bookingRes, expertRes] = await Promise.all([
    supabase.from("consultation_bookings")
      .select("id, nutritionist_id, status, created_at, paid_at")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("nutritionists")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (bookingRes.error) throw bookingRes.error;
  if (expertRes.error) throw expertRes.error;

  const bookings = (bookingRes.data ?? []) as Booking[];
  const experts = (expertRes.data ?? []) as Expert[];
  const expertNames = new Map<string, string>(experts.map((e) => [e.id, e.display_name] as const));
  const events: EventItem[] = [];

  for (const item of bookings) {
    const label = item.id.slice(0, 6).toUpperCase();
    events.push({
      key: `new-${item.id}`,
      title: "Booking konsultasi dibuat",
      detail: `Booking ${label} · ${expertNames.get(item.nutritionist_id) ?? "Ahli gizi"}`,
      at: item.created_at,
      icon: "calendar-outline",
      bookingRelated: true,
    });

    // Hanya gunakan paid_at untuk waktu pembayaran; bukan waktu booking dibuat.
    if (item.paid_at && ["paid_simulated", "completed"].includes(item.status)) {
      events.push({
        key: `paid-${item.id}`,
        title: "Pembayaran simulasi tercatat",
        detail: `Booking ${label} telah melalui simulasi pembayaran`,
        at: item.paid_at,
        icon: "checkmark-circle-outline",
        bookingRelated: true,
      });
    }
  }

  for (const expert of experts) {
    if (!expert.created_at) continue;
    events.push({
      key: `expert-${expert.id}`,
      title: "Ahli gizi ditambahkan",
      detail: expert.display_name,
      at: expert.created_at,
      icon: "person-add-outline",
      bookingRelated: false,
    });
  }

  // Tidak ada kolom waktu penyelesaian konsultasi pada skema saat ini,
  // sehingga kita tidak membuat notifikasi "baru selesai" dengan waktu palsu.
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 100);
}

export default function AdminNotificationsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reload = useCallback(async () => {
    setErrorMessage("");
    try {
      setEvents(await fetchActivity());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void reload();
  }, [reload]));

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.replace("/admin-dashboard")} accessibilityLabel="Kembali">
          <Ionicons name="arrow-back" color={INK} size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>Notifikasi Admin</Text>
          <Text style={s.subheading}>Aktivitas operasional NutriCare AI</Text>
        </View>
        <Pressable style={s.back} onPress={() => { setRefreshing(true); void reload(); }} accessibilityLabel="Muat ulang">
          <Ionicons name="refresh-outline" color={GREEN} size={21} />
        </Pressable>
      </View>
      <View style={s.note}>
        <Ionicons name="information-circle-outline" size={19} color={GREEN} />
        <Text style={s.noteText}>Ini adalah pusat aktivitas di dalam aplikasi, bukan notifikasi push di layar HP. Buka halaman ini atau tarik ke bawah untuk memperbarui.</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(item) => item.key}
        contentContainerStyle={s.list}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); void reload(); }}
        ListHeaderComponent={errorMessage ? (
          <View style={s.error}><Text style={s.errorText}>{errorMessage}</Text><Pressable onPress={() => { setLoading(true); void reload(); }}><Text style={s.retry}>Coba Lagi</Text></Pressable></View>
        ) : events.length ? (
          <Text style={s.sectionTitle}>Aktivitas terbaru ({events.length})</Text>
        ) : undefined}
        ListEmptyComponent={loading ? (
          <View style={s.center}><ActivityIndicator color={GREEN} size="large" /><Text style={s.emptyText}>Mengambil aktivitas terbaru...</Text></View>
        ) : (
          <View style={s.center}><Ionicons name="notifications-off-outline" size={32} color={GREEN} /><Text style={s.emptyTitle}>Belum ada aktivitas</Text><Text style={s.emptyText}>Aktivitas booking dan ahli gizi akan muncul di sini.</Text></View>
        )}
        renderItem={({ item }) => (
          <Pressable
            disabled={!item.bookingRelated}
            style={s.card}
            onPress={() => router.push("/admin-bookings")}
          >
            <View style={s.iconBox}><Ionicons name={item.icon} color={GREEN} size={20} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{item.title}</Text>
              <Text style={s.eventDetail}>{item.detail}</Text>
              <Text style={s.eventTime}>{formatWib(item.at)}</Text>
            </View>
            {item.bookingRelated && <Ionicons name="chevron-forward" size={18} color={MUTED} />}
          </Pressable>
        )}
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
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 17, marginTop: 16, backgroundColor: "#E6F8EE", borderRadius: 17, padding: 13 },
  noteText: { color: "#406A58", fontSize: 12, lineHeight: 18, flex: 1 },
  list: { paddingHorizontal: 17, paddingTop: 20, paddingBottom: 35, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: INK, marginBottom: 15 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#DFF8EA", alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 12, color: INK, fontWeight: "800" },
  eventDetail: { fontSize: 11, color: MUTED, marginTop: 5, lineHeight: 16 },
  eventTime: { fontSize: 10, color: GREEN, marginTop: 7 },
  error: { backgroundColor: "#FFF1ED", borderRadius: 15, padding: 14, marginBottom: 14 },
  errorText: { color: "#9C4029", fontSize: 12 },
  retry: { color: GREEN, fontWeight: "800", marginTop: 7 },
  center: { alignItems: "center", gap: 11, padding: 40 },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
