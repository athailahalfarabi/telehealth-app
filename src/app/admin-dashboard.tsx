import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

// Dashboard Admin NutriCare AI: data operasional saja, tanpa chat atau rekam medis.
// Angka dan daftar berasal dari Supabase, bukan dari angka contoh di desain Stitch.
const GREEN = "#087A55";
const INK = "#183D31";
const MUTED = "#71867B";
const BG = "#F8FAF9";
const BORDER = "#E4EDE8";
const ZONE = "Asia/Jakarta";

type ExpertRow = {
  id: string;
  display_name: string;
  account_id: string | null;
};

type BookingRow = {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  slot_id: string;
  status: string;
  created_at: string;
};

type SlotRow = {
  id: string;
  starts_at: string;
};

type MonitorItem = {
  id: string;
  patientLabel: string;
  nutritionistName: string;
  startsAt: string | null;
  status: string;
  createdAt: string;
};

type DashboardSummary = {
  totalExperts: number;
  linkedExperts: number;
  bookingsToday: number;
  completedTotal: number;
  monitoring: MonitorItem[];
};

function todayBoundsWib() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const find = (part: string) =>
    Number(parts.find((p) => p.type === part)?.value);
  const startMs =
    Date.UTC(find("year"), find("month") - 1, find("day")) - 7 * 3600000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + 86400000).toISOString(),
  };
}

