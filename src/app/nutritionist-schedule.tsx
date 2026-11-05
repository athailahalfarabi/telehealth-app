
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { supabase } from "../../supabase";

type Filter = "all" | "waiting" | "done";

type Expert = {
  id: string;
  display_name: string;
  specialty: string;
  photo_key: string | null;
  is_demo: boolean;
};

type Booking = {
  id: string;
  patient_id: string;
  slot_id: string;
  status: string;
};

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type Session = Booking & {
  patientName: string;
  startsAt: number;
  endsAt: number;
  chiefConcern: string | null;
  nutritionGoal: string | null;
  shareHealthProfile: boolean;
};

type Intake = {
  booking_id: string;
  chief_concern: string;
  nutrition_goal: string | null;
  share_health_profile: boolean;
};

function nutritionGoalText(value: string | null) {
  if (!value) return "Tidak dicantumkan";

  const labels: Record<string, string> = {
    maintain: "Menjaga Berat Badan Ideal",
    lose_weight: "Menurunkan Berat Badan",
    gain_muscle: "Menaikkan Massa Otot",
    blood_sugar: "Manajemen Gula Darah",
  };

  return labels[value] ?? value;
}

const GREEN = "#087A55";
const DARK = "#183C2B";
const BG = "#F9F9FD";
const DAY = 24 * 60 * 60 * 1000;
const WIB = 7 * 60 * 60 * 1000;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];


function dayKey(timestamp: number) {
  const date = new Date(timestamp + WIB);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayStart() {
  return Date.parse(`${dayKey(Date.now())}T00:00:00+07:00`);
}

function formatWib(
  timestamp: number,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    ...options,
  }).format(new Date(timestamp));
}

