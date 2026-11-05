
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import { cg, cst } from "../styles/consult.styles";
import {
  dateKey,
  dateLabel,
  longDate,
  doctorPhotos,
  formatRupiah,
  slotTime,
  type ConsultationSlot,
  type Nutritionist,
} from "../utils/consultation";



type HealthSummary = {
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

function readableList(
  values: string[] | null,
  labels: Record<string, string>
) {
  if (!values?.length) return "Tidak ada yang dicatat";
  return values.map((v) => labels[v] ?? v).join(", ");
}

export default function BookingScreen() {
  const { id, slot } = useLocalSearchParams<{
    id: string;
    slot?: string;
  }>();

  const [expert, setExpert] =
    useState<Nutritionist | null>(null);
  const [slots, setSlots] =
    useState<ConsultationSlot[]>([]);
  const [selectedId, setSelectedId] = useState("");

  
const [health, setHealth] =
  useState<HealthSummary | null>(null);

const [chiefConcern, setChiefConcern] = useState("");

const [shareProfile, setShareProfile] = useState(false);


  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!id) {
          throw new Error("Ahli gizi belum dipilih.");
        }

        const { data: userData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !userData.user) {
          router.replace("/login");
          return;
        }

        
const [expertResult, slotResult, healthResult] =
  await Promise.all([
    supabase
      .from("nutritionists")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("consultation_slots")
      .select("*")
      .eq("nutritionist_id", id)
      .eq("is_booked", false)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),

    supabase
      .from("patient_health_profiles")
      .select(
        "nutrition_goal, activity_level, allergies, medical_conditions, notes"
      )
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);

if (healthResult.error) {
  throw healthResult.error;
}

setHealth(
  (healthResult.data as HealthSummary | null) ?? null
);


        if (expertResult.error) throw expertResult.error;
        if (slotResult.error) throw slotResult.error;

        const available =
          (slotResult.data ?? []) as ConsultationSlot[];

        setExpert(expertResult.data as Nutritionist);
        setSlots(available);

        const initial =
          available.find((item) => item.id === slot) ??
          available[0];

        setSelectedId(initial?.id ?? "");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat booking."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, slot]);

  const selected = slots.find(
    (item) => item.id === selectedId
  );

  const selectedDay = selected
    ? dateKey(selected.starts_at)
    : "";

  const days = Array.from(
    new Set(slots.map((item) => dateKey(item.starts_at)))
  );

  const dailySlots = slots.filter(
    (item) => dateKey(item.starts_at) === selectedDay
  );

  async function handleBooking() {
    if (!selected || !expert || submitting) {
      Alert.alert(
        "Pilih Jadwal",
        "Pilih tanggal dan jam konsultasi terlebih dahulu."
      );
      return;
    }

    
if (chiefConcern.trim().length < 5) {
  Alert.alert(
    "Pertanyaan Belum Diisi",
    "Tuliskan apa yang ingin kamu konsultasikan, minimal 5 karakter."
  );
  return;
}

if (shareProfile && !health) {
  Alert.alert(
    "Profil Belum Tersedia",
    "Lengkapi Profil Kesehatan atau nonaktifkan pilihan berbagi."
  );
  return;
}

    setSubmitting(true);

    try {
      
const { data, error } = await supabase.rpc(
  "create_consultation_booking_with_intake",
  {
    p_slot_id: selected.id,
    p_chief_concern: chiefConcern.trim(),
    p_share_profile: shareProfile,
  }
);


      if (error) throw error;

      if (!data || typeof data !== "string") {
        throw new Error("Booking tidak menghasilkan ID.");
      }

      router.replace({
        pathname: "/payment",
        params: { bookingId: data },
      });
    } catch (error) {
      Alert.alert(
        "Booking Gagal",
        error instanceof Error
          ? error.message
          : "Jadwal sudah tidak tersedia. Pilih jam lain."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          cst.screen,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={cg.green}
        />
      </SafeAreaView>
    );
  }

  if (!expert) {
    return (
      <SafeAreaView
        style={[
          cst.screen,
          { padding: 24, justifyContent: "center" },
        ]}
      >
        <Text style={cst.sectionTitle}>
          Booking tidak tersedia
        </Text>

        <Text style={cst.noticeText}>
          {errorMessage}
        </Text>

        <Pressable
          style={[cst.primaryButton, { marginTop: 20 }]}
          onPress={() => router.replace("/experts")}
        >
          <Text style={cst.primaryText}>
            Kembali ke Daftar Ahli Gizi
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={cst.screen}
      edges={["top", "bottom"]}
    >
      <ScrollView
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={[
    cst.content,
    { paddingBottom: 120 },
  ]}
>
        {/* HEADER */}
        <View style={cst.header}>
          <Pressable
            style={cst.backCircle}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={cg.green}
            />
          </Pressable>

          <Text
            style={[
              cst.headerTitle,
              { color: cg.green },
            ]}
          >
            Booking Konsultasi
          </Text>
        </View>

        {/* PROFIL AHLI GIZI */}
        <View
          style={[
            cst.card,
            cst.bookingExpert,
            { marginTop: 2 },
          ]}
        >
          <Image
            source={doctorPhotos[expert.photo_key]}
            style={{
              width: 78,
              height: 78,
              borderRadius: 40,
              backgroundColor: "#DEF8E8",
              borderWidth: 2,
              borderColor: "#65EFB0",
            }}
            resizeMode="cover"
          />

          <View style={{ flex: 1 }}>
            <View style={cst.verifiedBadge}>
              <Text style={cst.verifiedText}>
                {expert.is_verified && !expert.is_demo
                  ? "STR & SIP Terverifikasi"
                  : "Profil Demo"}
              </Text>
            </View>

            <Text
              style={[
                cst.expertName,
                { marginTop: 8 },
              ]}
            >
              {expert.display_name}
            </Text>

            <Text style={cst.expertSpecialty}>
              {expert.specialty}
            </Text>
          </View>
        </View>

        {/* PILIH TANGGAL */}
        <View style={cst.card}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 9,
            }}
          >
            <Text style={cst.bookingSection}>
              Pilih Tanggal
            </Text>

            <View style={cst.miniPill}>
              <Text style={cst.miniPillText}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                />{" "}
                {selected
                  ? new Date(
                      selected.starts_at
                    ).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      month: "long",
                      year: "numeric",
                    })
                  : "Jadwal"}
              </Text>
            </View>
          </View>

          <Text style={cst.bookingDesc}>
            Pilih jadwal ketersediaan ahli gizi
          </Text>

          {days.length === 0 ? (
            <Text
              style={[
                cst.bookingDesc,
                { marginTop: 20 },
              ]}
            >
              Belum ada tanggal yang tersedia.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={cst.dayRow}
            >
              {days.map((day) => {
                const first = slots.find(
                  (item) =>
                    dateKey(item.starts_at) === day
                )!;

                const active = selectedDay === day;

                return (
                  <Pressable
                    key={day}
                    style={[
                      cst.dayChip,
                      active && cst.daySelected,
                    ]}
                    onPress={() =>
                      setSelectedId(first.id)
                    }
                  >
                    <Text
                      style={[
                        cst.dayText,
                        active && cst.dayTextSelected,
                      ]}
                    >
                      {dateLabel(first.starts_at)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* PILIH JAM */}
        <View style={cst.card}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Text style={cst.bookingSection}>
              Pilih Jam
            </Text>

            <Text
              style={{
                color: cg.muted,
                fontSize: 11,
              }}
            >
              ◷ Durasi {expert.session_minutes} menit
            </Text>
          </View>

          <View style={cst.slotGrid}>
            {dailySlots.map((item) => {
              const active = item.id === selectedId;

              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setSelectedId(item.id)
                  }
                  style={[
                    cst.slotChip,
                    {
                      borderRadius: 35,
                      minHeight: 57,
                    },
                    active && {
                      backgroundColor: cg.green,
                      borderColor: cg.green,
                    },
                  ]}
                >
                  <Text
                    style={[
                      cst.slotTime,
                      {
                        textAlign: "center",
                        color: active
                          ? "#FFFFFF"
                          : cg.text,
                      },
                    ]}
                  >
                    {slotTime(item)}
                    {active ? "  ✓" : "  ○"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* METODE KONSULTASI */}
        <View
          style={[
            cst.card,
            cst.privateCard,
            {
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 13,
            },
          ]}
        >
          <View style={cst.factIcon}>
            <Ionicons
              name="chatbubble"
              size={22}
              color={cg.green}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: cg.muted,
              }}
            >
              METODE KONSULTASI
            </Text>

            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: cg.greenDark,
                marginTop: 8,
              }}
            >
              Chat Online (Teks)
            </Text>

            <Text
              style={[
                cst.bookingDesc,
                { marginTop: 8 },
              ]}
            >
              Sesi konsultasi privat melalui
              aplikasi NutriCare AI.
            </Text>
          </View>

          <View style={cst.verifiedBadge}>
            <Text style={cst.verifiedText}>
              Privat
            </Text>
          </View>
        </View>

        
{/* INFORMASI AWAL KONSULTASI */}
<View
  style={[
    cst.card,
    {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#D7EFE2",
      padding: 18,
    },
  ]}
>
  {/* HEADER */}
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    }}
  >
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 15,
        backgroundColor: "#DDF8EA",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name="clipboard-outline"
        size={23}
        color={cg.green}
      />
    </View>

    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: cg.greenDark,
        }}
      >
        Informasi Awal Konsultasi
      </Text>

      <Text
        style={{
          color: cg.muted,
          fontSize: 11,
          lineHeight: 17,
          marginTop: 4,
        }}
      >
        Bantu ahli gizi memahami kebutuhanmu.
      </Text>
    </View>
  </View>

  {/* JUDUL PROFIL */}
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    }}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: "800",
        color: cg.greenDark,
      }}
    >
      Ringkasan Profil Kesehatan
    </Text>

    <View
      style={{
        backgroundColor: "#E5FAEF",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: cg.green,
          fontWeight: "700",
        }}
      >
        {health ? "✓ Sudah Terisi" : "Belum Terisi"}
      </Text>
    </View>
  </View>

  {health ? (
    <>
      {/* DUA KARTU INFORMASI */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#F0FAF5",
            padding: 14,
            borderRadius: 17,
            minHeight: 125,
          }}
        >
          <Ionicons
            name="flag-outline"
            size={20}
            color={cg.green}
          />

          <Text
            style={{
              fontSize: 11,
              color: cg.muted,
              marginTop: 11,
            }}
          >
            Target Nutrisi
          </Text>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: cg.greenDark,
              marginTop: 5,
            }}
          >
            {health.nutrition_goal
              ? goalLabels[health.nutrition_goal] ??
                health.nutrition_goal
              : "Belum diisi"}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: "#F4F4FC",
            padding: 14,
            borderRadius: 17,
            minHeight: 125,
          }}
        >
          <Ionicons
            name="walk-outline"
            size={20}
            color={cg.green}
          />

          <Text
            style={{
              fontSize: 11,
              color: cg.muted,
              marginTop: 11,
            }}
          >
            Aktivitas Harian
          </Text>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: cg.greenDark,
              marginTop: 5,
            }}
          >
            {health.activity_level
              ? activityLabels[health.activity_level] ??
                health.activity_level
              : "Belum diisi"}
          </Text>
        </View>
      </View>

      {/* RIWAYAT & CATATAN */}
      <View
        style={{
          backgroundColor: "#F7F9F8",
          borderRadius: 17,
          padding: 15,
          marginBottom: 18,
          gap: 9,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={cg.green}
          />

          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: cg.greenDark,
            }}
          >
            Riwayat & Catatan
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: cg.text }}>
          Alergi:{" "}
          {readableList(
            health.allergies,
            allergyLabels
          )}
        </Text>

        <Text style={{ fontSize: 12, color: cg.text }}>
          Kondisi yang dilaporkan:{" "}
          {readableList(
            health.medical_conditions,
            conditionLabels
          )}
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: cg.text,
            lineHeight: 18,
          }}
        >
          Catatan:{" "}
          {health.notes?.trim() || "Tidak ada"}
        </Text>
      </View>
    </>
  ) : (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#F4F7F6",
        marginBottom: 18,
        gap: 7,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          color: cg.greenDark,
        }}
      >
        Profil Kesehatan belum tersedia
      </Text>

      <Text
        style={{
          fontSize: 12,
          color: cg.muted,
          lineHeight: 18,
        }}
      >
        Kamu tetap bisa booking tanpa membagikan
        Profil Kesehatan.
      </Text>
    </View>
  )}

  {/* INPUT PERTANYAAN */}
  <Text
    style={{
      fontSize: 14,
      fontWeight: "800",
      color: cg.greenDark,
      marginBottom: 7,
    }}
  >
    Apa yang ingin kamu konsultasikan?
  </Text>

  <Text
    style={{
      fontSize: 11,
      color: cg.muted,
      lineHeight: 17,
      marginBottom: 12,
    }}
  >
    Ceritakan pertanyaan atau tujuan konsultasi
    khusus untuk sesi ini.
  </Text>

  <TextInput
    value={chiefConcern}
    onChangeText={setChiefConcern}
    multiline
    maxLength={500}
    textAlignVertical="top"
    placeholder="Contoh: Saya ingin mengatur jadwal makan agar lebih teratur..."
    placeholderTextColor="#A3ADA7"
    style={{
      minHeight: 115,
      backgroundColor: "#F8FAF9",
      borderWidth: 1,
      borderColor: "#DDEAE3",
      borderRadius: 17,
      padding: 15,
      fontSize: 13,
      lineHeight: 20,
      color: cg.text,
    }}
  />

  <Text
    style={{
      alignSelf: "flex-end",
      fontSize: 10,
      color: cg.muted,
      marginTop: 7,
      marginBottom: 17,
    }}
  >
    {chiefConcern.length}/500 karakter
  </Text>

  {/* PERSETUJUAN BERBAGI PROFIL */}
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{
      checked: shareProfile,
      disabled: !health,
    }}
    disabled={!health}
    onPress={() =>
      setShareProfile((previous) => !previous)
    }
    style={{
      flexDirection: "row",
      gap: 11,
      alignItems: "flex-start",
      padding: 14,
      backgroundColor: "#EBF9F1",
      borderRadius: 16,
      opacity: health ? 1 : 0.6,
    }}
  >
    <Ionicons
      name={
        shareProfile
          ? "checkbox"
          : "square-outline"
      }
      size={24}
      color={cg.green}
    />

    <Text
      style={{
        flex: 1,
        fontSize: 12,
        lineHeight: 19,
        color: cg.greenDark,
      }}
    >
      Saya setuju membagikan ringkasan Profil
      Kesehatan yang ditampilkan di atas kepada
      ahli gizi yang saya pilih untuk konsultasi ini.
    </Text>
  </Pressable>

  {/* KETERANGAN PRIVASI */}
  <View
    style={{
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
      alignItems: "flex-start",
    }}
  >
    <Ionicons
      name="lock-closed-outline"
      size={15}
      color={cg.green}
    />

    <Text
      style={{
        flex: 1,
        fontSize: 10,
        lineHeight: 16,
        color: cg.muted,
      }}
    >
      Pertanyaan sesi akan terlihat oleh ahli gizi
      setelah pembayaran simulasi terkonfirmasi.
      Data Profil Kesehatan hanya dibagikan jika
      kamu memberikan persetujuan.
    </Text>
  </View>
