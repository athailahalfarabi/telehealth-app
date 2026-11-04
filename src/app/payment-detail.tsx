
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import PaymentHeader from "../components/PaymentHeader";
import { payColor as c, payStyle as s } from "../styles/payment.styles";

import {
  getBookingPayment,
  formatMoney,
  methods,
  type PaymentMethod,
  type BookingPayment,
} from "../utils/payment";

function DetailRow({
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

export default function PaymentDetailScreen() {
  const { bookingId, method } = useLocalSearchParams<{
    bookingId: string;
    method: PaymentMethod;
  }>();

  const [booking, setBooking] =
    useState<BookingPayment | null>(null);

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedMethod = methods.find(
    (item) => item.id === method
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!bookingId || !selectedMethod) {
          throw new Error(
            "Booking atau metode pembayaran tidak ditemukan."
          );
        }

        const result = await getBookingPayment(bookingId);

        if (!active) return;

        if (result.status === "paid_simulated") {
          router.replace({
            pathname: "/payment-success",
            params: { bookingId },
          });
          return;
        }

        if (result.status !== "pending_payment") {
          throw new Error(
            "Booking tidak dapat dibayar lagi."
          );
        }

        setBooking(result);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat detail pembayaran."
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
  }, [bookingId, method]);

  // KONFIRMASI SIMULASI KE SUPABASE
  async function confirmPayment() {
    if (!booking || !selectedMethod || confirming) {
      return;
    }

    setConfirming(true);

    try {
      const { data, error } = await supabase.rpc(
        "confirm_simulated_payment",
        {
          p_booking_id: booking.id,
          p_method: selectedMethod.id,
        }
      );

      if (error) throw error;

      if (!data) {
        throw new Error(
          "Konfirmasi pembayaran tidak menghasilkan ID."
        );
      }

      router.replace({
        pathname: "/payment-success",
        params: { bookingId: booking.id },
      });
    } catch (error) {
      Alert.alert(
        "Konfirmasi Gagal",
        error instanceof Error
          ? error.message
          : "Pembayaran simulasi belum berhasil."
      );
    } finally {
      setConfirming(false);
    }
  }

  function askConfirmation() {
    Alert.alert(
      "Konfirmasi Pembayaran Simulasi",
      "Tidak ada uang yang dibayarkan. " +
      "Tindakan ini hanya mengubah status booking " +
      "menjadi Lunas (Simulasi). Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Konfirmasi",
          onPress: () => {
            void confirmPayment();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          s.screen,
          {
            justifyContent: "center",
            alignItems: "center",
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

  if (!booking || !selectedMethod) {
    return (
      <SafeAreaView style={s.screen}>
        <PaymentHeader title="Detail Pembayaran" />

        <View style={{ padding: 24, gap: 17 }}>
          <Text style={s.sectionHeading}>
            Detail tidak tersedia
          </Text>

          <Text style={s.smallText}>
            {errorMessage}
          </Text>

          <Pressable
            style={s.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={s.primaryButtonText}>
              Kembali
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={s.screen}
      edges={["top", "bottom"]}
    >
      <PaymentHeader title="Detail Pembayaran" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* TOTAL PEMBAYARAN */}
        <LinearGradient
          colors={["#FFFFFF", "#E0FFF0"]}
          style={s.detailSummary}
        >
          <Text style={s.totalLabel}>
            Total Pembayaran
          </Text>

          <Text
            style={[
              s.totalPrice,
              { fontSize: 29, marginTop: 7 },
            ]}
          >
            {formatMoney(booking.amount_idr)}
          </Text>

          <View style={s.divider} />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={s.smallText}>
              Metode: {selectedMethod.name}
            </Text>

            <View style={s.servicePill}>
              <Text style={s.servicePillText}>
                SIMULASI
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* KARTU METODE PEMBAYARAN */}
        <View style={s.whiteCard}>
          <View style={s.brandRow}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
              }}
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 18,
                  backgroundColor: c.green,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="leaf-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <Text style={s.brandName}>
                NutriCare AI
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#F1F2FE",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: c.darkGreen,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {selectedMethod.shortName} Demo
              </Text>
            </View>
          </View>

          {method === "qris" ? (
            <>
              {/* ILUSTRASI QR DEMO */}
              <View style={s.qrFrame}>
                <View style={s.qrDemo}>
                  <Ionicons
                    name="qr-code-outline"
                    size={130}
                    color={c.green}
                  />

                  <Text style={s.qrDemoText}>
                    DEMO
                  </Text>
                </View>

                <Text
                  style={[
                    s.smallText,
                    {
                      marginTop: 13,
                      textAlign: "center",
                    },
                  ]}
                >
                  Ilustrasi QR untuk tugas kuliah
                </Text>
              </View>

              <View style={s.demoPill}>
                <Text style={s.demoText}>
                  QR Demo — Bukan QRIS Asli
                </Text>
              </View>

              <Text style={s.detailText}>
                QR ini tidak dapat digunakan
                untuk melakukan pembayaran.
                Tidak perlu membuka aplikasi bank
                atau dompet digital.
              </Text>
            </>
          ) : (
            <>
              {/* BANK DEMO */}
              <View style={s.qrFrame}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 28,
                    backgroundColor: "#E3F8ED",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 19,
                  }}
                >
                  <Text
                    style={{
                      color: c.green,
                      fontSize:
                        method === "mandiri" ? 19 : 29,
                      fontWeight: "800",
                    }}
                  >
                    {selectedMethod.shortName}
                  </Text>
                </View>

                <Text
                  style={{
                    color: c.text,
                    fontWeight: "800",
                    fontSize: 19,
                  }}
                >
                  Virtual Account Demo
                </Text>

                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: c.muted,
                    fontWeight: "700",
                  }}
                >
                  DEMO-NOT-VALID
                </Text>

                <Text
                  style={[
                    s.detailText,
                    { marginTop: 15 },
                  ]}
                >
                  Tidak ada nomor rekening atau
                  virtual account sungguhan.
                </Text>
              </View>

              <View style={s.demoPill}>
                <Text style={s.demoText}>
                  {selectedMethod.name} — Simulasi
                </Text>
              </View>

              <Text style={s.detailText}>
                Jangan melakukan transfer.
                Pilih tombol di bawah untuk
                mensimulasikan pembayaran berhasil.
              </Text>
            </>
          )}
        </View>

        {/* RINCIAN TRANSAKSI */}
        <View style={s.whiteCard}>
          <Text style={s.detailHeading}>
            Rincian Transaksi
          </Text>

          <DetailRow
            label="Layanan"
            value="Konsultasi Nutrisi & Diet"
          />

          <DetailRow
            label="Praktisi"
            value={booking.nutritionist_name}
          />

          <DetailRow
            label="ID Simulasi"
            value={
              "SIM-" +
              booking.id.slice(0, 8).toUpperCase()
            }
          />

          <View style={s.divider} />

          <View style={s.infoRow}>
            <Text
              style={[
                s.infoLabel,
                { fontWeight: "800", color: c.text },
              ]}
            >
              Total
            </Text>

            <Text
              style={[
                s.totalPrice,
                { fontSize: 20 },
              ]}
            >
              {formatMoney(booking.amount_idr)}
            </Text>
          </View>
        </View>

        <View style={s.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={c.green}
          />

          <Text style={s.noticeText}>
            Transaksi ini sepenuhnya simulasi.
            Tidak ada pembayaran yang diverifikasi
            oleh bank atau payment gateway.
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={[
            s.primaryButton,
            confirming && { opacity: 0.6 },
          ]}
          disabled={confirming}
          onPress={askConfirmation}
        >
          {confirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#FFFFFF"
              />

              <Text style={s.primaryButtonText}>
                Saya Sudah Bayar
              </Text>
            </>
          )}
        </Pressable>

        <Text
          style={[
            s.detailText,
            { paddingTop: 10, fontSize: 10 },
          ]}
        >
          Menekan tombol ini mengonfirmasi
          booking secara simulasi.
        </Text>
      </View>
    </SafeAreaView>
  );
}
