
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { payColor as c, payStyle as s } from "../styles/payment.styles";

import {
  formatMoney,
  getBookingPayment,
  paymentMethodName,
  type BookingPayment,
} from "../utils/payment";

import {
  longDate,
  timeLabel,
} from "../utils/consultation";

function ReceiptRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>
        {label}
      </Text>

      <Text style={s.infoValue}>
        {value}
      </Text>
    </View>
  );
}

export default function PaymentSuccessScreen() {
  const { bookingId } = useLocalSearchParams<{
    bookingId: string;
  }>();

  const [booking, setBooking] =
    useState<BookingPayment | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!bookingId) {
          throw new Error("ID booking tidak ditemukan.");
        }

        const result = await getBookingPayment(bookingId);

        if (!active) return;

        if (result.status !== "paid_simulated") {
          throw new Error(
            "Pembayaran simulasi belum dikonfirmasi."
          );
        }

        setBooking(result);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat rincian transaksi."
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
  }, [bookingId]);

  if (loading) {
    return (
      <SafeAreaView
        style={[
          s.screen,
          {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={c.green}
        />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView
        style={[
          s.screen,
          {
            padding: 24,
            justifyContent: "center",
            gap: 18,
          },
        ]}
      >
        <Text style={s.sectionHeading}>
          Rincian belum tersedia
        </Text>

        <Text style={s.smallText}>
          {errorMessage}
        </Text>

        <Pressable
          style={s.primaryButton}
          onPress={() => router.replace("/my-schedule")}
        >
          <Text style={s.primaryButtonText}>
            Lihat Jadwal
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={s.screen}
      edges={["top", "bottom"]}
    >
      <LinearGradient
        colors={[
          "#FAF8FF",
          "#E6FFF4",
          "#FAF8FF",
        ]}
        style={{
          flex: 1,
        }}
      >
        {/* BRAND HEADER */}
        <View style={s.successBrand}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={s.successLogo}>
              <Ionicons
                name="leaf-outline"
                size={21}
                color={c.green}
              />
            </View>

            <Text
              style={{
                color: c.green,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              NutriCare AI
            </Text>
          </View>

          <Pressable
            style={s.headerButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Ionicons
              name="close"
              size={25}
              color={c.text}
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {/* TANDA BERHASIL */}
          <View style={s.successRing}>
            <Ionicons
              name="checkmark"
              size={80}
              color="#FFFFFF"
            />
          </View>

          <Text style={s.successTitle}>
            Pembayaran Berhasil!
          </Text>

          <Text style={s.successSubtitle}>
            Booking konsultasimu sudah{"\n"}
            dikonfirmasi secara simulasi.
          </Text>

          {/* RINCIAN TRANSAKSI */}
          <View style={s.successCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: c.muted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Rincian Transaksi
              </Text>

              <View style={s.successBadge}>
                <Text style={s.successBadgeText}>
                  ✓ Lunas (Simulasi)
                </Text>
              </View>
            </View>

            <View style={s.divider} />

            <ReceiptRow
              label="Layanan"
              value="Konsultasi Gizi Online"
            />

            <ReceiptRow
              label="Ahli Gizi"
              value={booking.nutritionist_name}
            />

            <ReceiptRow
              label="Jadwal"
              value={longDate(booking.starts_at)}
            />

            <ReceiptRow
              label="Jam"
              value={
                `${timeLabel(booking.starts_at)} - ` +
                `${timeLabel(booking.ends_at)} WIB`
              }
            />

            <ReceiptRow
              label="Metode Pembayaran"
              value={
                paymentMethodName(booking.payment_method) +
                " (Simulasi)"
              }
            />

            <View style={s.divider} />

            <View
              style={[
                s.infoRow,
                { alignItems: "center" },
              ]}
            >
              <Text
                style={{
                  color: c.text,
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                Total Biaya
              </Text>

              <Text style={s.totalPrice}>
                {formatMoney(booking.amount_idr)}
              </Text>
            </View>
          </View>

          {/* INFORMASI JADWAL */}
          <View
            style={[
              s.notice,
              {
                backgroundColor: "#E6FFF2",
                borderColor: "#A0EDBF",
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color={c.green}
            />

            <Text style={s.noticeText}>
              Jadwal konsultasi tersimpan.
              Catat tanggal dan jam sesimu.
              Pengingat otomatis belum diaktifkan.
            </Text>
          </View>

          <Text
            style={[
              s.detailText,
              { marginTop: 21 },
            ]}
          >
            Transaksi ini hanya simulasi.
            Fitur chat dengan ahli gizi akan
            diaktifkan pada tahap pengembangan
            konsultasi berikutnya.
          </Text>
        </ScrollView>

        {/* TOMBOL LIHAT JADWAL */}
        <View style={s.footer}>
          <Pressable
            style={s.primaryButton}
            onPress={() =>
              router.replace("/my-schedule")
            }
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text style={s.primaryButtonText}>
              Lihat Jadwal
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
