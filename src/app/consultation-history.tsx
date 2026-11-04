
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
  consultDate,
  consultTime,
  getMyConsultBookings,
  type ConsultBooking,
} from "../utils/consult-flow";

export default function ConsultationHistoryScreen() {
  const [history, setHistory] =
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

          const bookings =
            await getMyConsultBookings();

          if (active) {
            setHistory(
              bookings.filter(
                (item) => item.status === "completed"
              )
            );
          }
        } catch (error) {
          if (active) {
            setErrorText(
              error instanceof Error
                ? error.message
                : "Gagal memuat riwayat."
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

  return (
    <SafeAreaView
      style={fs.screen}
      edges={["top", "bottom"]}
    >
      <LinearGradient
        colors={[
          "#F9F7FF",
          "#E5FFF5",
          "#FAF8FF",
        ]}
        style={{ flex: 1 }}
      >
        <ConsultHeader
          title="Riwayat Konsultasi"
          subtitle="Konsultasi yang telah selesai"
          rightIcon="calendar-outline"
          onRightPress={() =>
            router.replace("/my-schedule")
          }
        />

        <ScrollView
          contentContainerStyle={fs.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* INFORMASI RIWAYAT */}
          <View
            style={[
              fs.sectionRow,
              { marginBottom: 27 },
            ]}
          >
            <View
              style={[
                fs.pill,
                { backgroundColor: "#FFFFFF" },
              ]}
            >
              <Text style={fs.pillText}>
                ● Riwayat Tersimpan
              </Text>
            </View>

            <View
              style={[
                fs.pill,
                { backgroundColor: "#FFFFFF" },
              ]}
            >
              <Text style={fs.pillText}>
                ✓ {history.length} Sesi Selesai
              </Text>
            </View>
          </View>

          {/* DAFTAR RIWAYAT */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color={cf.green}
            />
          ) : errorText ? (
            <View style={fs.card}>
              <Text style={fs.subtext}>
                {errorText}
              </Text>
            </View>
          ) : history.length === 0 ? (
            <View
              style={[
                fs.card,
                {
                  alignItems: "center",
                  gap: 13,
                  paddingVertical: 38,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={47}
                color={cf.green}
              />

              <Text style={fs.sectionTitle}>
                Belum Ada Riwayat
              </Text>

              <Text
                style={[
                  fs.subtext,
                  { textAlign: "center" },
                ]}
              >
                Konsultasi yang sudah selesai akan
                muncul di halaman ini.
              </Text>

              <Pressable
                style={[
                  fs.primary,
                  { alignSelf: "stretch" },
                ]}
                onPress={() =>
                  router.replace("/my-schedule")
                }
              >
                <Text style={fs.primaryText}>
                  Lihat Jadwal Saya
                </Text>
              </Pressable>
            </View>
          ) : (
            history.map((booking) => (
              <Pressable
                key={booking.id}
                style={fs.historyCard}
                onPress={() =>
                  router.push({
                    pathname: "/consultation-result",
                    params: {
                      bookingId: booking.id,
                    },
                  })
                }
              >
                <View style={fs.expertRow}>
                  <ConsultPhoto
                    photoKey={
                      booking.expert?.photo_key ??
                      "female"
                    }
                    size={75}
                  />

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={[
                          fs.expertName,
                          { flex: 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {booking.expert?.display_name ??
                          "Ahli Gizi"}
                      </Text>

                      <View style={fs.pill}>
                        <Text style={fs.pillText}>
                          ● Selesai
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={fs.expertSubtitle}
                      numberOfLines={2}
                    >
                      {booking.expert?.specialty ??
                        "Konsultasi Gizi Online"}
                    </Text>

                    <View style={fs.line} />

                    <View style={fs.pill}>
                      <Text style={fs.pillText}>
                        ▢ Chat Online
                      </Text>
                    </View>

                    <Text
                      style={[
                        fs.subtext,
                        { marginTop: 11 },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color={cf.muted}
                      />
                      {"  "}
                      {booking.slot
                        ? `${consultDate(
                            booking.slot.starts_at
                          )} • ${consultTime(
                            booking.slot.starts_at
                          )} WIB`
                        : "Tanggal tidak tersedia"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={cf.muted}
                  />
                </View>
              </Pressable>
            ))
          )}

          {/* INFORMASI PENYIMPANAN */}
          <View
            style={[
              fs.card,
              { marginTop: 20 },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={27}
                color={cf.green}
              />

              <Text
                style={[
                  fs.subtext,
                  {
                    flex: 1,
                    color: cf.ink,
                  },
                ]}
              >
                Riwayat dan hasil konsultasi
                tersimpan di Supabase dengan
                pembatasan akses untuk peserta
                konsultasi.
              </Text>
            </View>
          </View>
        </ScrollView>

        <ConsultBottomNav active="Jadwal" />
      </LinearGradient>
    </SafeAreaView>
  );
}
