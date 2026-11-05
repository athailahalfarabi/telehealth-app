
import { type ComponentRef, useCallback, useRef, useState } from "react";
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

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [booking, setBooking] =
    useState<ConsultBooking | null>(null);

  const [messages, setMessages] =
    useState<ConsultMessage[]>([]);

  const [myId, setMyId] = useState("");
  const [isNutritionist, setIsNutritionist] = useState(false);
  const [patientName, setPatientName] = useState("");
  const backPath = isNutritionist ? "/nutritionist-schedule" : "/my-schedule";
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

          
const { data: myProfile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

if (profileError) throw profileError;

const currentBooking =
  await getMyConsultBooking(bookingId);

const nutritionistRole =
  myProfile.role === "nutritionist";

let name = "Pasien";

if (nutritionistRole) {
  const { data: patientProfile, error: patientError } =
    await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", currentBooking.patient_id)
      .maybeSingle();

  if (patientError) {
    console.warn(
      "Nama pasien belum dapat dibaca:",
      patientError.message
    );
  }

  name =
    patientProfile?.full_name?.trim() ||
    "Pasien";
}

if (!active) return;

setMyId(auth.user.id);
setIsNutritionist(nutritionistRole);
setPatientName(name);
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
          onPress={() => router.replace(backPath)}
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
      style={[fs.screen, { backgroundColor: "#F8F7FD" }]}
      edges={["top", "bottom"]}
    >
      {/* HEADER CHAT: desain hijau-putih untuk kedua role */}
      <View style={[fs.chatHeader, {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5EDE8",
      }]}>
        <Pressable
          onPress={() =>
            router.replace(backPath)
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={cf.ink}
          />
        </Pressable>

        
{isNutritionist ? (
  <View
    style={{
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor: "#E0F3E9",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Ionicons
      name="person-outline"
      size={23}
      color={cf.green}
    />
  </View>
) : (
  <ConsultPhoto
    photoKey={
      booking.expert?.photo_key ?? "female"
    }
    size={43}
  />
)}


        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: cf.ink,
              fontSize: 14,
              fontWeight: "800",
            }}
            numberOfLines={2}
          >
            {isNutritionist
  ? patientName
  : booking.expert?.display_name ?? "Ahli Gizi"}
          </Text>

          <Text style={fs.headerSubtitle}>
            {isNutritionist ? "Pasien · Chat Konsultasi" : "Ahli Gizi · Chat Konsultasi"}
          </Text>
        </View>

        {isNutritionist && booking.status === "paid_simulated" && (
          <Pressable
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "#F4B7B8",
              backgroundColor: "#FFF1F1",
              paddingHorizontal: 12,
              paddingVertical: 9,
              opacity: hasStarted ? 1 : 0.5,
            }}
            disabled={!hasStarted}
            onPress={() =>
              router.push({
                pathname: "/nutritionist-session-result",
                params: { bookingId: booking.id },
              })
            }
          >
            <Text
              style={{
                color: "#BB3238",
                fontSize: 11,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Selesaikan{"\n"}Konsultasi
            </Text>
          </Pressable>
        )}
      </View>

      {/* STATUS SESI */}
      <View style={[fs.chatStatus, {
        backgroundColor: "#EDFBF4",
        borderBottomWidth: 1,
        borderBottomColor: "#E0F1E8",
      }]}>
        <Text
          style={{
            fontSize: 11,
            color: "#43594D",
            flex: 1,
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={14} />
          {"  "}{canChat ? "Sesi berlangsung" : "Sesi konsultasi"}
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
          style={{ backgroundColor: "#F8F7FD" }}
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
                        {
                          backgroundColor: mine ? "#087B58" : "#FFFFFF",
                          borderColor: mine ? "#087B58" : "#E7EEE9",
                          borderWidth: mine ? 0 : 1,
                          borderRadius: 15,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          fs.bubbleText,
                          mine && fs.bubbleMineText,
                          { color: mine ? "#FFFFFF" : "#244436" },
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
        <View style={[fs.chatComposer, {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E6EDE9",
          borderTopWidth: 1,
        }]}>
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
            Chat untuk peserta sesi konsultasi.
            Gunakan data fiktif selama pengujian.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
