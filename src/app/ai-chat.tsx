
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../supabase";
import { ac, ais } from "../styles/ai-chat.styles";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
};

function getTime() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeMessage(
  role: Message["role"],
  text: string
): Message {
  return {
    id:
      Date.now().toString() +
      Math.random().toString(36).slice(2),
    role,
    text,
    time: getTime(),
  };
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        ais.messageRow,
        {
          justifyContent: isUser
            ? "flex-end"
            : "flex-start",
        },
      ]}
    >
      {!isUser && (
        <View style={ais.messageAvatar}>
          <Image
            source={require("../../assets/images/icon1.png")}
            style={ais.messageAvatarImage}
            resizeMode="cover"
          />
        </View>
      )}

      <View style={ais.messageGroup}>
        <View
          style={
            isUser
              ? ais.userBubble
              : ais.assistantBubble
          }
        >
          <Text
            style={
              isUser
                ? ais.userText
                : ais.assistantText
            }
          >
            {message.text}
          </Text>
        </View>

        <Text
          style={[
            ais.timeText,
            { textAlign: isUser ? "right" : "left" },
          ]}
        >
          {message.time}
          {isUser ? " ✓✓" : ""}
        </Text>
      </View>
    </View>
  );
}

function BottomNavigation() {
  const tabs = [
    {
      label: "Beranda",
      icon: "home-outline" as const,
    },
    {
      label: "AI Chat",
      icon: "chatbubble-outline" as const,
    },
    {
      label: "Konsultasi",
      icon: "medkit-outline" as const,
    },
    {
      label: "Profil",
      icon: "person-outline" as const,
    },
  ];

  return (
    <View style={ais.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.label === "AI Chat";

        return (
          <Pressable
            key={tab.label}
            style={[
              ais.navItem,
              active && ais.navActive,
            ]}
            onPress={() => {
              if (tab.label === "Beranda") {
                router.replace("/dashboard");
              } else if (tab.label === "Profil") {
                router.replace("/profile");
              } 
              else if (tab.label === "Konsultasi") {
                router.push("/experts");
              }

            }}
          >
            <Ionicons
              name={tab.icon}
              size={23}
              color={ac.darkGreen}
            />

            <Text style={ais.navLabel}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AIChatScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [firstName, setFirstName] = useState("Kamu");
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // MENGAMBIL NAMA DARI SUPABASE
  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data, error } =
        await supabase.auth.getUser();

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!active) return;

      const name =
        profile?.full_name
          ?.trim()
          .split(/\s+/)[0] || "Teman";

      setFirstName(name);

      setMessages([
        makeMessage(
          "assistant",
          `Halo ${name}! Selamat datang di Nutri AI. 🌿\n\nAda pertanyaan tentang pola makan, kebutuhan kalori, atau nutrisi yang ingin kamu diskusikan hari ini?`
        ),
      ]);

      setReady(true);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  // KIRIM PESAN KE SUPABASE EDGE FUNCTION
  async function sendMessage(question: string) {
    const text = question.trim();

    if (!text || sending || !ready) return;

    if (text.length > 1000) {
      Alert.alert(
        "Pesan Terlalu Panjang",
        "Maksimal 1000 karakter."
      );
      return;
    }

    const userMessage = makeMessage("user", text);
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {   
    const history = updatedMessages
    .slice(1)
    .slice(-12)
    .map((item) => ({
        role: item.role,
        text: item.text,
    }));


      const { data, error } =
        await supabase.functions.invoke(
          "nutri-ai-chat",
          {
            body: {
              messages: history,
            },
          }
        );

      if (error) {
        let detail = error.message;

        const context =
          (error as { context?: Response }).context;

        if (context) {
          try {
            const body = await context.json();

            if (body?.error) {
              detail = body.error;
            }
          } catch {
            // Gunakan pesan error bawaan.
          }
        }

        throw new Error(detail);
      }

      if (
        !data ||
        typeof data.reply !== "string" ||
        !data.reply.trim()
      ) {
        throw new Error(
          "AI tidak mengembalikan jawaban."
        );
      }

      setMessages((previous) => [
        ...previous,
        makeMessage("assistant", data.reply.trim()),
      ]);
    } catch (error) {
      Alert.alert(
        "Pesan Belum Terjawab",
        error instanceof Error
          ? error.message
          : "Tidak dapat menghubungi Nutri AI."
      );
    } finally {
      setSending(false);
    }
  }

  function resetConversation() {
    Alert.alert(
      "Mulai Percakapan Baru?",
      "Pesan yang sedang ditampilkan akan dihapus dari layar ini.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Mulai Baru",
          onPress: () => {
            setMessages([
              makeMessage(
                "assistant",
                `Halo ${firstName}! 🌿 Ada yang ingin kamu tanyakan tentang nutrisi hari ini?`
              ),
            ]);
            setInput("");
          },
        },
      ]
    );
  }

  const quickActions = [
    {
      label: "Pola Makan Sehat",
      icon: "restaurant-outline" as const,
      prompt:
        "Beri aku tips sederhana untuk memulai pola makan sehat sehari-hari.",
    },
    {
      label: "Kebutuhan Kalori",
      icon: "calculator-outline" as const,
      prompt:
        "Jelaskan BMR dan TDEE dengan bahasa sederhana. Bagaimana memahami kebutuhan kalori harian?",
    },
    {
      label: "Cari Ahli Gizi",
      icon: "medkit-outline" as const,
      prompt:
        "Kapan seseorang sebaiknya berkonsultasi dengan ahli gizi?",
    },
  ];

  return (
    <SafeAreaView
      style={ais.screen}
      edges={["top", "bottom"]}
    >
      {/* HEADER */}
      <View style={ais.header}>
        <Pressable
          style={ais.iconButton}
          onPress={() => router.replace("/dashboard")}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={ac.darkGreen}
          />
        </Pressable>

        <View style={ais.avatar}>
          <Image
            source={require("../../assets/images/icon1.png")}
            style={ais.avatarImage}
            resizeMode="cover"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={ais.headerName}>
            Nutri AI 🌿
          </Text>

          <Text style={ais.headerSubtitle}>
            ● Asisten Gizi Virtual
          </Text>
        </View>

        <Pressable
          style={ais.iconButton}
          onPress={resetConversation}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color={ac.darkGreen}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* PESAN */}
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ais.scrollContent}
          onContentSizeChange={() => {
            if (messages.length > 1) {
              scrollRef.current?.scrollToEnd({
                animated: true,
              });
            }
          }}
        >
          {/* KARTU SAMBUTAN */}
          <LinearGradient
            colors={[
              "#F1FFF9",
              "#F2F3FF",
              "#E1FAF3",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ais.welcomeCard}
          >
            <View style={ais.intelligenceBadge}>
              <Text style={ais.intelligenceText}>
                ✧ Nutrition Intelligence
              </Text>
            </View>

            <View style={ais.welcomeRow}>
              <View style={ais.welcomeTextBox}>
                <Text style={ais.welcomeTitle}>
                  Halo! Aku Nutri AI 🌿
                </Text>

                <Text style={ais.welcomeDescription}>
                  Ada rencana gizi atau pertanyaan
                  makanan yang ingin kamu konsultasikan
                  hari ini?
                </Text>
              </View>

              <Image
                source={require("../../assets/images/icon1.png")}
                style={ais.mascotImage}
                resizeMode="contain"
              />
            </View>

            <View style={ais.divider} />

            <Text style={ais.quickTitle}>
              Pilihan Cepat:
            </Text>

            <View style={ais.quickRow}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  style={ais.quickChip}
                  disabled={!ready || sending}
                  onPress={() => sendMessage(action.prompt)}
                >
                  <Ionicons
                    name={action.icon}
                    size={16}
                    color={ac.green}
                  />

                  <Text style={ais.quickChipText}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </LinearGradient>

          <View style={ais.dayPill}>
            <Text style={ais.dayText}>
              Hari ini · {getTime()} WIB
            </Text>
          </View>

          {/* DAFTAR PERCAKAPAN */}
          {!ready ? (
            <ActivityIndicator color={ac.green} />
          ) : (
            messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
              />
            ))
          )}

          {sending && (
            <Text style={ais.typingText}>
              Nutri AI sedang mengetik...
            </Text>
          )}
        </ScrollView>

        {/* AREA MENGETIK PESAN */}
        <View style={ais.composerContainer}>
          <View style={ais.composer}>
            <TextInput
              style={ais.input}
              placeholder="Tanya seputar nutrisi..."
              placeholderTextColor="#A3ADA8"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              editable={ready && !sending}
              returnKeyType="default"
            />

            <Pressable
              style={[
                ais.sendButton,
                (!input.trim() || sending || !ready) &&
                  ais.sendButtonDisabled,
              ]}
              disabled={!input.trim() || sending || !ready}
              onPress={() => sendMessage(input)}
              accessibilityLabel="Kirim pesan"
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="send"
                  size={19}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          <Text style={ais.disclaimer}>
            Pesan dikirim ke penyedia AI.
            Jangan bagikan data pribadi sensitif.
            Nutri AI bukan pengganti ahli gizi atau dokter.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <BottomNavigation />
    </SafeAreaView>
  );
}
