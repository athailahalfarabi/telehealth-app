
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import { ConsultPhoto } from "../components/ConsultFlowUI";
import { cf, fs } from "../styles/consult-flow.styles";

import {
  canSendConsultMessage,
  consultTime,
  getMyConsultBooking,
  type ConsultBooking,
  type ConsultMessage,
} from "../utils/consult-flow";

export default function ConsultationChatScreen() {
  const { bookingId } = useLocalSearchParams<{
    bookingId: string;
  }>();

  const scrollRef = useRef<ScrollView>(null);

  const [booking, setBooking] =
    useState<ConsultBooking | null>(null);

  const [messages, setMessages] =
    useState<ConsultMessage[]>([]);

  const [myId, setMyId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [now, setNow] = useState(new Date());

  // MUAT BOOKING, PESAN, DAN PANTAU PESAN BARU
  useFocusEffect(
    useCallback(() => {
      if (!bookingId) {
        setLoading(false);
        setErrorText("ID booking tidak ditemukan.");
        return;
      }

      let active = true;

      async function refreshMessages() {
        const { data, error } = await supabase
          .from("consultation_messages")
          .select(
            "id, booking_id, sender_id, body, created_at"
          )
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true });

        if (error) {
          if (active) setErrorText(error.message);
          return;
        }

        if (active) {
          setMessages((data ?? []) as ConsultMessage[]);
        }
      }

      async function initialize() {
        try {
          setLoading(true);
          setErrorText("");

          const { data: auth, error: authError } =
            await supabase.auth.getUser();

          if (authError || !auth.user) {
            router.replace("/login");
            return;
          }

          const currentBooking =
            await getMyConsultBooking(bookingId);

          if (!active) return;

          setMyId(auth.user.id);
          setBooking(currentBooking);

          await refreshMessages();
        } catch (error) {
          if (active) {
            setErrorText(
              error instanceof Error
                ? error.message
                : "Gagal membuka chat."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      void initialize();

      // PESAN BARU DARI SUPABASE REALTIME
      const channel = supabase
        .channel(`consultation-chat-${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "consultation_messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          () => {
            void refreshMessages();
          }
        )
        .subscribe();

      // Cadangan jika event realtime terlambat
      const refreshTimer = setInterval(() => {
        void refreshMessages();
      }, 12000);

      const clockTimer = setInterval(() => {
        setNow(new Date());
      }, 1000);

      return () => {
        active = false;
        clearInterval(refreshTimer);
        clearInterval(clockTimer);
        void supabase.removeChannel(channel);
      };
    }, [bookingId])
  );

  const canChat = booking
    ? canSendConsultMessage(booking, now)
    : false;

  const startTime = booking?.slot
    ? new Date(booking.slot.starts_at).getTime()
    : 0;

  const endTime = booking?.slot
    ? new Date(booking.slot.ends_at).getTime()
    : 0;

  const hasStarted =
    startTime > 0 && now.getTime() >= startTime;

  const minutesLeft =
    endTime > now.getTime()
      ? Math.ceil(
          (endTime - now.getTime()) / 60000
        )
      : 0;

  let statusText = "Menyiapkan sesi...";

  if (booking?.status === "completed") {
    statusText = "Konsultasi selesai";
  } else if (!booking?.expert?.account_id) {
    statusText = "Menunggu akun ahli gizi";
  } else if (!hasStarted) {
    statusText = "Menunggu jadwal konsultasi";
  } else if (minutesLeft <= 0) {
    statusText = "Waktu konsultasi berakhir";
  } else if (booking?.status !== "paid_simulated") {
    statusText = "Menunggu pembayaran";
  } else {
    statusText = `Sesi aktif • ${minutesLeft} menit tersisa`;
  }

  async function sendMessage() {
    const body = input.trim();

    if (!booking || !canChat || !body || sending) {
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.rpc(
        "send_consultation_message",
        {
          p_booking_id: booking.id,
          p_body: body,
        }
      );

      if (error) throw error;

      setInput("");

      const { data, error: readError } = await supabase
        .from("consultation_messages")
        .select(
          "id, booking_id, sender_id, body, created_at"
        )
        .eq("booking_id", booking.id)
        .order("created_at");

      if (readError) throw readError;

      setMessages((data ?? []) as ConsultMessage[]);
    } catch (error) {
      Alert.alert(
        "Pesan Gagal Dikirim",
        error instanceof Error
          ? error.message
          : "Silakan coba lagi."
      );
    } finally {
      setSending(false);
    }
  }

  function askFinish() {
    if (!booking) return;

    if (
      booking.status !== "paid_simulated" ||
      !hasStarted
    ) {
      Alert.alert(
        "Belum Bisa Diakhiri",
        "Sesi hanya dapat diakhiri setelah jadwal konsultasi dimulai."
      );
      return;
    }

    Alert.alert(
      "Akhiri Konsultasi?",
      "Setelah sesi diakhiri, pesan baru tidak dapat dikirim. Ringkasan akan diisi oleh ahli gizi.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Akhiri",
          style: "destructive",
          onPress: () => {
            void finishConsultation();
          },
        },
      ]
    );
  }

  async function finishConsultation() {
    if (!booking || finishing) return;

    setFinishing(true);

    try {
      const { error } = await supabase.rpc(
        "finish_consultation",
        { p_booking_id: booking.id }
      );

      if (error) throw error;

      router.replace({
        pathname: "/consultation-result",
        params: { bookingId: booking.id },
      });
    } catch (error) {
      Alert.alert(
        "Gagal Mengakhiri Sesi",
        error instanceof Error
          ? error.message
          : "Coba lagi."
      );
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          fs.screen,
          {
            alignItems: "center",
            justifyContent: "center",
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
      <SafeAreaView
        style={[
          fs.screen,
          {
            padding: 24,
            justifyContent: "center",
            gap: 15,
          },
        ]}
      >
        <Text style={fs.sectionTitle}>
          Chat Belum Tersedia
        </Text>

        <Text style={fs.subtext}>
          {errorText || "Booking tidak ditemukan."}
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

  return (
    <SafeAreaView
      style={fs.screen}
      edges={["top", "bottom"]}
    >
      {/* HEADER CHAT */}
      <View style={fs.chatHeader}>
        <Pressable
          onPress={() =>
            router.replace("/my-schedule")
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={cf.ink}
          />
        </Pressable>

        <ConsultPhoto
          photoKey={
            booking.expert?.photo_key ?? "female"
          }
          size={43}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: cf.ink,
              fontSize: 14,
              fontWeight: "800",
            }}
            numberOfLines={2}
          >
            {booking.expert?.display_name ??
              "Ahli Gizi"}
          </Text>

          <Text style={fs.headerSubtitle}>
            Konsultasi Gizi Online
          </Text>
        </View>

        <Pressable
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#F4B7B8",
            backgroundColor: "#FFF1F1",
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
          onPress={askFinish}
          disabled={finishing}
        >
          <Text
            style={{
              color: "#BB3238",
              fontSize: 11,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            Akhiri{"\n"}Konsultasi
          </Text>
        </Pressable>
      </View>

      {/* STATUS SESI */}
      <View style={fs.chatStatus}>
        <Text
          style={{
            fontSize: 11,
            color: "#43594D",
            flex: 1,
          }}
        >
          <Ionicons name="lock-closed-outline" size={14} />
          {"  "}Sesi Konsultasi
        </Text>

        <Text
          style={{
            fontSize: 11,
            color: cf.green,
            fontWeight: "800",
          }}
        >
          ● {statusText}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* PESAN CHAT */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={fs.chatContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({
              animated: true,
            })
          }
        >
          <View style={[fs.pill, {
            alignSelf: "center",
            marginBottom: 22,
            backgroundColor: "#EEF0FF",
          }]}>
            <Text style={fs.pillText}>
              {booking.slot
                ? new Date(
                    booking.slot.starts_at
                  ).toLocaleDateString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Jadwal tidak tersedia"}
            </Text>
          </View>

          {messages.length === 0 ? (
            <View style={[fs.card, {
              alignItems: "center",
              gap: 10,
            }]}>
              <Ionicons
                name="chatbubbles-outline"
                size={36}
                color={cf.green}
              />

              <Text style={fs.sectionTitle}>
                Belum Ada Pesan
              </Text>

              <Text style={[fs.subtext, {
                textAlign: "center",
              }]}>
                {booking.expert?.account_id
                  ? "Percakapan akan muncul di sini ketika pasien atau ahli gizi mulai berkirim pesan."
                  : "Akun ahli gizi belum dihubungkan. Kita akan mengaktifkannya ketika membuat role ahli gizi."}
              </Text>
            </View>
          ) : (
            messages.map((message) => {
              const mine =
                message.sender_id === myId;

              return (
                <View
                  key={message.id}
                  style={[
                    fs.bubbleRow,
                    {
                      justifyContent: mine
                        ? "flex-end"
                        : "flex-start",
                    },
                  ]}
                >
                  <View
                    style={{
                      maxWidth: "85%",
                    }}
                  >
                    <View
                      style={[
                        fs.bubble,
                        mine
                          ? fs.bubbleMine
                          : fs.bubbleOther,
                      ]}
                    >
                      <Text
                        style={[
                          fs.bubbleText,
                          mine && fs.bubbleMineText,
                        ]}
                      >
                        {message.body}
                      </Text>
                    </View>

                    <Text
                      style={[
                        fs.messageTime,
                        {
                          textAlign: mine
                            ? "right"
                            : "left",
                        },
                      ]}
                    >
                      {consultTime(
                        message.created_at
                      )} WIB
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {errorText ? (
            <Text style={[fs.subtext, {
              textAlign: "center",
              color: "#B53838",
            }]}>
              {errorText}
            </Text>
          ) : null}
        </ScrollView>

        {/* INPUT PESAN */}
        <View style={fs.chatComposer}>
          <View style={fs.inputRow}>
            <TextInput
              style={fs.input}
              placeholder={
                canChat
                  ? "Ketik pesan..."
                  : "Chat belum aktif..."
              }
              placeholderTextColor="#9EA8A4"
              value={input}
              onChangeText={setInput}
              maxLength={2000}
              multiline
              editable={canChat && !sending}
            />

            <Pressable
              style={[
                fs.sendCircle,
                (!canChat || !input.trim()) &&
                  { opacity: 0.4 },
              ]}
              disabled={
                !canChat || !input.trim() || sending
              }
              onPress={() => void sendMessage()}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={21}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          <Text style={[fs.footHint, {
            marginTop: 9,
          }]}>
            Percakapan hanya dapat diakses oleh
            peserta konsultasi. Gunakan data
            fiktif selama pengujian.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
