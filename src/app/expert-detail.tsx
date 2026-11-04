
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import { cg, cst } from "../styles/consult.styles";
import {
  dateKey,
  dateLabel,
  doctorPhotos,
  formatRupiah,
  slotTime,
  type ConsultationSlot,
  type Nutritionist,
} from "../utils/consultation";

export default function ExpertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [expert, setExpert] =
    useState<Nutritionist | null>(null);
  const [slots, setSlots] =
    useState<ConsultationSlot[]>([]);

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!id) {
          throw new Error("ID ahli gizi tidak ditemukan.");
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

        if (available.length > 0) {
          setSelectedDay(dateKey(available[0].starts_at));
          setSelectedSlot(available[0].id);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat profil ahli gizi."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  const dates = Array.from(
    new Set(slots.map((slot) => dateKey(slot.starts_at)))
  );

  const dailySlots = slots.filter(
    (slot) => dateKey(slot.starts_at) === selectedDay
  );

  async function shareProfile() {
    if (!expert) return;

    await Share.share({
      message:
        `Profil NutriCare AI\n` +
        `${expert.display_name}\n` +
        `${expert.specialty}\n` +
        `Tarif demo: ${formatRupiah(expert.price_idr)} / sesi`,
    });
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          cst.screen,
          {
            alignItems: "center",
            justifyContent: "center",
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
          { padding: 25, justifyContent: "center" },
        ]}
      >
        <Text style={cst.sectionTitle}>
          Profil tidak tersedia
        </Text>
        <Text style={cst.noticeText}>
          {errorMessage}
        </Text>
        <Pressable
          style={[cst.primaryButton, { marginTop: 20 }]}
          onPress={() => router.replace("/experts")}
        >
          <Text style={cst.primaryText}>
            Kembali
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
      {/* HEADER */}
      <View
        style={[
          cst.header,
          {
            paddingHorizontal: 21,
            justifyContent: "space-between",
          },
        ]}
      >
        <Pressable
          style={cst.backCircle}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={cg.green}
          />
        </Pressable>

        <Text
          style={[
            cst.headerTitle,
            { fontSize: 17 },
          ]}
        >
          Detail Profil Ahli Gizi
        </Text>

        <Pressable
          style={cst.backCircle}
          onPress={shareProfile}
        >
          <Ionicons
            name="share-social-outline"
            size={23}
            color={cg.green}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 35,
        }}
      >
        {/* PROFIL UTAMA */}
        <LinearGradient
          colors={[
            "#BEF7E2",
            "#EDFCF8",
            "#FAF8FF",
          ]}
          style={cst.detailTop}
        >
          <View style={cst.portraitBox}>
            <Image
              source={doctorPhotos[expert.photo_key]}
              resizeMode="cover"
              style={cst.portrait}
            />

            <View
              style={[
                cst.onlineDot,
                {
                  width: 27,
                  height: 27,
                  borderRadius: 14,
                  bottom: 7,
                  right: 3,
                },
              ]}
            />
          </View>

          <View style={cst.verifiedBadge}>
            <Text style={cst.verifiedText}>
              {expert.is_verified && !expert.is_demo
                ? "✧ STR & SIP Terverifikasi"
                : "✧ Profil Demo NutriCare"}
            </Text>
          </View>

          <Text style={cst.detailName}>
            {expert.display_name}
          </Text>

          <Text style={cst.detailSpecialty}>
            {expert.specialty}
          </Text>

          <Text style={cst.detailBio}>
            {expert.bio}
          </Text>
        </LinearGradient>

        <View style={cst.content}>
          {/* LAYANAN KONSULTASI */}
          <View style={cst.sectionRow}>
            <Text style={cst.sectionTitle}>
              Layanan Konsultasi
            </Text>

            <View style={cst.miniPill}>
              <Text style={cst.miniPillText}>
                NutriCare
              </Text>
            </View>
          </View>

          <View style={cst.serviceCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={cst.serviceTitle}>
                  Konsultasi Gizi Online
                </Text>
                <Text style={cst.serviceDescription}>
                  Sesi konsultasi menggunakan chat
                </Text>
              </View>

              <View style={cst.methodPill}>
                <Text
                  style={{
                    color: cg.greenDark,
                    fontSize: 11,
                  }}
                >
                  ▢ Text Chat
                </Text>
              </View>
            </View>

            <View style={cst.factRow}>
              <View style={cst.factItem}>
                <View style={cst.factIcon}>
                  <Ionicons
                    name="time-outline"
                    color={cg.green}
                    size={20}
                  />
                </View>

                <View>
                  <Text style={cst.factLabel}>
                    Durasi
                  </Text>
                  <Text style={cst.factValue}>
                    {expert.session_minutes} Menit
                  </Text>
                </View>
              </View>

              <View style={cst.factItem}>
                <View style={cst.factIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    color={cg.green}
                    size={20}
                  />
                </View>

                <View style={{ flexShrink: 1 }}>
                  <Text style={cst.factLabel}>
                    Platform
                  </Text>
                  <Text style={cst.factValue}>
                    Chat NutriCare
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={cst.serviceText}>
                Tarif Sesi
              </Text>

              <Text style={cst.servicePrice}>
                {formatRupiah(expert.price_idr)}
                <Text style={{ fontSize: 11 }}>
                  {" "}/ sesi
                </Text>
              </Text>
            </View>
          </View>

          {/* JADWAL TERSEDIA */}
          <View
            style={[
              cst.sectionRow,
              { marginTop: 31, marginBottom: 1 },
            ]}
          >
            <View>
              <Text style={cst.sectionTitle}>
                Jadwal Tersedia
              </Text>
              <Text style={cst.headerSubtitle}>
                Pilih tanggal dan sesi konsultasi
              </Text>
            </View>
          </View>

          {slots.length === 0 ? (
            <View style={cst.notice}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={cg.green}
              />
              <Text style={cst.noticeText}>
                Belum ada jadwal tersedia.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={cst.dayRow}
              >
                {dates.map((day) => {
                  const firstSlot = slots.find(
                    (slot) =>
                      dateKey(slot.starts_at) === day
                  )!;

                  const active = selectedDay === day;

                  return (
                    <Pressable
                      key={day}
                      style={[
                        cst.dayChip,
                        active && cst.daySelected,
                      ]}
                      onPress={() => {
                        setSelectedDay(day);
                        setSelectedSlot(firstSlot.id);
                      }}
                    >
                      <Text
                        style={[
                          cst.dayText,
                          active && cst.dayTextSelected,
                        ]}
                      >
                        {active ? "✓  " : ""}
                        {dateLabel(firstSlot.starts_at)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={cst.slotGrid}>
                {dailySlots.map((slot) => {
                  const active = selectedSlot === slot.id;

                  return (
                    <Pressable
                      key={slot.id}
                      style={[
                        cst.slotChip,
                        active && cst.slotSelected,
                      ]}
                      onPress={() =>
                        setSelectedSlot(slot.id)
                      }
                    >
                      <Text
                        style={[
                          cst.slotTime,
                          active && { color: cg.greenDark },
                        ]}
                      >
                        {slotTime(slot)}
                      </Text>

                      <Text style={cst.slotAvailable}>
                        {active ? "✓ Dipilih" : "● Tersedia"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View
            style={[
              cst.notice,
              { backgroundColor: cg.white, marginTop: 24 },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={cg.green}
            />

            <Text style={cst.noticeText}>
              Konsultasi dilakukan melalui chat
              dengan akses terbatas untuk akun terkait.
              Data ahli gizi saat ini masih demo.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER BOOKING */}
      <View style={cst.bottomBar}>
        <View>
          <Text style={cst.totalLabel}>
            Total Biaya
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
              opacity: selectedSlot ? 1 : 0.5,
            },
          ]}
          disabled={!selectedSlot}
          onPress={() =>
            router.push({
              pathname: "/booking",
              params: {
                id: expert.id,
                slot: selectedSlot,
              },
            })
          }
        >
          <Text style={cst.primaryText}>
            Booking Konsultasi
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