function timeWib(timestamp: number) {
  return formatWib(timestamp, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fallbackName(patientId: string) {
  return `Pasien ${patientId.slice(0, 6).toUpperCase()}`;
}

function statusText(status: string, ready: boolean) {
  if (status === "completed") return "Selesai";
  if (status === "pending_payment") return "Menunggu Bayar";
  if (status === "cancelled") return "Dibatalkan";
  if (ready) return "Siap Dimulai";
  if (status === "paid_simulated") return "Terkonfirmasi";
  return status;
}

export default function NutritionistSchedule() {
  const { date: requestedDate, bookingId: requestedBookingId } =
  useLocalSearchParams<{
    date?: string;
    bookingId?: string;
  }>();

const scheduleScrollRef =
  useRef<React.ElementRef<typeof ScrollView>>(null);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const [selectedDay, setSelectedDay] = useState(
    () => dayKey(Date.now())
  );

  
const [weekStart, setWeekStart] = useState(() => {
  const start = todayStart();

  const weekday = new Date(start + WIB).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;

  return start - daysFromMonday * DAY;
});



useEffect(() => {
  if (
    !requestedDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
  ) {
    return;
  }

  const start = Date.parse(
    `${requestedDate}T00:00:00+07:00`
  );

  if (
    !Number.isFinite(start) ||
    dayKey(start) !== requestedDate
  ) {
    return;
  }

  const weekday = new Date(
    start + WIB
  ).getUTCDay();

  const daysFromMonday = (weekday + 6) % 7;

  setSelectedDay(requestedDate);
  setFilter("all");
  setWeekStart(
    start - daysFromMonday * DAY
  );
}, [requestedDate]);


const [monthPickerOpen, setMonthPickerOpen] =
  useState(false);

const [pickerYear, setPickerYear] =
  useState(
    () => Number(dayKey(Date.now()).slice(0, 4))
  );


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

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      if (profile?.role !== "nutritionist") {
        throw new Error(
          "Halaman ini hanya untuk akun ahli gizi."
        );
      }

      const { data: nutritionist, error: expertError } =
        await supabase
          .from("nutritionists")
          .select(
            "id, display_name, specialty, photo_key, is_demo"
          )
          .eq("account_id", user.id)
          .single();

      if (expertError) throw expertError;
      if (!nutritionist) {
        throw new Error("Profil ahli gizi belum tersedia.");
      }

      setExpert(nutritionist);

      const { data: bookings, error: bookingError } =
        await supabase
          .from("consultation_bookings")
          .select("id, patient_id, slot_id, status")
          .eq("nutritionist_id", nutritionist.id);

      if (bookingError) throw bookingError;

      const bookingRows = (bookings ?? []) as Booking[];

      if (bookingRows.length === 0) {
        setSessions([]);
        return;
      }

      const slotIds = [
        ...new Set(bookingRows.map((b) => b.slot_id)),
      ];

      const { data: slots, error: slotError } =
        await supabase
          .from("consultation_slots")
          .select("id, starts_at, ends_at")
          .in("id", slotIds);

      if (slotError) throw slotError;

      const slotMap = new Map(
        ((slots ?? []) as Slot[]).map((slot) => [
          slot.id,
          slot,
        ])
      );

      
const confirmedBookingIds = bookingRows
  .filter(
    (booking) =>
      booking.status === "paid_simulated" ||
      booking.status === "completed"
  )
  .map((booking) => booking.id);

const intakeMap = new Map<string, Intake>();

if (confirmedBookingIds.length > 0) {
  const { data: intakeRows, error: intakeError } =
    await supabase
      .from("consultation_intakes")
      .select(
        "booking_id, chief_concern, nutrition_goal, share_health_profile"
      )
      .in("booking_id", confirmedBookingIds);

  if (intakeError) throw intakeError;

  for (const intake of (intakeRows ?? []) as Intake[]) {
    intakeMap.set(intake.booking_id, intake);
  }
}


      
const rows: Session[] = bookingRows.flatMap(
  (booking) => {
    const slot = slotMap.get(booking.slot_id);

    if (!slot) return [];

    const intake = intakeMap.get(booking.id);

    return [{
      ...booking,
      patientName: fallbackName(booking.patient_id),
      startsAt: new Date(slot.starts_at).getTime(),
      endsAt: new Date(slot.ends_at).getTime(),
      chiefConcern: intake?.chief_concern ?? null,
      shareHealthProfile:
        intake?.share_health_profile ?? false,
      nutritionGoal: intake?.share_health_profile
        ? intake.nutrition_goal
        : null,
    }];
  }
);


      // Hanya membaca nama pasien dengan sesi terkonfirmasi
      // atau selesai, sesuai izin RLS Supabase.
      const confirmedIds = [
        ...new Set(
          rows
            .filter(
              (s) =>
                s.status === "paid_simulated" ||
                s.status === "completed"
            )
            .map((s) => s.patient_id)
        ),
      ];

      const patientMap = new Map<string, string>();

      if (confirmedIds.length > 0) {
        const { data: patients, error: patientError } =
          await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", confirmedIds);

        if (patientError) {
          console.warn(
            "Nama pasien tidak bisa dibaca:",
            patientError.message
          );
        } else {
          for (const patient of patients ?? []) {
            patientMap.set(
              patient.id,
              patient.full_name ?? ""
            );
          }
        }
      }

      setSessions(
        rows
          .map((session) => ({
            ...session,
            patientName:
              patientMap.get(session.patient_id)?.trim() ||
              fallbackName(session.patient_id),
          }))
          .sort((a, b) => a.startsAt - b.startsAt)
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data jadwal."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  function refresh() {
    setRefreshing(true);
    void loadData();
  }

  

const shiftWeek = useCallback(
  (direction: number) => {
    setWeekStart(
      (previous) => previous + direction * 7 * DAY
    );

    setSelectedDay((previous) => {
      const timestamp = Date.parse(
        `${previous}T00:00:00+07:00`
      );

      return dayKey(
        timestamp + direction * 7 * DAY
      );
    });
  },
  []
);


// Geser jari ke kiri atau kanan untuk pindah minggu
const weekSwipe = useMemo(
  () =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          Math.abs(gesture.dx) > 20 &&
          Math.abs(gesture.dx) >
            Math.abs(gesture.dy) * 1.3
        );
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -45) {
          shiftWeek(1);
        } else if (gesture.dx > 45) {
          shiftWeek(-1);
        }
      },
    }),
  [shiftWeek]
);

