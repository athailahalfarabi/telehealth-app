import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import NutritionistProfilePanel from "../components/NutritionistProfilePanel";

type Tab = "home" | "schedule" | "history" | "profile";

type Expert = {
  id: string;
  display_name: string;
  specialty: string;
  photo_key: string | null;
  photo_storage_path: string | null;
  education_formal: string | null;
  license_number: string | null;
  experience_years: number | null;
  is_verified: boolean;
  is_demo: boolean;
};

type BookingRow = {
  id: string;
  patient_id: string;
  slot_id: string;
  status: string;
};

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type Session = BookingRow & {
  startsAt: number;
  endsAt: number;
  patientName: string;
};

const GREEN = "#087A55";
const DARK = "#124D3D";
const BG = "#F8FAF8";
const ZONE = "Asia/Jakarta";

const NAV_ITEMS = [
  { key: "home", label: "Beranda", icon: "home" },
  {
    key: "schedule",
    label: "Jadwal",
    icon: "calendar-outline",
  },
  {
    key: "history",
    label: "Riwayat",
    icon: "time-outline",
  },
  {
    key: "profile",
    label: "Profil",
    icon: "person-outline",
  },
] as const;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function dayKey(timestamp: number) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

function patientLabel(patientId: string) {
  return `Pasien ${patientId.slice(0, 6).toUpperCase()}`;
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );

  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function StatusPill({ status }: { status: string }) {
  const completed = status === "completed";
  const confirmed = status === "paid_simulated";

  const label = completed
    ? "Selesai"
    : confirmed
      ? "Terkonfirmasi"
      : status === "pending_payment"
        ? "Menunggu Bayar"
        : status === "cancelled"
          ? "Dibatalkan"
          : status;

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: completed
            ? "#E5F1EA"
            : confirmed
              ? "#DCFBEA"
              : "#FFF0D7",
        },
      ]}
    >
      <Text
        style={[
          styles.statusText,
          {
            color: completed ? "#387055" : confirmed ? "#087A55" : "#9C6A21",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  value,
  label,
  icon,
  tint,
}: {
  value: number;
  label: string;
  icon: "calendar-outline" | "time-outline" | "checkmark-circle-outline";
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={17} color={GREEN} />
      </View>

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function NutritionistDashboard() {
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(
    requestedTab === "profile" ? "profile" : "home",
  );

  useEffect(() => {
    if (requestedTab === "history") {
      router.replace("/nutritionist-history");
    } else if (requestedTab === "profile") {
      setTab("profile");
    }
  }, [requestedTab]);

  const [expert, setExpert] = useState<Expert | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/login");
        return;
      }

      setAccountEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "nutritionist") {
        throw new Error("Akun ini bukan akun ahli gizi.");
      }

      const { data: expertData, error: expertError } = await supabase
        .from("nutritionists")
        .select("id, display_name, specialty, photo_key, photo_storage_path, education_formal, license_number, experience_years, is_verified, is_demo")
        .eq("account_id", user.id)
        .single();

      if (expertError) throw expertError;
      if (!expertData) {
        throw new Error("Profil ahli gizi belum terhubung.");
      }

      setExpert(expertData);

      const { data: bookingData, error: bookingError } = await supabase
        .from("consultation_bookings")
        .select("id, patient_id, slot_id, status")
        .eq("nutritionist_id", expertData.id);

      if (bookingError) throw bookingError;

      const bookings = (bookingData ?? []) as BookingRow[];

      if (bookings.length === 0) {
        setSessions([]);
        return;
      }

      const slotIds = [...new Set(bookings.map((b) => b.slot_id))];

      const { data: slotData, error: slotError } = await supabase
        .from("consultation_slots")
        .select("id, starts_at, ends_at")
        .in("id", slotIds);

      if (slotError) throw slotError;

      const slotMap = new Map(
        ((slotData ?? []) as SlotRow[]).map((slot) => [slot.id, slot]),
      );

      const merged: Session[] = bookings.flatMap((booking) => {
        const slot = slotMap.get(booking.slot_id);

        if (!slot) return [];

        return [
          {
            ...booking,
            startsAt: new Date(slot.starts_at).getTime(),
            endsAt: new Date(slot.ends_at).getTime(),
            patientName: patientLabel(booking.patient_id),
          },
        ];
      });

      const confirmedPatientIds = [
        ...new Set(
          merged
            .filter(
              (s) => s.status === "paid_simulated" || s.status === "completed",
            )
            .map((s) => s.patient_id),
        ),
      ];

      let patientNames = new Map<string, string>();

      if (confirmedPatientIds.length > 0) {
        const { data: patients, error: namesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", confirmedPatientIds);

        if (namesError) {
          console.warn("Gagal membaca nama pasien:", namesError);
        } else {
          patientNames = new Map(
            (patients ?? []).map((patient) => [
              patient.id,
              patient.full_name ?? "",
            ]),
          );
        }
      }

      setSessions(
        merged.map((session) => ({
          ...session,
          patientName:
            patientNames.get(session.patient_id)?.trim() ||
            patientLabel(session.patient_id),
        })),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data dari Supabase.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function onRefresh() {
    setRefreshing(true);
    void loadData();
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Gagal Logout", error.message);
      return;
    }

    router.replace("/login");
  }

  function openChat(session: Session) {
    router.push({
      pathname: "/consultation-chat",
      params: {
        bookingId: session.id,
      },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.muted}>Memuat dashboard ahli gizi...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !expert) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={42} color="#C2410C" />

        <Text style={styles.errorText}>
          {errorMessage || "Data ahli gizi tidak tersedia."}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setLoading(true);
            void loadData();
          }}
        >
          <Text style={styles.primaryButtonText}>Coba Lagi</Text>
        </Pressable>

        <Pressable onPress={logout}>
          <Text style={{ color: GREEN }}>Logout</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const today = dayKey(now);

  const todaySessions = sessions.filter(
    (session) =>
      dayKey(session.startsAt) === today &&
      (session.status === "paid_simulated" || session.status === "completed"),
  );

  const upcoming = sessions
    .filter(
      (session) => session.status === "paid_simulated" && session.endsAt > now,
    )
    .sort((a, b) => a.startsAt - b.startsAt);

  const scheduled = sessions
    .filter(
      (session) =>
        session.endsAt > now &&
        (session.status === "paid_simulated" ||
          session.status === "pending_payment"),
    )
    .sort((a, b) => a.startsAt - b.startsAt);

  const history = sessions
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.startsAt - a.startsAt);

  const mainSession = upcoming[0];

  const nextSessions = scheduled
    .filter((session) => session.id !== mainSession?.id)
    .slice(0, 5);

  const todayWaiting = todaySessions.filter(
    (session) => session.status === "paid_simulated",
  ).length;

  const todayCompleted = todaySessions.filter(
    (session) => session.status === "completed",
  ).length;

  const minutesToMain = mainSession
    ? Math.ceil((mainSession.startsAt - now) / 60000)
    : null;

  const isMainReady =
    !!mainSession && now >= mainSession.startsAt && now < mainSession.endsAt;

  function SessionRow({ session }: { session: Session }) {
    return (
      <Pressable
        style={styles.sessionRow}
        accessibilityRole="button"
        onPress={() => {
          const sessionDate = new Date(session.startsAt + 7 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);

          router.push({
            pathname: "/nutritionist-schedule",
            params: {
              date: sessionDate,
              bookingId: session.id,
            },
          });
        }}
      >
        <View style={styles.avatarSmall}>
          <Ionicons name="person-outline" size={18} color={GREEN} />
        </View>

        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{session.patientName}</Text>

          <Text style={styles.sessionSubtitle}>
            {formatDate(session.startsAt)}
            {" • "}
            {formatTime(session.startsAt)} WIB
          </Text>
        </View>

        <View style={styles.sessionRight}>
          <StatusPill status={session.status} />
          <Ionicons name="chevron-forward" size={14} color="#87958C" />
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="leaf-outline" size={22} color={GREEN} />
          </View>

          <View>
            <Text style={styles.brandName}>NutriCare AI</Text>
            <Text style={styles.brandSubtitle}>• Portal Praktisi</Text>
          </View>
        </View>

        <Pressable
          style={styles.notificationButton}
          onPress={() => router.push("/nutritionist-schedule")}
        >
          <Ionicons name="notifications-outline" size={22} color="#364E40" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {tab === "home" && (
          <>
            <View style={styles.statusHeader}>
              <View style={styles.onlineBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.onlineText}>Akun Aktif</Text>
              </View>

              <Text style={styles.todayText}>{formatDate(now)}</Text>
            </View>

            <Text style={styles.greeting}>{greeting()}, Ahli Gizi!</Text>

            <Text style={styles.expertName}>{expert.display_name}</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Statistik Hari Ini</Text>
              <Text style={styles.sectionHint}>Tarik untuk perbarui</Text>
            </View>

            <View style={styles.statsRow}>
              <StatCard
                value={todaySessions.length}
                label="Total Sesi"
                icon="calendar-outline"
                tint="#E2F3EB"
              />
              <StatCard
                value={todayWaiting}
                label="Menunggu"
                icon="time-outline"
                tint="#C9FBE4"
              />
              <StatCard
                value={todayCompleted}
                label="Selesai"
                icon="checkmark-circle-outline"
                tint="#EAF0FC"
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Konsultasi Utama</Text>
              <View style={styles.greenDot} />
            </View>

            {mainSession ? (
              <View style={styles.mainCard}>
                <View style={styles.mainTop}>
                  <View style={styles.readyBadge}>
                    <Ionicons name="radio-button-on" size={11} color={GREEN} />
                    <Text style={styles.readyText}>
                      {isMainReady
                        ? "Sesi Terdekat • Siap Dimulai"
                        : "Sesi Terdekat • Terkonfirmasi"}
                    </Text>
                  </View>

                  <Text style={styles.mainDate}>
                    {minutesToMain !== null &&
                    minutesToMain >= 0 &&
                    minutesToMain <= 60
                      ? `Dalam ${minutesToMain} menit`
                      : formatDate(mainSession.startsAt)}
                  </Text>
                </View>

                <View style={styles.mainPatientRow}>
                  <View style={styles.avatarMain}>
                    <Ionicons name="person" size={24} color="#537BA5" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.mainPatientName}>
                      {mainSession.patientName}
                    </Text>

                    <Text style={styles.mainPatientInfo}>
                      Konsultasi gizi terjadwal
                    </Text>

                    <Text style={styles.topicText}>Konsultasi via chat</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={17} color={GREEN} />
                    <View>
                      <Text style={styles.metaLabel}>Waktu</Text>
                      <Text style={styles.metaValue}>
                        {formatTime(mainSession.startsAt)} WIB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={17}
                      color={GREEN}
                    />
                    <View>
                      <Text style={styles.metaLabel}>Metode</Text>
                      <Text style={styles.metaValue}>Chat Online</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.mainButton,
                    !isMainReady && styles.inactiveButton,
                  ]}
                  onPress={() => {
                    if (isMainReady) {
                      openChat(mainSession);
                      return;
                    }

                    const sessionDate = new Date(
                      mainSession.startsAt + 7 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .slice(0, 10);

                    router.push({
                      pathname: "/nutritionist-schedule",
                      params: {
                        date: sessionDate,
                        bookingId: mainSession.id,
                      },
                    });
                  }}
                >
                  <Text style={styles.mainButtonText}>
                    {isMainReady
                      ? "Mulai Konsultasi"
                      : "Lihat Jadwal Konsultasi"}
                  </Text>

                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={27}
                  color={GREEN}
                />
                <Text style={styles.emptyTitle}>Belum Ada Konsultasi</Text>
                <Text style={styles.emptyDescription}>
                  Sesi pasien yang sudah terkonfirmasi akan muncul di sini.
                </Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Jadwal Sesi Selanjutnya</Text>
              <Text style={styles.sectionHint}>
                {nextSessions.length} Pasien
              </Text>
            </View>

            <View style={styles.sessionList}>
              {nextSessions.length > 0 ? (
                nextSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))
              ) : (
                <Text style={styles.noSessionText}>
                  Belum ada sesi berikutnya.
                </Text>
              )}
            </View>

            <Pressable
              style={styles.outlineButton}
              onPress={() => router.push("/nutritionist-schedule")}
            >
              <Ionicons name="calendar-outline" size={17} color={GREEN} />
              <Text style={styles.outlineButtonText}>Lihat Jadwal Lengkap</Text>
            </Pressable>

            <View style={styles.assistantCard}>
              <View style={styles.assistantIcon}>
                <Ionicons name="sparkles" size={18} color={GREEN} />
              </View>

              <Text style={styles.assistantText}>
                <Text style={styles.assistantBold}>NutriCare Assistant: </Text>

                {todaySessions.length === 0
                  ? "Belum ada sesi konsultasi terkonfirmasi hari ini."
                  : `Hari ini terdapat ${todaySessions.length} sesi konsultasi. ${todayWaiting} sesi menunggu dan ${todayCompleted} sesi selesai.`}

                {mainSession
                  ? ` Konsultasi terdekat dijadwalkan ${formatDate(mainSession.startsAt)} pukul ${formatTime(mainSession.startsAt)} WIB.`
                  : ""}
              </Text>
            </View>
          </>
        )}

        {tab === "schedule" && (
          <>
            <Text style={styles.pageTitle}>Jadwal Konsultasi</Text>
            <Text style={styles.pageSubtitle}>
              Daftar booking dan jadwal konsultasi Anda.
            </Text>

            <View style={styles.sessionList}>
              {scheduled.length > 0 ? (
                scheduled.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={30} color={GREEN} />
                  <Text style={styles.emptyTitle}>Belum Ada Jadwal</Text>
                  <Text style={styles.emptyDescription}>
                    Jadwal booking pasien akan ditampilkan di sini.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={styles.pageTitle}>Riwayat Konsultasi</Text>
            <Text style={styles.pageSubtitle}>
              Konsultasi yang telah selesai.
            </Text>

            <View style={styles.sessionList}>
              {history.length > 0 ? (
                history.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={30} color={GREEN} />
                  <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
                  <Text style={styles.emptyDescription}>
                    Konsultasi selesai akan muncul di sini.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {tab === "profile" && (
          <NutritionistProfilePanel
            expert={expert}
            email={accountEmail}
            education={expert.education_formal}
            licenseNumber={expert.license_number}
            experience={
              expert.experience_years === null
                ? null
                : `${expert.experience_years} tahun`
            }
            upcomingCount={upcoming.length}
            completedCount={history.length}
            nextSessionStartsAt={upcoming[0]?.startsAt ?? null}
            onOpenSchedule={() => router.push("/nutritionist-schedule")}
            onLogout={() => {
              void logout();
            }}
          />
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key;

          return (
            <Pressable
              key={item.key}
              style={styles.navItem}
              onPress={() => {
                if (item.key === "schedule") {
                  router.push("/nutritionist-schedule");
                } else if (item.key === "history") {
                  router.push("/nutritionist-history");
                } else {
                  setTab(item.key);
                }
              }}
            >
              <View style={[styles.navIcon, active && styles.navIconActive]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? GREEN : "#8A9990"}
                />
              </View>

              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 16,
  },
  muted: {
    color: "#6D7D72",
  },
  errorText: {
    color: "#A24129",
    textAlign: "center",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0EB",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  logo: {
    width: 37,
    height: 37,
    backgroundColor: "#E2F5EA",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    color: DARK,
    fontWeight: "800",
    fontSize: 16,
  },
  brandSubtitle: {
    fontSize: 10,
    color: "#7A8F82",
    marginTop: 2,
  },
  notificationButton: {
    padding: 9,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F9EE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#12A968",
  },
  onlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: GREEN,
  },
  todayText: {
    fontSize: 11,
    color: "#8A938C",
  },
  greeting: {
    fontSize: 13,
    color: "#61766A",
    marginBottom: 3,
  },
  expertName: {
    fontSize: 21,
    fontWeight: "800",
    color: GREEN,
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#193D2C",
    fontWeight: "800",
  },
  sectionHint: {
    fontSize: 10,
    color: "#69907A",
  },
  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 13,
    minHeight: 109,
    borderWidth: 1,
    borderColor: "#ECF1ED",
  },
  statIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#183B2C",
  },
  statLabel: {
    fontSize: 11,
    color: "#7A867C",
    marginTop: 2,
  },
  mainCard: {
    backgroundColor: "#EFFCF6",
    borderWidth: 1,
    borderColor: "#C4F0D9",
    borderRadius: 23,
    padding: 16,
    marginBottom: 25,
  },
  mainTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D2F8E4",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    flexShrink: 1,
  },
  readyText: {
    fontSize: 10,
    color: GREEN,
    fontWeight: "700",
  },
  mainDate: {
    fontSize: 10,
    color: "#718A7B",
  },
  mainPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
    marginBottom: 16,
    gap: 11,
  },
  avatarMain: {
    width: 51,
    height: 51,
    borderRadius: 26,
    backgroundColor: "#DFE8FA",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPatientName: {
    fontSize: 15,
    color: "#1B382A",
    fontWeight: "800",
  },
  mainPatientInfo: {
    fontSize: 11,
    color: "#708376",
    marginTop: 4,
  },
  topicText: {
    fontSize: 10,
    color: GREEN,
    backgroundColor: "#DCF5E7",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    marginTop: 7,
  },
  metaRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
    gap: 8,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaLabel: {
    fontSize: 10,
    color: "#829187",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#233E30",
    marginTop: 3,
  },
  mainButton: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  inactiveButton: {
    backgroundColor: "#427C65",
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E7EEE9",
  },
  emptyTitle: {
    color: "#264E39",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyDescription: {
    color: "#7B8A7E",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  sessionList: {
    gap: 10,
    marginBottom: 13,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9EFEA",
    gap: 11,
  },
  avatarSmall: {
    width: 41,
    height: 41,
    borderRadius: 22,
    backgroundColor: "#E4EAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#243C2D",
  },
  sessionSubtitle: {
    fontSize: 10,
    color: "#8B968E",
    marginTop: 5,
  },
  sessionRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  statusPill: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  noSessionText: {
    fontSize: 12,
    color: "#8A968D",
    textAlign: "center",
    padding: 17,
  },
  outlineButton: {
    backgroundColor: "#F2F6FB",
    borderWidth: 1,
    borderColor: "#DDEAE3",
    borderRadius: 17,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 13,
    gap: 9,
    marginBottom: 23,
  },
  outlineButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
  },
  assistantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DAEEE2",
    padding: 13,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
  },
  assistantIcon: {
    width: 38,
    height: 38,
    backgroundColor: "#D9FBEA",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  assistantText: {
    flex: 1,
    fontSize: 11,
    color: "#65796B",
    lineHeight: 17,
  },
  assistantBold: {
    color: GREEN,
    fontWeight: "800",
  },
  pageTitle: {
    color: DARK,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 8,
  },
  pageSubtitle: {
    color: "#7B8B7F",
    fontSize: 12,
    marginTop: 7,
    marginBottom: 25,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EEE8",
  },
  profileImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#E6F5EA",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
    marginTop: 17,
    textAlign: "center",
  },
  profileSpecialty: {
    fontSize: 12,
    color: "#728779",
    marginTop: 8,
    textAlign: "center",
  },
  demoBadge: {
    fontSize: 11,
    color: "#9B6A14",
    backgroundColor: "#FFF2D9",
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginTop: 13,
    borderRadius: 20,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#FFF0EF",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: {
    color: "#B42318",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingHorizontal: 25,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EEE9",
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  navIcon: {
    width: 74,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    overflow: "hidden",
  },
  navIconActive: {
    backgroundColor: "#B9F7D9",
    borderRadius: 999,
  },

  navLabel: {
    fontSize: 10,
    color: "#8A9990",
    fontWeight: "600",
  },
  navLabelActive: {
    color: GREEN,
    fontWeight: "800",
  },
});
