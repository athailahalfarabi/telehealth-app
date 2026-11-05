
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

const GREEN = "#087A55";
const DARK = "#183C2B";
const MUTED = "#73877A";

type Booking = {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  slot_id: string;
  status: string;
};

type Slot = {
  starts_at: string;
  ends_at: string;
};

type Intake = {
  chief_concern: string;
  share_health_profile: boolean;
  nutrition_goal: string | null;
  activity_level: string | null;
  allergies: string[] | null;
  medical_conditions: string[] | null;
  notes: string | null;
};

const goalLabels: Record<string, string> = {
  maintain: "Menjaga Berat Badan Ideal",
  lose_weight: "Menurunkan Berat Badan",
  gain_muscle: "Menaikkan Massa Otot",
  blood_sugar: "Manajemen Gula Darah",
};

const activityLabels: Record<string, string> = {
  low: "Ringan",
  moderate: "Sedang",
  high: "Tinggi",
};

const conditionLabels: Record<string, string> = {
  gerd: "Maag / GERD",
  diabetes: "Diabetes",
  hypertension: "Hipertensi",
};

const allergyLabels: Record<string, string> = {
  seafood: "Alergi Makanan Laut",
  lactose: "Intoleransi Laktosa",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function displayList(
  values: string[] | null,
  labels: Record<string, string>
) {
  if (!Array.isArray(values) || values.length === 0) {
    return "Tidak dicantumkan";
  }
  return values.map((v) => labels[v] ?? v).join(", ");
}

function statusLabel(status: string) {
  if (status === "paid_simulated") return "Terkonfirmasi";
  if (status === "completed") return "Selesai";
  if (status === "pending_payment") return "Menunggu Bayar";
  if (status === "cancelled") return "Dibatalkan";
  return status;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function NutritionistSessionDetail() {
  const { bookingId } =
    useLocalSearchParams<{ bookingId?: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [intakeError, setIntakeError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setErrorMessage("");
        setIntakeError("");
        setBooking(null);
        setSlot(null);
        setIntake(null);

        try {
          if (!bookingId) {
            throw new Error("ID booking tidak tersedia.");
          }

          const { data: auth, error: authError } =
            await supabase.auth.getUser();

          if (authError) throw authError;

          if (!auth.user) {
            router.replace("/login");
            return;
          }

          const { data: profile, error: roleError } =
            await supabase
              .from("profiles")
              .select("role")
              .eq("id", auth.user.id)
              .single();

          if (roleError) throw roleError;

          if (profile?.role !== "nutritionist") {
            throw new Error(
              "Halaman ini hanya untuk akun ahli gizi."
            );
          }

          const { data: expert, error: expertError } =
            await supabase
              .from("nutritionists")
              .select("id")
              .eq("account_id", auth.user.id)
              .single();

          if (expertError) throw expertError;

          if (!expert) {
            throw new Error("Profil ahli gizi tidak ditemukan.");
          }

          // Hanya booking ahli gizi yang sedang login
          const { data: bookingData, error: bookingError } =
            await supabase
              .from("consultation_bookings")
              .select(
                "id, patient_id, nutritionist_id, slot_id, status"
              )
              .eq("id", bookingId)
              .eq("nutritionist_id", expert.id)
              .maybeSingle();

          if (bookingError) throw bookingError;

          if (!bookingData) {
            throw new Error(
              "Booking tidak ditemukan atau tidak diizinkan."
            );
          }

          const { data: slotData, error: slotError } =
            await supabase
              .from("consultation_slots")
              .select("starts_at, ends_at")
              .eq("id", bookingData.slot_id)
              .single();

          if (slotError) throw slotError;

          const confirmed =
            bookingData.status === "paid_simulated" ||
            bookingData.status === "completed";

          let name =
            `Pasien ${bookingData.patient_id
              .slice(0, 6)
              .toUpperCase()}`;

          if (confirmed) {
            const { data: patientProfile } =
              await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", bookingData.patient_id)
                .maybeSingle();

            if (patientProfile?.full_name?.trim()) {
              name = patientProfile.full_name.trim();
            }
          }

          let intakeData: Intake | null = null;
          let intakeMessage = "";

          // Intake hanya dibaca untuk sesi terkonfirmasi
          if (confirmed) {
            const result = await supabase
              .from("consultation_intakes")
              .select(
                "chief_concern, share_health_profile, nutrition_goal, activity_level, allergies, medical_conditions, notes"
              )
              .eq("booking_id", bookingData.id)
              .maybeSingle();

            if (result.error) {
              intakeMessage =
                "Gagal membaca informasi awal: " +
                result.error.message;
            } else {
              intakeData = result.data as Intake | null;
            }
          }

          if (!active) return;

          setBooking(bookingData as Booking);
          setSlot(slotData as Slot);
          setPatientName(name);
          setIntake(intakeData);
          setIntakeError(intakeMessage);
        } catch (error) {
          if (!active) return;

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat detail sesi."
          );
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [bookingId])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.muted}>
          Memuat detail konsultasi...
        </Text>
      </SafeAreaView>
    );
  }

  if (!booking || !slot || errorMessage) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={38}
          color="#B45309"
        />
        <Text style={styles.errorText}>
          {errorMessage || "Data sesi tidak tersedia."}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const confirmed =
    booking.status === "paid_simulated" ||
    booking.status === "completed";

  const duration = Math.max(
    0,
    Math.round(
      (new Date(slot.ends_at).getTime() -
        new Date(slot.starts_at).getTime()) / 60000
    )
  );

  const now = Date.now();
  const ready =
    booking.status === "paid_simulated" &&
    now >= new Date(slot.starts_at).getTime() - 15 * 60000 &&
    now < new Date(slot.ends_at).getTime();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backCircle}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={GREEN}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Detail Sesi</Text>
          <Text style={styles.headerSubtitle}>
            Informasi Konsultasi Pasien
          </Text>
        </View>

        <Ionicons
          name="clipboard-outline"
          size={24}
          color={GREEN}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFIL PASIEN */}
        <View style={styles.card}>
          <View style={styles.patientRow}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={25}
                color={GREEN}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>
                {patientName}
              </Text>
              <Text style={styles.muted}>
                Konsultasi Gizi • Chat Online
              </Text>
            </View>
          </View>

          <View style={styles.statusPill}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={GREEN}
            />
            <Text style={styles.statusText}>
              {statusLabel(booking.status)}
            </Text>
          </View>
        </View>

        {/* JADWAL */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={GREEN}
            />{" "}
            Jadwal Konsultasi
          </Text>

          <InfoRow
            label="Tanggal"
            value={formatDate(slot.starts_at)}
          />
          <InfoRow
            label="Waktu"
            value={`${formatTime(slot.starts_at)} - ${formatTime(
              slot.ends_at
            )} WIB`}
          />
          <InfoRow
            label="Durasi"
            value={`${duration} Menit`}
          />
          <InfoRow
            label="Metode"
            value="Chat Online"
          />
        </View>

        {/* INFORMASI AWAL */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={GREEN}
            />{" "}
            Informasi Awal Konsultasi
          </Text>

          {!confirmed ? (
            <Text style={styles.muted}>
              Informasi awal tersedia setelah pembayaran
              simulasi terkonfirmasi.
            </Text>
          ) : intakeError ? (
            <Text style={styles.errorText}>
              {intakeError}
            </Text>
          ) : intake ? (
            <>
              <Text style={styles.fieldLabel}>
                Pertanyaan atau Keluhan Pasien
              </Text>
              <View style={styles.highlightBox}>
                <Text style={styles.concern}>
                  {intake.chief_concern}
                </Text>
              </View>

              {intake.share_health_profile ? (
                <>
                  <Text style={styles.fieldLabel}>
                    Ringkasan Profil Kesehatan
                  </Text>

                  <InfoRow
                    label="Target Nutrisi"
                    value={
                      intake.nutrition_goal
                        ? goalLabels[intake.nutrition_goal] ??
                          intake.nutrition_goal
                        : "Tidak dicantumkan"
                    }
                  />
                  <InfoRow
                    label="Aktivitas"
                    value={
                      intake.activity_level
                        ? activityLabels[intake.activity_level] ??
                          intake.activity_level
                        : "Tidak dicantumkan"
                    }
                  />
                  <InfoRow
                    label="Alergi"
                    value={displayList(
                      intake.allergies,
                      allergyLabels
                    )}
                  />
                  <InfoRow
                    label="Kondisi yang Dilaporkan"
                    value={displayList(
                      intake.medical_conditions,
                      conditionLabels
                    )}
                  />

                  <Text style={styles.fieldLabel}>
                    Catatan Pasien
                  </Text>
                  <Text style={styles.notes}>
                    {intake.notes?.trim() ||
                      "Tidak ada catatan tambahan."}
                  </Text>
                </>
              ) : (
                <Text style={styles.privacyText}>
                  Pasien tidak memilih untuk membagikan
                  ringkasan Profil Kesehatan.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>
              Booking ini belum memiliki formulir
              informasi awal konsultasi.
            </Text>
          )}
        </View>

        {/* CHAT */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={GREEN}
            />{" "}
            Ruang Konsultasi
          </Text>

          <Text style={styles.muted}>
            {ready
              ? "Waktu sesi sudah dimulai. Koneksi chat ahli gizi akan dibuat pada tahap berikutnya."
              : booking.status === "paid_simulated"
                ? "Ruang konsultasi dibuka sesuai jadwal sesi."
                : "Chat hanya tersedia untuk sesi yang sudah terkonfirmasi dan berada dalam waktu konsultasi."}
          </Text>

          <View style={styles.disabledButton}>
            <Ionicons
              name="chatbubbles-outline"
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.disabledButtonText}>
              Masuk Ruang Chat
            </Text>
          </View>

          <Text style={styles.smallNote}>
            Tombol chat belum diaktifkan karena
            integrasi chat ahli gizi belum selesai.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  center: {
    flex: 1,
    backgroundColor: "#F8FAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  header: {
    backgroundColor: "#E9FFF3",
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backCircle: {
    backgroundColor: "#FFFFFF",
    padding: 11,
    borderRadius: 25,
  },
  headerTitle: {
    color: DARK,
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },
  content: {
    padding: 16,
    paddingBottom: 45,
    gap: 15,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E0EEE5",
    gap: 11,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#DCF8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  patientName: {
    color: DARK,
    fontSize: 17,
    fontWeight: "800",
  },
  muted: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E5FAEF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
    marginBottom: 7,
  },
  infoRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    gap: 5,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 11,
  },
  infoValue: {
    color: DARK,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: DARK,
    marginTop: 8,
  },
  highlightBox: {
    backgroundColor: "#F0FAF5",
    padding: 15,
    borderRadius: 16,
  },
  concern: {
    color: DARK,
    fontSize: 13,
    lineHeight: 21,
  },
  notes: {
    backgroundColor: "#F7F8FC",
    borderRadius: 14,
    padding: 14,
    color: DARK,
    fontSize: 12,
    lineHeight: 19,
  },
  privacyText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
  },
  disabledButton: {
    backgroundColor: "#A4B7AC",
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    gap: 8,
    marginTop: 10,
  },
  disabledButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  smallNote: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  errorText: {
    color: "#B45309",
    textAlign: "center",
    fontSize: 13,
  },
  backText: {
    color: GREEN,
    fontWeight: "800",
  },
});