// Tampilkan pilihan bulan dan tahun
function showMonthPicker() {
  setPickerYear(Number(selectedDay.slice(0, 4)));
  setMonthPickerOpen(true);
}

// Ketika pengguna memilih bulan
function chooseMonth(monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, "0");

  const firstDay = Date.parse(
    `${pickerYear}-${month}-01T00:00:00+07:00`
  );

  // Cari hari Senin pada minggu yang memuat tanggal 1
  const weekday = new Date(firstDay + WIB).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;

  setWeekStart(firstDay - daysFromMonday * DAY);
  setSelectedDay(dayKey(firstDay));
  setMonthPickerOpen(false);
}


  function showDetail(session: Session) {
  router.push({
    pathname: "/nutritionist-session-detail",
    params: {
      bookingId: session.id,
    },
  });
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
        <Text style={styles.muted}>
          Memuat jadwal konsultasi...
        </Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !expert) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={42}
          color="#B45309"
        />

        <Text style={styles.error}>
          {errorMessage || "Profil tidak ditemukan."}
        </Text>

        <Pressable
          style={styles.actionButton}
          onPress={() => {
            setLoading(true);
            void loadData();
          }}
        >
          <Text style={styles.actionText}>Coba Lagi</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const today = dayKey(Date.now());
  const now = Date.now();

  const selectedSessions = sessions.filter((session) => {
    if (dayKey(session.startsAt) !== selectedDay) {
      return false;
    }

    if (filter === "waiting") {
      return (
        session.status === "paid_simulated" ||
        session.status === "pending_payment"
      );
    }

    if (filter === "done") {
      return session.status === "completed";
    }

    return true;
  });

  const todayCount = sessions.filter(
    (session) =>
      dayKey(session.startsAt) === today &&
      session.status !== "cancelled"
  ).length;

  const dates = Array.from(
    { length: 7 },
    (_, index) => weekStart + index * DAY
  );

  const monthTitle = formatWib(
  Date.parse(`${selectedDay}T00:00:00+07:00`),
  { month: "long", year: "numeric" }
);

  return (
    <SafeAreaView style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.replace("/nutritionist-dashboard")
          }
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={GREEN}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            Jadwal Konsultasi
          </Text>
          <Text style={styles.subtitle}>
            Ruang Ahli Gizi • Chat Online
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color={GREEN}
          />
        </View>
      </View>

      <ScrollView
        ref={scheduleScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[GREEN]}
          />
        }
      >
        {/* PROFIL AHLI GIZI */}
        <View style={styles.expertCard}>
          <Image
            source={
              expert.photo_key === "male"
                ? require("../../assets/images/dokterL.png")
                : require("../../assets/images/dokterP.png")
            }
            style={styles.expertPhoto}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.expertName}>
              {expert.display_name}
            </Text>
            <Text style={styles.expertSpecialty}>
              {expert.specialty}
            </Text>
            {expert.is_demo && (
              <Text style={styles.demoText}>
                Profil Demo
              </Text>
            )}
          </View>

          <View style={styles.onlinePill}>
            <Text style={styles.onlineText}>
              Chat Online
            </Text>
          </View>
        </View>

        {/* PILIH BULAN DAN MINGGU */}
        <View style={styles.monthRow}>
          <View style={styles.monthControls}>
            <Pressable onPress={() => shiftWeek(-1)}>
              <Ionicons
                name="chevron-back"
                size={18}
                color={GREEN}
              />
            </Pressable>

            
<Pressable
  style={styles.monthPickerTrigger}
  onPress={showMonthPicker}
>
  <Text style={styles.monthText}>
    {monthTitle}
  </Text>

  <Ionicons
    name="chevron-down"
    size={15}
    color={GREEN}
  />