</View>


        {/* RINGKASAN BOOKING */}
        <View style={cst.card}>
          <Text
            style={[
              cst.bookingSection,
              { marginBottom: 18 },
            ]}
          >
            Ringkasan Booking
          </Text>

          <View style={cst.cardDivider} />

          {[
            {
              label: "Tanggal",
              value: selected
                ? longDate(selected.starts_at)
                : "Belum dipilih",
            },
            {
              label: "Jam",
              value: selected
                ? `${slotTime(selected)} WIB`
                : "Belum dipilih",
            },
            {
              label: "Durasi",
              value: `${expert.session_minutes} Menit`,
            },
            {
              label: "Sesi",
              value: "Konsultasi Diet & Nutrisi Personal",
            },
          ].map((item) => (
            <View
              key={item.label}
              style={cst.summaryRow}
            >
              <Text style={cst.summaryLabel}>
                {item.label}
              </Text>
              <Text style={cst.summaryValue}>
                {item.value}
              </Text>
            </View>
          ))}

          <View
            style={[
              cst.cardDivider,
              { marginTop: 15 },
            ]}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={cst.bookingSection}>
              Total Biaya
            </Text>

            <Text style={cst.totalPrice}>
              {formatRupiah(expert.price_idr)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={cst.bottomBar}>
        <View>
          <Text style={cst.totalLabel}>
            TOTAL BIAYA
          </Text>
          <Text style={cst.totalPrice}>
            {formatRupiah(expert.price_idr)}
          </Text>
        </View>

        <Pressable
          style={[
            cst.primaryButton,
            {
              flex: 1,
              opacity:
                selected && !submitting ? 1 : 0.5,
            },
          ]}
          disabled={!selected || submitting}
          onPress={handleBooking}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={cst.primaryText}>
                Lanjut Pembayaran
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
