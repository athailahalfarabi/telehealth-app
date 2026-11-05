import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";
import { ConsultPhoto } from "../components/ConsultFlowUI";

const GREEN = "#087B58";
const INK = "#174538";
const GREY = "#71837C";
const BORDER = "#E3ECE8";

type SessionInfo = {
  patientName: string;
  expertName: string;
  expertSpecialty: string;
  expertPhoto: "female" | "male";
  startsAt: string;
  endsAt: string;
  status: string;
  concern: string | null;
};

type Note = { summary?: string; advice?: string; is_final?: boolean };

function dateWib(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function timeWib(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":");
}
function wibKey(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export default function NutritionistSessionResult() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [summary, setSummary] = useState("");
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        setErrorText("");
        try {
          if (!bookingId) throw new Error("ID booking tidak ditemukan.");
          const { data: auth, error: authError } =
            await supabase.auth.getUser();
          if (authError) throw authError;
          if (!auth.user) throw new Error("Silakan login kembali.");

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", auth.user.id)
            .single();
          if (profileError) throw profileError;
          if (profile?.role !== "nutritionist")
            throw new Error("Khusus akun ahli gizi.");

          const { data: expert, error: expertError } = await supabase
            .from("nutritionists")
            .select("id, display_name, specialty, photo_key")
            .eq("account_id", auth.user.id)
            .maybeSingle();
          if (expertError) throw expertError;
          if (!expert) throw new Error("Profil ahli gizi belum terhubung.");

          const { data: booking, error: bookingError } = await supabase
            .from("consultation_bookings")
            .select("id, patient_id, slot_id, status")
            .eq("id", bookingId)
            .eq("nutritionist_id", expert.id)
            .maybeSingle();
          if (bookingError) throw bookingError;
          if (
            !booking ||
            !["paid_simulated", "completed"].includes(booking.status)
          ) {
            throw new Error(
              "Sesi belum terkonfirmasi atau tidak dapat diakses.",
            );
          }

          const { data: slot, error: slotError } = await supabase
            .from("consultation_slots")
            .select("starts_at, ends_at")
            .eq("id", booking.slot_id)
            .single();
          if (slotError) throw slotError;
          if (!slot) throw new Error("Jadwal konsultasi tidak ditemukan.");

          // Nama dan keluhan hanya diminta setelah status booking terkonfirmasi.
          const [{ data: patient }, { data: intake }, noteResponse] =
            await Promise.all([
              supabase
                .from("profiles")
                .select("full_name")
                .eq("id", booking.patient_id)
                .maybeSingle(),
              supabase
                .from("consultation_intakes")
                .select("chief_concern")
                .eq("booking_id", booking.id)
                .maybeSingle(),
              supabase.rpc("get_nutritionist_consultation_note", {
                p_booking_id: booking.id,
              }),
            ]);
          if (noteResponse.error) throw noteResponse.error;
          if (!active) return;
          const note = (noteResponse.data ?? {}) as Note;
          setSummary(note.summary ?? "");
          setAdvice(note.advice ?? "");
          setInfo({
            patientName: patient?.full_name?.trim() || "Pasien",
            expertName: expert.display_name || "Ahli Gizi",
            expertSpecialty: expert.specialty || "Konsultasi Gizi",
            expertPhoto: expert.photo_key === "male" ? "male" : "female",
            startsAt: slot.starts_at,
            endsAt: slot.ends_at,
            status: booking.status,
            concern: intake?.chief_concern ?? null,
          });
        } catch (e) {
          if (active)
            setErrorText(
              e instanceof Error ? e.message : "Gagal memuat hasil.",
            );
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [bookingId]),
  );

  function backToList() {
    if (info?.status === "paid_simulated") {
      router.replace({
        pathname: "/nutritionist-schedule",
        params: {
          date: wibKey(info.startsAt),
          bookingId: bookingId ?? "",
        },
      });
      return;
    }

    router.replace("/nutritionist-history");
  }

  const canEdit =
    !!info &&
    info.status === "paid_simulated" &&
    now >= new Date(info.startsAt).getTime();
  const isCompleted = info?.status === "completed";

  async function storeDraft() {
    if (!bookingId || !canEdit || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("save_consultation_result_draft", {
        p_booking_id: bookingId,
        p_summary: summary.trim(),
        p_advice: advice.trim(),
      });
      if (error) throw error;
      Alert.alert(
        "Draft tersimpan",
        "Catatan hanya dapat dibuka oleh ahli gizi pada sesi ini.",
      );
    } catch (e) {
      Alert.alert(
        "Gagal menyimpan draft",
        e instanceof Error ? e.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!bookingId || !canEdit || saving) return;
    if (summary.trim().length < 10 || advice.trim().length < 10) {
      Alert.alert(
        "Catatan belum lengkap",
        "Ringkasan dan saran masing-masing minimal 10 karakter.",
      );
      return;
    }
    Alert.alert(
      "Selesaikan konsultasi?",
      "Ringkasan dan saran akan menjadi hasil resmi pasien.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan & Selesaikan",
          onPress: () => {
            void submitFinal();
          },
        },
      ],
    );
  }

  async function submitFinal() {
    if (!bookingId || !canEdit || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc(
        "complete_consultation_with_result",
        {
          p_booking_id: bookingId,
          p_summary: summary.trim(),
          p_advice: advice.trim(),
        },
      );
      if (error) throw error;
      Alert.alert(
        "Berhasil",
        "Hasil konsultasi sekarang tersedia untuk pasien.",
        [
          {
            text: "Lihat Riwayat",
            onPress: () => router.replace("/nutritionist-history"),
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        "Gagal menyelesaikan",
        e instanceof Error ? e.message : "Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={s.muted}>Memuat catatan konsultasi...</Text>
      </SafeAreaView>
    );
  if (!info || errorText)
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="alert-circle-outline" size={44} color="#B45309" />
        <Text style={s.muted}>{errorText || "Sesi tidak tersedia."}</Text>
        <Pressable onPress={backToList}>
          <Text style={s.link}>Kembali ke Riwayat</Text>
        </Pressable>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#F9FFFC", "#F5FBF9", "#F9F8FF"]}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <Pressable
            onPress={backToList}
            style={s.back}
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" size={21} color={INK} />
          </Pressable>
          <Text style={s.headerTitle}>Hasil Konsultasi</Text>
          <Ionicons name="notifications-outline" size={21} color={INK} />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
          >
            <View style={s.expertCard}>
              <ConsultPhoto photoKey={info.expertPhoto} size={43} />
              <View style={{ flex: 1 }}>
                <Text style={s.expertName}>{info.expertName}</Text>
                <Text style={s.tiny}>
                  {info.expertSpecialty} · NutriCare AI
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={GREEN} />
            </View>

            <View style={s.patientCard}>
              <View style={s.patientTitleRow}>
                <View style={s.circleIcon}>
                  <Ionicons name="person-outline" size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.patientName}>{info.patientName}</Text>
                  <Text style={s.tiny}>Pasien konsultasi gizi</Text>
                </View>
              </View>
              <View style={s.paleRow}>
                <Ionicons name="calendar-outline" size={16} color={GREEN} />
                <Text style={s.paleText}>
                  {dateWib(info.startsAt)} · {timeWib(info.startsAt)}–
                  {timeWib(info.endsAt)} WIB
                </Text>
              </View>
              <View
                style={[
                  s.paleRow,
                  { backgroundColor: isCompleted ? "#D9FBEA" : "#E6F9F3" },
                ]}
              >
                <Ionicons
                  name={
                    isCompleted ? "checkmark-circle-outline" : "time-outline"
                  }
                  size={16}
                  color={GREEN}
                />
                <Text style={s.paleText}>
                  {isCompleted
                    ? "Konsultasi selesai · Catatan tersimpan"
                    : "Sesi terkonfirmasi · Menunggu hasil akhir"}
                </Text>
              </View>
              {!!info.concern && (
                <View style={{ marginTop: 9 }}>
                  <Text style={s.fieldHint}>Fokus konsultasi</Text>
                  <Text style={s.concern} numberOfLines={3}>
                    {info.concern}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.fieldTop}>
              <Text style={s.label}>
                Ringkasan Konsultasi <Text style={{ color: "#E05265" }}>*</Text>
              </Text>
              <Text style={s.fieldHint}>Pembahasan & kondisi pasien</Text>
            </View>
            <View style={s.fieldCard}>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                textAlignVertical="top"
                editable={canEdit && !saving}
                maxLength={4000}
                style={s.textArea}
                placeholder="Tuliskan kebiasaan makan, keluhan yang dibahas, serta hasil asesmen gizi..."
                placeholderTextColor="#9AA9A1"
              />
              <View style={s.fieldFooter}>
                <Text style={s.verified}>
                  <Ionicons name="create-outline" size={12} /> Catatan ahli gizi
                </Text>
                <Text style={s.count}>{summary.length}/4000</Text>
              </View>
            </View>

            <View style={s.fieldTop}>
              <Text style={s.label}>
                Saran & Rekomendasi Ahli Gizi{" "}
                <Text style={{ color: "#E05265" }}>*</Text>
              </Text>
              <Text style={s.fieldHint}>Rencana tindak lanjut</Text>
            </View>
            <View style={s.fieldCard}>
              <TextInput
                value={advice}
                onChangeText={setAdvice}
                multiline
                textAlignVertical="top"
                editable={canEdit && !saving}
                maxLength={4000}
                style={s.textArea}
                placeholder="Tuliskan saran makanan, jadwal makan, dan rekomendasi tindak lanjut..."
                placeholderTextColor="#9AA9A1"
              />
              <View style={s.fieldFooter}>
                <Text style={s.verified}>
                  <Ionicons name="shield-checkmark-outline" size={12} /> Khusus
                  catatan konsultasi
                </Text>
                <Text style={s.count}>{advice.length}/4000</Text>
              </View>
            </View>

            <View style={s.notice}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#386FBB"
              />
              <Text style={s.noticeText}>
                Setelah disimpan sebagai hasil akhir, ringkasan dan saran akan
                muncul di riwayat konsultasi pasien.
              </Text>
            </View>
            {!canEdit && !isCompleted && (
              <Text style={s.muted}>
                Catatan dapat diisi setelah jadwal konsultasi dimulai.
              </Text>
            )}

            {isCompleted ? (
              <View style={[s.finishButton, { backgroundColor: "#D6F6E6" }]}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <Text style={[s.finishText, { color: GREEN }]}>
                  Hasil Konsultasi Tersimpan
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => void finish()}
                  disabled={!canEdit || saving}
                  style={[
                    s.finishButton,
                    (!canEdit || saving) && { opacity: 0.5 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={19} color="#FFF" />
                  )}
                  <Text style={s.finishText}>
                    Simpan & Selesaikan Konsultasi
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void storeDraft()}
                  disabled={!canEdit || saving}
                  style={[
                    s.draftButton,
                    (!canEdit || saving) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={s.draftText}>Simpan Sebagai Draft</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        
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
      color={GREY}
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
      color={GREY}
    />
    <Text style={s.navText}>Jadwal</Text>
  </Pressable>

  {/* RIWAYAT */}
  <Pressable
    onPress={() =>
      router.replace("/nutritionist-history")
    }
    style={s.navItem}
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
      color={GREY}
    />
    <Text style={s.navText}>Profil</Text>
  </Pressable>
</View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FFFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#F8FCF9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: GREEN, flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 35, gap: 14 },
  expertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderColor: BORDER,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  expertName: { fontSize: 13, color: INK, fontWeight: "800" },
  tiny: { color: GREY, fontSize: 10, marginTop: 3 },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D3F3E5",
    padding: 14,
    gap: 9,
  },
  patientTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E9F9F1",
    alignItems: "center",
    justifyContent: "center",
  },
  patientName: { color: INK, fontSize: 14, fontWeight: "800" },
  paleRow: {
    backgroundColor: "#F0F3FE",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
  },
  paleText: { color: INK, fontSize: 11, fontWeight: "600", flex: 1 },
  fieldHint: { fontSize: 10, color: GREY },
  concern: { color: INK, fontSize: 11, lineHeight: 18, marginTop: 5 },
  fieldTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: { color: INK, fontWeight: "800", fontSize: 13, flexShrink: 1 },
  fieldCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  textArea: {
    minHeight: 128,
    fontSize: 12,
    lineHeight: 19,
    color: INK,
    padding: 1,
  },
  fieldFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  verified: { color: GREEN, fontSize: 10, fontWeight: "600" },
  count: { color: GREY, fontSize: 10 },
  notice: {
    backgroundColor: "#EAF0FF",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  noticeText: { flex: 1, color: "#4B6281", fontSize: 11, lineHeight: 17 },
  finishButton: {
    backgroundColor: GREEN,
    borderRadius: 22,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 4,
  },
  finishText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  draftButton: { padding: 9, alignItems: "center", marginBottom: 4 },
  draftText: { color: GREEN, fontWeight: "800", fontSize: 12 },
  bottomNav: {
    backgroundColor: "#FFFFFF",
    borderTopColor: BORDER,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: "space-around",
  },
  navItem: { alignItems: "center", gap: 3, paddingVertical: 3, minWidth: 65 },
  navText: { fontSize: 10, color: GREY, fontWeight: "600" },
  muted: { color: GREY, fontSize: 12, textAlign: "center", lineHeight: 19 },
  link: { color: GREEN, fontWeight: "800", fontSize: 13 },
});