</Pressable>


            <Pressable onPress={() => shiftWeek(1)}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={GREEN}
              />
            </Pressable>
          </View>

          <View style={styles.todayPill}>
            <Text style={styles.todayPillText}>
              Hari ini • {todayCount} Sesi
            </Text>
          </View>
        </View>

        {/* KALENDER HORIZONTAL */}
        {/* KALENDER HORIZONTAL */}
<View
  style={styles.dateRow}
  {...weekSwipe.panHandlers}
>
          {dates.map((timestamp) => {
            const key = dayKey(timestamp);
            const selected = selectedDay === key;

            const count = sessions.filter(
              (session) =>
                dayKey(session.startsAt) === key &&
                session.status !== "cancelled"
            ).length;

            return (
              <Pressable
                key={key}
                style={[
                  styles.dateBox,
                  selected && styles.dateBoxSelected,
                ]}
                onPress={() => setSelectedDay(key)}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selected && styles.dateSelectedText,
                  ]}
                >
                  {formatWib(timestamp, {
                    weekday: "short",
                  })}
                </Text>

                <Text
                  style={[
                    styles.dateNumber,
                    selected && styles.dateSelectedText,
                  ]}
                >
                  {formatWib(timestamp, {
                    day: "numeric",
                  })}
                </Text>

                {count > 0 && (
                  <View
                    style={[
                      styles.dateDot,
                      selected && styles.dateDotSelected,
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* FILTER STATUS */}
        <View style={styles.filterRow}>
          {([
            ["all", "Semua Sesi"],
            ["waiting", "Menunggu"],
            ["done", "Selesai"],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.filterPill,
                filter === key && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {filter === key ? "✓ " : ""}
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* INFO */}
        <View style={styles.infoBox}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={GREEN}
          />
          <Text style={styles.infoText}>
            Konsultasi dilakukan melalui chat teks.
            Jadwal ditampilkan sesuai booking pasien.
          </Text>
        </View>

        {/* DAFTAR SESI */}
        <Text style={styles.sectionTitle}>
          {selectedSessions.length} Sesi Konsultasi
        </Text>

        {selectedSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-clear-outline"
              size={34}
              color={GREEN}
            />

            <Text style={styles.emptyTitle}>
              Tidak Ada Jadwal
            </Text>

            <Text style={styles.emptyDesc}>
              Belum ada booking pada tanggal
              dan filter yang dipilih.
            </Text>
          </View>
        ) : (
          selectedSessions.map((session) => {
            const ready =
              session.status === "paid_simulated" &&
              now >= session.startsAt - 15 * 60 * 1000 &&
              now < session.endsAt;

            const label = statusText(
              session.status,
              ready
            );

            const initials = session.patientName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((word) => word[0].toUpperCase())
              .join("");

            return (
              
<View
  key={session.id}
  onLayout={(event) => {
    if (session.id === requestedBookingId) {
      const cardY = event.nativeEvent.layout.y;

      requestAnimationFrame(() => {
        scheduleScrollRef.current?.scrollTo({
          y: Math.max(0, cardY - 100),
          animated: true,
        });
      });
    }
  }}
  style={[
    styles.sessionCard,
    ready && styles.sessionCardReady,
    session.id === requestedBookingId && {
      borderColor: GREEN,
      borderWidth: 2,
      backgroundColor: "#F0FFF8",
    },
  ]}
>

                {/* PASIEN DAN STATUS */}
                <View style={styles.patientRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initials || "P"}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>
                      {session.patientName}
                    </Text>

                    <Text style={styles.patientTime}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={GREEN}
                      />{" "}
                      {timeWib(session.startsAt)}
                      {" - "}
                      {timeWib(session.endsAt)}
                      {" WIB"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.sessionStatus,
                      session.status === "completed"
                        ? styles.completedStatus
                        : session.status === "pending_payment"
                          ? styles.pendingStatus
                          : styles.confirmedStatus,
                    ]}
                  >
                    <Text style={styles.sessionStatusText}>
                      {label}
                    </Text>
                  </View>
                </View>
                
{/* INFORMASI KONSULTASI */}
<View style={styles.detailBox}>
  <Text style={styles.detailLabel}>
    Keluhan & Target Nutrisi
  </Text>

  {session.chiefConcern ? (
    <>
      <Text style={styles.detailValue}>
        {session.chiefConcern}
      </Text>

      <Text style={styles.detailNote}>
        {session.shareHealthProfile
          ? `Target Nutrisi: ${nutritionGoalText(
              session.nutritionGoal
            )}`
          : "Profil kesehatan tidak dibagikan pasien."}
      </Text>
    </>
  ) : (
    <Text style={styles.detailNote}>
      {session.status === "pending_payment"
        ? "Informasi awal tersedia setelah pembayaran terkonfirmasi."
        : "Informasi awal belum tersedia untuk booking ini."}
    </Text>
  )}
</View>


                <View style={styles.methodRow}>
                  <Text style={styles.methodText}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={13}
                      color={GREEN}
                    />{" "}
                    Format: Chat Interaktif
                  </Text>

                  <Text style={styles.durationText}>
                    30 Menit
                  </Text>
                </View>

                {/* TOMBOL SESI */}
                {ready ? (
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => openChat(session)}
                  >
                    <Text style={styles.actionText}>
                      Masuk Ruang Chat
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.detailButton}
                    onPress={() => showDetail(session)}
                  >
                    <Text style={styles.detailButtonText}>
                      Detail Sesi
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={GREEN}
                    />
                  </Pressable>
                )}

                {ready && (
                  <Text style={styles.chatNote}>
                    Koneksi chat ahli gizi masih dalam
                    tahap pengembangan.
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        {([
          ["home-outline", "Beranda", "home"],
          ["calendar", "Jadwal", "schedule"],
          ["time-outline", "Riwayat", "history"],
          ["person-outline", "Profil", "profile"],
        ] as const).map(([icon, label, tab]) => {
          const active = tab === "schedule";

          return (
            <Pressable
              key={tab}
              style={styles.navItem}
              onPress={() => {
                if (tab === "schedule") return;

                if (tab === "home") {
                  router.replace(
                    "/nutritionist-dashboard"
                  );
                  return;
                }

                router.replace({
                  pathname: "/nutritionist-dashboard",
                  params: { tab },
                });
              }}
            >
              <View
                style={[
                  styles.navIcon,
                  active && styles.navIconActive,
                ]}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={active ? GREEN : "#7A8C80"}
                />
              </View>

              <Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      
{/* MODAL PILIH BULAN */}
<Modal
  visible={monthPickerOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setMonthPickerOpen(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.monthModal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          Pilih Bulan
        </Text>

        <Pressable
          onPress={() => setMonthPickerOpen(false)}
        >
          <Ionicons
            name="close"
            size={23}
            color={DARK}
          />
        </Pressable>
      </View>

      <View style={styles.yearRow}>
        <Pressable
          onPress={() => setPickerYear((y) => y - 1)}
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={GREEN}
          />
        </Pressable>

        <Text style={styles.yearText}>
          {pickerYear}
        </Text>

        <Pressable
          onPress={() => setPickerYear((y) => y + 1)}
        >
          <Ionicons
            name="chevron-forward"
            size={23}
            color={GREEN}
          />
        </Pressable>
      </View>

      <View style={styles.monthGrid}>
        {MONTH_NAMES.map((name, index) => {
          const active =
            Number(selectedDay.slice(0, 4)) ===
              pickerYear &&
            Number(selectedDay.slice(5, 7)) ===
              index + 1;

          return (
            <Pressable
              key={name}
              style={[
                styles.monthItem,
                active && styles.monthItemActive,
              ]}
              onPress={() => chooseMonth(index)}
            >
              <Text
                style={[
                  styles.monthItemText,
                  active && styles.monthItemTextActive,
                ]}
              >
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  </View>
</Modal>

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
    gap: 15,
    padding: 24,
  },
  muted: {
    color: "#718176",
  },
  error: {
    color: "#A24129",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#E9FFF3",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK,
  },
  subtitle: {
    fontSize: 11,
    color: "#678978",
    marginTop: 4,
  },
  headerIcon: {
    padding: 11,
    borderRadius: 30,
    backgroundColor: "#D0F9E3",
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  expertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFEEE5",
    marginBottom: 22,
  },
  expertPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0F1E7",
  },
  expertName: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },
  expertSpecialty: {
    color: "#718579",
    fontSize: 11,
    marginTop: 4,
  },
  demoText: {
    fontSize: 10,
    color: "#9A6A1E",
    marginTop: 5,
  },
  onlinePill: {
    backgroundColor: "#DBFAE9",
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  onlineText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700",
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  monthText: {
    fontWeight: "800",
    color: DARK,
    fontSize: 15,
  },
  todayPill: {
    backgroundColor: "#E5F8ED",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 15,
  },
  todayPillText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  dateBox: {
    flex: 1,
    minHeight: 69,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E9EEE9",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  dateBoxSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  dateDay: {
    fontSize: 10,
    color: "#7B8A80",
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
  },
  dateSelectedText: {
    color: "#FFFFFF",
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  dateDotSelected: {
    backgroundColor: "#FFFFFF",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 15,
  },
  filterPill: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE5",
  },
  filterActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterText: {
    color: "#63766A",
    fontSize: 11,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  infoBox: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    backgroundColor: "#F1F5F8",
    borderRadius: 13,
    padding: 12,
    marginBottom: 21,
  },
  infoText: {
    flex: 1,
    color: "#63756D",
    fontSize: 11,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
    marginBottom: 13,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E0EAE4",
    padding: 15,
    marginBottom: 13,
  },
  sessionCardReady: {
    borderWidth: 1.5,
    borderColor: "#37D99D",
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 15,
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#D8F9E7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "800",
  },
  patientName: {
    color: DARK,
    fontWeight: "800",
    fontSize: 13,
  },
  patientTime: {
    color: "#7D8B80",
    fontSize: 10,
    marginTop: 5,
  },
  sessionStatus: {
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  confirmedStatus: {
    backgroundColor: "#DAF8E9",
  },
  pendingStatus: {
    backgroundColor: "#FFF0D8",
  },
  completedStatus: {
    backgroundColor: "#E5EAF5",
  },
  sessionStatusText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "800",
  },
  detailBox: {
    backgroundColor: "#F4F4FC",
    borderRadius: 14,
    padding: 13,
    marginBottom: 13,
  },
  detailLabel: {
    fontSize: 10,
    color: "#7C8292",
  },
  detailValue: {
    color: "#354B40",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  detailNote: {
    color: "#868D97",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  methodText: {
    color: "#4B6656",
    fontSize: 11,
  },
  durationText: {
    color: "#6C8976",
    fontSize: 11,
    fontWeight: "700",
  },
  actionButton: {
    backgroundColor: GREEN,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  detailButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F8FD",
    borderWidth: 1,
    borderColor: "#DCE8E3",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  detailButtonText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "700",
  },
  chatNote: {
    color: "#7B8B81",
    textAlign: "center",
    fontSize: 10,
    marginTop: 9,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    gap: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#E5EEE8",
  },
  emptyTitle: {
    fontSize: 15,
    color: DARK,
    fontWeight: "800",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#87968B",
    textAlign: "center",
    lineHeight: 18,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E7EEE9",
    paddingTop: 8,
    paddingBottom: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  navIcon: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  navIconActive: {
    backgroundColor: "#7BF0BD",
  },
  navLabel: {
    fontSize: 10,
    color: "#829087",
  },
  navLabelActive: {
    color: GREEN,
    fontWeight: "800",
  },
  
  
  monthPickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  monthModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: DARK,
  },

  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 24,
  },

  yearText: {
    fontSize: 21,
    fontWeight: "800",
    color: GREEN,
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  monthItem: {
    width: "30%",
    backgroundColor: "#F4F8F5",
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
  },

  monthItemActive: {
    backgroundColor: GREEN,
  },

  monthItemText: {
    color: "#53695B",
    fontSize: 12,
    fontWeight: "600",
  },

  monthItemTextActive: {
    color: "#FFFFFF",
  },


});
