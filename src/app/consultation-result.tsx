
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import {
  ConsultHeader,
  ConsultPhoto,
} from "../components/ConsultFlowUI";

import { cf, fs } from "../styles/consult-flow.styles";

import {
  consultDate,
  getMyConsultBooking,
  type ConsultBooking,
  type ConsultResult,
} from "../utils/consult-flow";

export default function ConsultationResultScreen() {
  const { bookingId } = useLocalSearchParams<{
    bookingId: string;
  }>();

  const [booking, setBooking] =
    useState<ConsultBooking | null>(null);

  const [result, setResult] =
    useState<ConsultResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          setLoading(true);
          setErrorText("");

          if (!bookingId) {
            throw new Error("Booking tidak ditemukan.");
          }

          const currentBooking =
            await getMyConsultBooking(bookingId);

          if (!active) return;

          setBooking(currentBooking);

          if (currentBooking.status !== "completed") {
            return;
          }

          const { data, error } = await supabase
            .from("consultation_results")
            .select("summary, advice, updated_at")
            .eq("booking_id", bookingId)
            .maybeSingle();

          if (error) throw error;

          if (active) {
            setResult(
              (data as ConsultResult | null) ?? null
            );
          }
        } catch (error) {
          if (active) {
            setErrorText(
              error instanceof Error
                ? error.message
                : "Gagal memuat hasil konsultasi."
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
    }, [bookingId])
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[
          fs.screen,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={cf.green}
        />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[
        fs.screen,
        { padding: 24, gap: 18 },
      ]}>
        <Text style={fs.sectionTitle}>
          Hasil Tidak Ditemukan
        </Text>

        <Text style={fs.subtext}>
          {errorText}
        </Text>

        <Pressable
          style={fs.primary}
          onPress={() => router.replace("/my-schedule")}
        >
          <Text style={fs.primaryText}>
            Kembali ke Jadwal
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const completed =
    booking.status === "completed";

  return (
    <SafeAreaView
      style={fs.screen}
      edges={["top", "bottom"]}
    >
      <LinearGradient
        colors={[
          "#F9FFFC",
          "#E8FFF4",
          "#FAF8FF",
        ]}
        style={{ flex: 1 }}
      >
        <ConsultHeader title="Hasil Konsultasi" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={fs.scrollContent}
        >
          {/* TANDA SELESAI */}
          <View style={fs.successRing}>
            <Ionicons
              name={completed ? "checkmark" : "time-outline"}
              size={60}
              color="#FFFFFF"
            />
          </View>

          <Text style={fs.successTitle}>
            {completed
              ? "Konsultasi Selesai"
              : "Konsultasi Belum Selesai"}
          </Text>

          <Text
            style={{
              color: "#53685E",
              textAlign: "center",
              fontSize: 13,
              marginTop: 9,
              marginBottom: 26,
            }}
          >
            {completed
              ? "Berikut hasil konsultasimu"
              : "Hasil tersedia setelah sesi selesai"}
          </Text>

          {/* PROFIL AHLI GIZI */}
          <View
            style={[
              fs.card,
              fs.greenCard,
            ]}
          >
            <View style={fs.expertRow}>
              <ConsultPhoto
                photoKey={
                  booking.expert?.photo_key ??
                  "female"
                }
                size={87}
              />

              <View style={{ flex: 1 }}>
                <Text style={fs.expertName}>
                  {booking.expert?.display_name ??
                    "Ahli Gizi"}
                </Text>

                <Text style={[
                  fs.expertSubtitle,
                  { color: cf.green },
                ]}>
                  {booking.expert?.specialty ??
                    "Konsultasi Gizi Online"}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <View style={fs.pill}>
                    <Text style={fs.pillText}>
                      {booking.slot
                        ? consultDate(
                            booking.slot.starts_at
                          )
                        : "Tanggal tidak tersedia"}
                    </Text>
                  </View>

                  <View style={fs.pill}>
                    <Text style={fs.pillText}>
                      ▢ Chat Online
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* RINGKASAN */}
          <View style={fs.resultCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 22,
                  backgroundColor: "#CCFBE5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={cf.green}
                />
              </View>

              <Text style={[
                fs.sectionTitle,
                { color: cf.green },
              ]}>
                Ringkasan Konsultasi
              </Text>
            </View>

            <View style={fs.line} />

            <Text style={fs.resultText}>
              {result?.summary ??
                "Ringkasan belum diisi oleh ahli gizi. Hasil akan muncul di sini setelah ahli gizi menyelesaikan catatan konsultasi."}
            </Text>
          </View>

          {/* SARAN AHLI GIZI */}
          <View
            style={[
              fs.resultCard,
              fs.greenCard,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
              }}
            >
              <Ionicons
                name="bulb-outline"
                size={26}
                color={cf.green}
              />

              <Text style={fs.sectionTitle}>
                Saran Ahli Gizi
              </Text>
            </View>

            <Text style={fs.resultText}>
              {result?.advice ??
                "Saran ahli gizi belum tersedia. Bagian ini akan diisi oleh ahli gizi yang menangani konsultasimu."}
            </Text>
          </View>

          {booking.expert?.is_demo && (
            <View style={fs.pill}>
              <Text style={fs.pillText}>
                Profil ahli gizi masih berupa data demo
              </Text>
            </View>
          )}

          <View style={{ flex: 1, minHeight: 24 }} />

          <Pressable
            style={fs.primary}
            onPress={() =>
              router.replace("/dashboard")
            }
          >
            <Text style={fs.primaryText}>
              Kembali ke Beranda
            </Text>

            <Ionicons
              name="home-outline"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            style={{
              alignItems: "center",
              padding: 19,
            }}
            onPress={() =>
              router.push("/consultation-history")
            }
          >
            <Text
              style={{
                color: cf.green,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Lihat Riwayat →
            </Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
