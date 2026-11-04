
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
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

        const [expertResult, slotResult] =
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
          ]);

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

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_consultation_booking",
        {
          p_slot_id: selected.id,
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
        contentContainerStyle={cst.content}
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
