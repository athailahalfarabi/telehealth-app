
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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import PaymentHeader from "../components/PaymentHeader";
import { payColor as c, payStyle as s } from "../styles/payment.styles";

import {
  getBookingPayment,
  formatMoney,
  methods,
  type PaymentMethod,
  type BookingPayment,
} from "../utils/payment";

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{
    bookingId: string;
  }>();

  const [booking, setBooking] =
    useState<BookingPayment | null>(null);

  const [method, setMethod] =
    useState<PaymentMethod>("qris");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!bookingId) {
          throw new Error("ID booking belum tersedia.");
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
            "Booking ini tidak sedang menunggu pembayaran."
          );
        }

        setBooking(result);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal memuat pembayaran."
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

  function continuePayment() {
    if (!booking) return;

    router.push({
      pathname: "/payment-detail",
      params: {
        bookingId: booking.id,
        method,
      },
    });
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

  if (!booking) {
    return (
      <SafeAreaView style={s.screen}>
        <PaymentHeader title="Pembayaran Konsultasi" />
        <View style={{ padding: 25, gap: 18 }}>
          <Text style={s.sectionHeading}>
            Pembayaran belum tersedia
          </Text>

          <Text style={s.smallText}>
            {errorMessage}
          </Text>

          <Pressable
            style={s.primaryButton}
            onPress={() => router.replace("/experts")}
          >
            <Text style={s.primaryButtonText}>
              Kembali ke Ahli Gizi
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
      <PaymentHeader title="Pembayaran Konsultasi" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* RINGKASAN BIAYA */}
        <LinearGradient
          colors={["#F3FFF8", "#E4FCEF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.summaryCard}
        >
          <View style={{ flex: 1 }}>
            <View style={s.servicePill}>
              <Ionicons
                name="medkit-outline"
                size={17}
                color={c.green}
              />

              <Text style={s.servicePillText}>
                Konsultasi Gizi
              </Text>
            </View>

            <Text
              style={[
                s.smallText,
                { marginTop: 13 },
              ]}
            >
              ▢ {booking.duration} Menit • Chat Online
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.totalLabel}>
              Biaya Layanan
            </Text>

            <Text
              style={s.totalPrice}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(booking.amount_idr)}
            </Text>
          </View>
        </LinearGradient>

        {/* PILIH METODE */}
        <View style={s.headingRow}>
          <Text style={s.sectionHeading}>
            Pilih Metode
          </Text>

          <Text
            style={{
              fontSize: 11,
              color: "#8FADA1",
            }}
          >
            Simulasi
          </Text>
        </View>

        {methods.map((item) => {
          const selected = method === item.id;

          return (
            <Pressable
              key={item.id}
              style={[
                s.methodCard,
                selected && s.methodSelected,
              ]}
              onPress={() => setMethod(item.id)}
            >
              <View
                style={[
                  s.methodLogo,
                  selected && s.logoSelected,
                ]}
              >
                {item.id === "qris" ? (
                  <Ionicons
                    name="qr-code-outline"
                    size={35}
                    color={c.green}
                  />
                ) : (
                  <Text
                    style={[
                      s.bankLogoText,
                      item.id === "mandiri" &&
                        { fontSize: 14 },
                    ]}
                  >
                    {item.shortName}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <Text style={s.methodName}>
                    {item.name}
                  </Text>

                  {item.id === "qris" && (
                    <View
                      style={{
                        backgroundColor: "#7BF2BA",
                        borderRadius: 15,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: c.darkGreen,
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        DEMO
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={s.methodDescription}>
                  {item.subtitle}
                </Text>
              </View>

              <View
                style={[
                  s.radio,
                  selected && s.radioActive,
                ]}
              >
                {selected && (
                  <View style={s.radioInner} />
                )}
              </View>
            </Pressable>
          );
        })}

        <View style={{ flex: 1, minHeight: 35 }} />

        {/* PEMBERITAHUAN SIMULASI */}
        <View style={s.notice}>
          <Ionicons
            name="information-circle"
            size={22}
            color="#648CA2"
          />

          <Text style={s.noticeText}>
            Pembayaran Simulasi — Tidak ada transaksi
            uang nyata atau transfer ke rekening bank.
          </Text>
        </View>
      </ScrollView>

      {/* TOMBOL LANJUTKAN */}
      <View style={s.footer}>
        <Pressable
          style={s.primaryButton}
          onPress={continuePayment}
        >
          <Text style={s.primaryButtonText}>
            Lanjutkan
          </Text>

          <Ionicons
            name="arrow-forward"
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
