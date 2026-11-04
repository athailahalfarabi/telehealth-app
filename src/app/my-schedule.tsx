
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  ConsultBottomNav,
  ConsultHeader,
  ConsultPhoto,
} from "../components/ConsultFlowUI";
import { cf, fs } from "../styles/consult-flow.styles";
import {
  consultDay,
  consultDayNumber,
  consultMonth,
  consultTime,
  getMyConsultBookings,
  consultStatusText,
  type ConsultBooking,
} from "../utils/consult-flow";

export default function MyScheduleScreen() {
  const [bookings, setBookings] =
    useState<ConsultBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          setLoading(true);
          setErrorText("");

          const all = await getMyConsultBookings();

          if (active) {
            setBookings(
              all
                .filter((booking) =>
                  ["pending_payment", "paid_simulated"].includes(
                    booking.status
                  )
                )
                .sort(
                  (a, b) =>
                    new Date(
                      a.slot?.starts_at ?? 0
                    ).getTime() -
                    new Date(
                      b.slot?.starts_at ?? 0
                    ).getTime()
                )
            );
          }
        } catch (error) {
          if (active) {
            setErrorText(
              error instanceof Error
                ? error.message
                : "Gagal memuat jadwal."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [])
  );

  const tips = [
    "Catat keluhan serta tujuan perubahan pola makan.",
    "Siapkan ringkasan kebiasaan makan beberapa hari terakhir.",
    "Pastikan koneksi internet stabil saat berkirim pesan.",
  ];

  return (
    <SafeAreaView
      style={fs.screen}
      edges={["top", "bottom"]}
    >
      <LinearGradient
        colors={["#E8FFF4", "#FAF8FF", "#FAF8FF"]}
        style={{ flex: 1 }}
      >
        <ConsultHeader
          title="Jadwal Konsultasi"
          subtitle="Sesi konsultasimu"
          rightIcon="calendar-outline"
          onRightPress={() =>
            router.push("/consultation-history")
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={fs.scrollContent}
        >
          <View style={fs.introPill}>
            <Ionicons
              name="ellipse"
              size={12}
              color={cf.green}
            />

            <Text
              style={{
                flex: 1,
                color: cf.green,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Jadwal konsultasi NutriCare AI
            </Text>

            <View style={fs.pill}>
              <Text style={fs.pillText}>
                {bookings.length} Sesi
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={cf.green}
              style={{ marginVertical: 40 }}
            />
          ) : errorText ? (
            <View style={fs.card}>
              <Text style={fs.subtext}>
                {errorText}
              </Text>
            </View>
          ) : bookings.length === 0 ? (
            <View
              style={[
                fs.card,
                {
                  alignItems: "center",
                  gap: 15,
                  paddingVertical: 36,
                },
              ]}
            >
              <Ionicons
                name="calendar-clear-outline"
                size={48}
                color={cf.green}
              />

              <Text style={fs.sectionTitle}>
                Belum Ada Jadwal
              </Text>

              <Text
                style={[
                  fs.subtext,
                  { textAlign: "center" },
                ]}
              >
                Pilih ahli gizi dan buat jadwal
                konsultasi pertamamu.
              </Text>

              <Pressable
                style={[
                  fs.primary,
                  { alignSelf: "stretch" },
                ]}
                onPress={() =>
                  router.push("/experts")
                }
              >
                <Text style={fs.primaryText}>
                  Cari Ahli Gizi
                </Text>
              </Pressable>
            </View>
          ) : (
            bookings.map((booking) => {
              const expert = booking.expert;
              const slot = booking.slot;

              if (!slot) return null;

              const paid =
                booking.status === "paid_simulated";

              const started =
                new Date(slot.starts_at).getTime() <=
                Date.now();

              const ended =
                new Date(slot.ends_at).getTime() <=
                Date.now();

              return (
                <View
                  key={booking.id}
                  style={fs.scheduleCard}
                >
                  {/* IDENTITAS AHLI GIZI */}
                  <View style={fs.expertRow}>
                    <ConsultPhoto
                      photoKey={
                        expert?.photo_key ?? "female"
                      }
                      size={69}
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={fs.expertName}>
                        {expert?.display_name ??
                          "Ahli Gizi"}
                      </Text>

                      <Text style={fs.expertSubtitle}>
                        {expert?.specialty ??
                          "Konsultasi Gizi Online"}
                      </Text>
                    </View>

                    <View style={fs.pill}>
                      <Text style={fs.pillText}>
                        {consultStatusText(
                          booking.status
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={fs.line} />

                  {/* TANGGAL DAN JAM */}
                  <View style={fs.dateTimeRow}>
                    <View style={fs.dateBox}>
                      <Text style={fs.dateWeekday}>
                        {consultDay(slot.starts_at)}
                      </Text>

                      <Text style={fs.dateNumber}>
                        {consultDayNumber(
                          slot.starts_at
                        )}
                      </Text>

                      <Text style={fs.dateMonth}>
                        {consultMonth(slot.starts_at)}
                      </Text>
                    </View>

                    <View style={fs.timeBox}>
                      <Text style={fs.subtext}>
                        ◷ Waktu Konsultasi
                      </Text>

                      <Text style={fs.timeValue}>
                        {consultTime(slot.starts_at)} WIB
                      </Text>

                      <View style={fs.line} />

                      <Text
                        style={{
                          color: cf.green,
                          fontSize: 11,
                        }}
                      >
                        ●{" "}
                        {!paid
                          ? "Menunggu pembayaran"
                          : ended
                          ? "Waktu sesi telah lewat"
                          : started
                          ? "Sesi sedang berlangsung"
                          : "Menunggu waktu konsultasi"}
                      </Text>
                    </View>
                  </View>

                  {/* INFORMASI LAYANAN */}
                  <View style={fs.tagsRow}>
                    <View style={fs.smallTag}>
                      <Text style={fs.smallTagText}>
                        ◷ Durasi 30 Menit
                      </Text>
                    </View>

                    <View style={fs.smallTag}>
                      <Text style={fs.smallTagText}>
                        ▢ Chat Online (Teks)
                      </Text>
                    </View>
                  </View>

                  {/* TOMBOL SESUAI STATUS */}
                  <Pressable
                    style={fs.primary}
                    onPress={() => {
                      if (!paid) {
                        router.push({
                          pathname: "/payment",
                          params: {
                            bookingId: booking.id,
                          },
                        });
                      } else {
                        router.push({
                          pathname: "/consultation-chat",
                          params: {
                            bookingId: booking.id,
                          },
                        });
                      }
                    }}
                  >
                    <Text style={fs.primaryText}>
                      {paid
                        ? "Masuk Chat Konsultasi"
                        : "Lanjut Pembayaran"}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  <Text style={fs.footHint}>
                    {!paid
                      ? "Booking belum dikonfirmasi sebelum pembayaran simulasi."
                      : !expert?.account_id
                      ? "Akun ahli gizi akan dihubungkan pada tahap berikutnya."
                      : "Pesan dapat dikirim sesuai waktu konsultasi yang terjadwal."}
                  </Text>
                </View>
              );
            })
          )}

          {/* PERSIAPAN SEBELUM CHAT */}
          <View style={fs.tipsCard}>
            <View style={fs.sectionRow}>
              <Text style={fs.sectionTitle}>
                ✧ Persiapan Sebelum Chat
              </Text>

              <Text
                style={{
                  color: cf.green,
                  fontSize: 11,
                }}
              >
                3 Panduan
              </Text>
            </View>

            {tips.map((tip) => (
              <View key={tip} style={fs.tip}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={cf.green}
                />

                <Text
                  style={[
                    fs.subtext,
                    { flex: 1, color: cf.ink },
                  ]}
                >
                  {tip}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={{
              padding: 18,
              alignItems: "center",
            }}
            onPress={() =>
              router.push("/consultation-history")
            }
          >
            <Text
              style={{
                color: cf.green,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Lihat Riwayat Konsultasi →
            </Text>
          </Pressable>
        </ScrollView>

        <ConsultBottomNav active="Jadwal" />
      </LinearGradient>
    </SafeAreaView>
  );
}