function displayDate() {
  return new Date().toLocaleDateString("id-ID", {
    timeZone: ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function displaySchedule(iso: string | null) {
  if (!iso) return "Jadwal tidak tersedia";
  const date = new Date(iso);
  return (
    date.toLocaleDateString("id-ID", {
      timeZone: ZONE,
      day: "numeric",
      month: "short",
    }) +
    " · " +
    date
      .toLocaleTimeString("id-ID", {
        timeZone: ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":") +
    " WIB"
  );
}

function relativeTime(iso: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam lalu`;
  return `${Math.floor(minutes / 1440)} hari lalu`;
}

function statusMeta(status: string) {
  switch (status) {
    case "paid_simulated":
      return { text: "Terkonfirmasi", bg: "#D9F8E8", fg: "#087A55" };
    case "completed":
      return { text: "Selesai", bg: "#E9EDFA", fg: "#4A5B91" };
    case "pending_payment":
      return { text: "Menunggu Pembayaran", bg: "#FFF0D2", fg: "#A56A12" };
    case "cancelled":
      return { text: "Dibatalkan", bg: "#FBE8E6", fg: "#A93C3C" };
    default:
      return { text: status, bg: "#EDF2EE", fg: "#63766A" };
  }
}

function futurePage(name: string) {
  Alert.alert(
    "Tahap berikutnya",
    `Halaman ${name} akan kita buat setelah Dashboard Admin selesai.`,
  );
}

function StatCard({
  icon,
  value,
  label,
  hint,
  tone = "mint",
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string | number;
  label: string;
  hint?: string;
  tone?: "mint" | "lavender";
}) {
  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <View style={[s.statIcon, tone === "lavender" && s.statIconBlue]}>
          <Ionicons name={icon} size={18} color={GREEN} />
        </View>
        {!!hint && <Text style={s.statHint}>{hint}</Text>}
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setErrorMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      // Pemeriksaan di UI bukan pengganti kebijakan RLS pada database.
      const { data: profile, error: roleError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      if (roleError) throw roleError;
      if (profile?.role !== "admin") {
        throw new Error("Akun yang login belum mempunyai role admin.");
      }

      const bounds = todayBoundsWib();
      const [
        expertResponse,
        todayResponse,
        completedResponse,
        bookingResponse,
      ] = await Promise.all([
        supabase.from("nutritionists").select("id, display_name, account_id"),
        supabase
          .from("consultation_bookings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", bounds.start)
          .lt("created_at", bounds.end),
        supabase
          .from("consultation_bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("consultation_bookings")
          .select(
            "id, patient_id, nutritionist_id, slot_id, status, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (expertResponse.error) throw expertResponse.error;
      if (todayResponse.error) throw todayResponse.error;
      if (completedResponse.error) throw completedResponse.error;
      if (bookingResponse.error) throw bookingResponse.error;

      const experts = (expertResponse.data ?? []) as ExpertRow[];
      const bookings = (bookingResponse.data ?? []) as BookingRow[];

      // Mengambil nama pasien untuk monitoring Admin
      const patientNameMap = new Map<string, string>();

      if (bookings.length > 0) {
        const bookingIds = bookings.map((booking) => booking.id);

        const { data: patientNames, error: patientNamesError } =
          await supabase.rpc("admin_booking_patient_names", {
            p_booking_ids: bookingIds,
          });

        if (patientNamesError) throw patientNamesError;

        for (const item of patientNames ?? []) {
          patientNameMap.set(item.booking_id, item.patient_name);
        }
      }

      const expertNames = new Map(experts.map((e) => [e.id, e.display_name]));
      const slotIds = [...new Set(bookings.map((b) => b.slot_id))];
      let slotRows: SlotRow[] = [];
      if (slotIds.length > 0) {
        const { data, error } = await supabase
          .from("consultation_slots")
          .select("id, starts_at")
          .in("id", slotIds);
        if (error) throw error;
        slotRows = (data ?? []) as SlotRow[];
      }
      const startsAtBySlot = new Map(
        slotRows.map((slot) => [slot.id, slot.starts_at]),
      );

      setSummary({
        totalExperts: experts.length,
        // Akun terhubung ≠ status aktif. Status aktif akan dihitung setelah
        // struktur kolom dan aturan aktivasi ahli gizi selesai diperiksa.
        linkedExperts: experts.filter((e) => !!e.account_id).length,
        bookingsToday: todayResponse.count ?? 0,
        completedTotal: completedResponse.count ?? 0,
        monitoring: bookings.map((booking) => ({
          id: booking.id,
          // Data pasien disamarkan. Admin tidak perlu membuka profil kesehatan.

          patientLabel:
            patientNameMap.get(booking.id) ??
            `Pasien • ${booking.id.slice(0, 6).toUpperCase()}`,

          nutritionistName:
            expertNames.get(booking.nutritionist_id) ?? "Ahli gizi",
          startsAt: startsAtBySlot.get(booking.slot_id) ?? null,
          status: booking.status,
          createdAt: booking.created_at,
        })),
      });
    } catch (err) {
      setSummary(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat Dashboard Admin.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  function refresh() {
    setRefreshing(true);
    void loadData();
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <View style={s.brandIcon}>
          <Ionicons name="leaf-outline" size={25} color={GREEN} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.brandName}>NutriCare AI Admin</Text>
          <Text style={s.brandSubtitle}>Portal Administrator</Text>
        </View>
        <Pressable
          style={s.bellButton}
          onPress={() => router.push("/admin-notifications")}
          accessibilityLabel="Notifikasi"
        >
          <Ionicons name="notifications-outline" size={24} color={INK} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={s.datePill}>
          <Ionicons name="calendar-outline" size={13} color={GREEN} />
          <Text style={s.dateText}>{displayDate()}</Text>
        </View>
        <Text style={s.welcome}>Selamat Datang, Admin!</Text>
        <Text style={s.description}>
          Ringkasan operasional layanan gizi hari ini
        </Text>

        {/* TOMBOL CEPAT ADMIN */}
        <View style={s.quickActions}>
          <Pressable
            style={[s.quickButton, s.quickPrimary]}
            onPress={() => router.push("/admin-nutritionist-create")}
          >
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
            <Text style={s.quickPrimaryText}>Tambah Ahli Gizi</Text>
          </Pressable>

          <Pressable
            style={[s.quickButton, s.quickOutline]}
            onPress={() => router.push("/admin-schedule")}
          >
            <Ionicons name="calendar-outline" size={16} color={GREEN} />
            <Text style={s.quickOutlineText}>Kelola Jadwal</Text>
          </Pressable>
        </View>

        {/* TOMBOL PENGAJUAN MITRA - BARIS BARU */}
        <Pressable
          onPress={() => router.push("/admin-applications")}
          style={{
            marginTop: 10,
            marginBottom: 12,
            backgroundColor: "#EAF8EF",
            borderWidth: 1,
            borderColor: "#CBEAD8",
            borderRadius: 16,
            paddingVertical: 13,
            paddingHorizontal: 15,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="document-text-outline" size={20} color={GREEN} />

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#173C2D",
              }}
            >
              Pengajuan Mitra
            </Text>

            <Text
              style={{
                fontSize: 10,
                color: "#71877B",
                marginTop: 3,
              }}
            >
              Lihat pengajuan calon ahli gizi
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={GREEN} />
        </Pressable>

        {loading && !summary ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={s.emptySubtitle}>Mengambil data operasional...</Text>
          </View>
        ) : errorMessage ? (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={30} color="#B45309" />
            <Text style={s.errorTitle}>Dashboard belum dapat dimuat</Text>
            <Text style={s.emptySubtitle}>{errorMessage}</Text>
            <Text style={s.errorNote}>
              Periksa role admin dan kebijakan SELECT (RLS) di Supabase. Jangan
              nonaktifkan RLS.
            </Text>
            <Pressable style={s.retryButton} onPress={() => void loadData()}>
              <Text style={s.retryText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : summary ? (
          <>
            <View style={s.sectionHeading}>
              <Text style={s.sectionTitle}>Statistik Kunci</Text>
              <Text style={s.sectionHint}>Data Supabase</Text>
            </View>
            <View style={s.statsGrid}>
              <StatCard
                icon="people-outline"
                value={summary.totalExperts}
                label="Total Ahli Gizi"
              />
              <StatCard
                icon="person-circle-outline"
                value={summary.linkedExperts}
                label="Akun Ahli Gizi Terhubung"
                hint="Sudah punya login"
              />
              <StatCard
                icon="calendar-outline"
                value={summary.bookingsToday}
                label="Booking Hari Ini"
              />
              <StatCard
                icon="checkmark-circle-outline"
                value={summary.completedTotal}
                label="Konsultasi Selesai"
                hint="Total"
                tone="lavender"
              />
            </View>

            <View style={s.sectionHeading}>
              <Text style={s.sectionTitle}>Monitoring Konsultasi</Text>
              <Pressable onPress={() => router.push("/admin-bookings")}>
                <Text style={s.seeAll}>Lihat Semua ›</Text>
              </Pressable>
            </View>
            {summary.monitoring.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={25}
                  color={GREEN}
                />
                <Text style={s.emptyTitle}>Belum ada booking</Text>
                <Text style={s.emptySubtitle}>
                  Booking terbaru akan muncul di sini.
                </Text>
              </View>
            ) : (
              summary.monitoring.slice(0, 3).map((item) => {
                const status = statusMeta(item.status);
                return (
                  <View key={item.id} style={s.bookingCard}>
                    <View style={s.bookingTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.smallLabel}>Pasien</Text>
                        <Text style={s.patientLabel}>{item.patientLabel}</Text>
                      </View>
                      <View
                        style={[s.statusPill, { backgroundColor: status.bg }]}
                      >
                        <Text style={[s.statusText, { color: status.fg }]}>
                          {status.text}
                        </Text>
                      </View>
                    </View>
                    <View style={s.bookingMeta}>
                      <Ionicons name="medkit-outline" size={13} color={GREEN} />
                      <Text style={s.bookingExpert} numberOfLines={1}>
                        {item.nutritionistName}
                      </Text>
                      <Ionicons name="time-outline" size={13} color={MUTED} />
                      <Text style={s.bookingTime}>
                        {displaySchedule(item.startsAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            <View style={s.sectionHeading}>
              <Text style={s.sectionTitle}>Aktivitas Terbaru</Text>
            </View>
            {summary.monitoring.length === 0 ? (
              <Text style={s.emptySubtitle}>Belum ada aktivitas booking.</Text>
            ) : (
              summary.monitoring.slice(0, 3).map((item) => (
                <View key={`activity-${item.id}`} style={s.activityCard}>
                  <View style={s.activityIcon}>
                    <Ionicons name="calendar-outline" size={18} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>
                      Booking konsultasi dibuat
                    </Text>
                    <Text style={s.activitySubtitle} numberOfLines={2}>
                      {item.patientLabel} · {item.nutritionistName}
                    </Text>
                  </View>
                  <Text style={s.activityWhen}>
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}

        <View style={s.privacyCard}>
          <Ionicons name="lock-closed-outline" size={20} color={GREEN} />
          <Text style={s.privacyText}>
            <Text style={{ fontWeight: "800" }}>
              Mode Administrator Operasional.{" "}
            </Text>
            Admin hanya memantau data booking, bukan isi chat atau catatan
            kesehatan pasien.
          </Text>
        </View>
      </ScrollView>

      <View style={s.bottomNav}>
        {(
          [
            { key: "home", label: "Beranda", icon: "home-outline" },
            { key: "experts", label: "Ahli Gizi", icon: "people-outline" },
            { key: "schedule", label: "Jadwal", icon: "calendar-outline" },
            { key: "profile", label: "Profil", icon: "person-outline" },
          ] as const
        ).map((item) => {
          const active = item.key === "home";
          return (
            <Pressable
              key={item.key}
              style={s.navItem}
              onPress={() => {
                if (item.key === "experts") {
                  router.push("/admin-nutritionists");
                } else if (item.key === "schedule") {
                  router.push("/admin-schedule");
                } else if (item.key === "profile") {
                  router.push("/admin-profile");
                }
              }}
            >
              <View style={[s.navIcon, active && s.navIconActive]}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={active ? GREEN : "#82938A"}
                />
              </View>
              <Text style={[s.navLabel, active && s.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 11,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DAF8E7",
  },
  brandName: { fontSize: 16, fontWeight: "800", color: GREEN },
  brandSubtitle: { fontSize: 11, color: MUTED, marginTop: 3 },
  bellButton: { padding: 8 },
  content: { paddingHorizontal: 17, paddingTop: 18, paddingBottom: 30 },
  datePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#DDF9E9",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 24,
  },
  dateText: { color: GREEN, fontSize: 11, fontWeight: "700" },
  welcome: { color: INK, fontSize: 23, fontWeight: "800", marginTop: 14 },
  description: { color: MUTED, fontSize: 12, marginTop: 5 },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 19,
    marginBottom: 25,
  },
  quickButton: {
    minHeight: 45,
    borderRadius: 26,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  quickPrimary: { backgroundColor: GREEN },
  quickOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B9E6D0",
  },
  quickPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },
  quickOutlineText: { color: GREEN, fontWeight: "800", fontSize: 11 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 3,
  },
  sectionTitle: { color: INK, fontSize: 16, fontWeight: "800" },
  sectionHint: { color: MUTED, fontSize: 10 },
  seeAll: { color: GREEN, fontWeight: "700", fontSize: 11 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 114,
    padding: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  statIcon: {
    backgroundColor: "#DDF9EB",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconBlue: { backgroundColor: "#ECF0FF" },
  statHint: {
    backgroundColor: "#E3F9EC",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    color: GREEN,
    fontSize: 8,
    fontWeight: "700",
    flexShrink: 1,
  },
  statValue: { fontWeight: "900", color: INK, fontSize: 24, marginTop: 12 },
  statLabel: { color: INK, fontSize: 11, marginTop: 3 },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bookingTop: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  smallLabel: { fontSize: 10, color: MUTED },
  patientLabel: { fontSize: 13, fontWeight: "800", color: INK, marginTop: 4 },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 15,
    maxWidth: "53%",
  },
  statusText: { fontSize: 9, fontWeight: "800" },
  bookingMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: "#EEF3EF",
    marginTop: 12,
    paddingTop: 10,
  },
  bookingExpert: { color: MUTED, fontSize: 10, flexShrink: 1, marginRight: 9 },
  bookingTime: { color: MUTED, fontSize: 10 },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DFF8EA",
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: { color: INK, fontWeight: "800", fontSize: 11 },
  activitySubtitle: { color: MUTED, fontSize: 10, marginTop: 4 },
  activityWhen: { color: MUTED, fontSize: 9, alignSelf: "flex-start" },
  privacyCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#E9F9F2",
    borderRadius: 17,
    padding: 14,
    marginTop: 17,
  },
  privacyText: { color: "#406A58", fontSize: 11, lineHeight: 17, flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 45,
    gap: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 22,
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: "800" },
  emptySubtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    alignItems: "center",
    gap: 11,
    padding: 20,
  },
  errorTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  errorNote: {
    color: "#9E6B1F",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
  },
  retryButton: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopColor: BORDER,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  navIcon: {
    width: 69,
    height: 39,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: { backgroundColor: "#B9F7D9" },
  navLabel: { fontSize: 10, color: "#82938A", fontWeight: "600" },
  navLabelActive: { color: GREEN, fontWeight: "800" },
});
