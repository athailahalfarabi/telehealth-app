import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { supabase } from "../../supabase";
import { dc, ds } from "../styles/dashboard.styles";
import {
  calculateDailyCalories,
  type Activity,
  type Sex,
} from "../utils/nutrition";

type DashboardData = {
  fullName: string;
  bmr: number;
  calories: number;
  goal: string;
};

type HealthRow = {
  date_of_birth: string;
  sex_for_calculation: Sex;
  height_cm: number;
  weight_kg: number;
  activity_level: Activity;
  nutrition_goal: string;
};

const goalLabels: Record<string, string> = {
  maintain: "Menjaga berat badan",
  lose_weight: "Menurunkan berat badan",
  gain_muscle: "Menaikkan massa otot",
  blood_sugar: "Manajemen gula darah",
};

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function showComingSoon(feature: string) {
  Alert.alert(
    feature,
    `Fitur ${feature} akan kita hubungkan setelah Dashboard selesai dibuat.`,
  );
}

// GRAFIK LINGKARAN GIZI
function NutritionRing() {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { percent: 55, start: 0, color: "#69F3BF" },
    { percent: 20, start: 55, color: "#FFD68C" },
    { percent: 25, start: 75, color: "#EBC6FF" },
  ];

  return (
    <View style={ds.ringContainer}>
      <Svg width={143} height={143} viewBox="0 0 150 150">
        <Circle
          cx="75"
          cy="75"
          r={radius}
          stroke="#FFFFFF30"
          strokeWidth={11}
          fill="none"
        />

        {segments.map((item, index) => (
          <Circle
            key={index}
            cx="75"
            cy="75"
            r={radius}
            stroke={item.color}
            strokeWidth={11}
            fill="none"
            strokeDasharray={
              `${(circumference * item.percent) / 100} ` + `${circumference}`
            }
            strokeDashoffset={-(circumference * item.start) / 100}
            transform="rotate(-90 75 75)"
            strokeLinecap="round"
          />
        ))}
      </Svg>

      <View style={ds.ringCenter}>
        <Ionicons name="leaf-outline" size={24} color="#FFFFFF" />
        <Text style={ds.ringText}>GIZI SEIMBANG</Text>
      </View>
    </View>
  );
}

// KOTAK KARBOHIDRAT / PROTEIN / LEMAK
function MacroBox({
  label,
  percent,
  color,
}: {
  label: string;
  percent: string;
  color: string;
}) {
  return (
    <View style={ds.macroBox}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <View style={[ds.macroDot, { backgroundColor: color }]} />
        <Text style={ds.macroLabel}>{label}</Text>
      </View>

      <Text style={ds.macroPercent}>{percent}</Text>
    </View>
  );
}

// MENU PRAKTIS
function MenuCard({
  title,
  icon,
  background,
  border,
  iconColor,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  border: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        ds.menuItem,
        { backgroundColor: background, borderColor: border },
      ]}
      onPress={onPress}
    >
      <View style={ds.menuIcon}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>

      <Text style={ds.menuLabel}>{title}</Text>
    </Pressable>
  );
}

// NAVIGASI DI BAGIAN BAWAH
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
    <View style={ds.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.label === "Beranda";

        return (
          <Pressable
            key={tab.label}
            style={[ds.navItem, active && ds.navActive]}
            
          onPress={() => {
            if (tab.label === "Beranda") {
              router.replace("/dashboard");
            } else if (tab.label === "AI Chat") {
              router.push("/ai-chat");
            } else if (tab.label === "Konsultasi") {
              router.push("/experts");
            } else if (tab.label === "Profil") {
              router.push("/profile");
            }
          }}

          >
            <Ionicons
              name={tab.icon}
              size={23}
              color={active ? dc.greenDark : "#293D35"}
            />

            <Text style={ds.navText}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setErrorMessage("");

        // CEK PENGGUNA LOGIN
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const userId = authData.user.id;

        // AMBIL NAMA DAN DATA KESEHATAN
        const [profileResult, healthResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", userId)
            .single(),

          supabase
            .from("patient_health_profiles")
            .select(
              "date_of_birth, sex_for_calculation, " +
                "height_cm, weight_kg, activity_level, " +
                "nutrition_goal",
            )
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (healthResult.error) {
          throw healthResult.error;
        }

        if (profileResult.data.role !== "patient") {
          router.replace("/auth-home");
          return;
        }

        if (!healthResult.data) {
          router.replace("/health-profile");
          return;
        }

        const health = healthResult.data as HealthRow;

        // HITUNG KALORI DARI DATA PASIEN
        const calculation = calculateDailyCalories({
          birthDate: new Date(`${health.date_of_birth}T12:00:00`),
          sex: health.sex_for_calculation,
          heightCm: Number(health.height_cm),
          weightKg: Number(health.weight_kg),
          activity: health.activity_level,
        });

        if (active) {
          setData({
            fullName: profileResult.data.full_name || "Pengguna",
            bmr: calculation.bmr,
            calories: calculation.dailyCalories,
            goal:
              goalLabels[health.nutrition_goal] || "Menjaga pola makan sehat",
          });
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data Dashboard.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // LOADING
  if (loading) {
    return (
      <SafeAreaView
        style={[
          ds.screen,
          {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={dc.green} />
        <Text style={{ marginTop: 12, color: dc.muted }}>
          Menyiapkan Dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  // ERROR
  if (!data) {
    return (
      <SafeAreaView
        style={[
          ds.screen,
          {
            justifyContent: "center",
            padding: 30,
            gap: 15,
          },
        ]}
      >
        <Text style={ds.sectionTitle}>Dashboard belum bisa dimuat</Text>

        <Text style={ds.sectionSubtitle}>
          {errorMessage || "Data pengguna tidak tersedia."}
        </Text>

        <Pressable
          style={ds.smallGreenButton}
          onPress={() => setReloadKey((key) => key + 1)}
        >
          <Text style={ds.smallGreenText}>Coba Lagi</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const firstName = data.fullName.trim().split(/\s+/)[0] || "Pengguna";

  return (
    <SafeAreaView style={ds.screen} edges={["top", "bottom"]}>
      <ScrollView
        style={ds.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ds.content}
      >
        {/* HEADER */}
        <View style={ds.header}>
          <View style={ds.avatar}>
            <Text style={ds.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={ds.smallBrand}>NutriCare AI</Text>
            <Text style={ds.brandPage}>Beranda</Text>
          </View>

          <Pressable
            style={ds.notification}
            onPress={() => showComingSoon("Notifikasi")}
          >
            <Ionicons name="notifications-outline" size={23} color="#18392D" />
          </Pressable>
        </View>

        {/* SAPAAN */}
        <View style={ds.greeting}>
          <Text style={ds.greetingTitle}>
            {getGreeting()}, {firstName} 👋
          </Text>

          <Text style={ds.greetingSubtitle}>Yuk, mulai hidup lebih sehat!</Text>
        </View>

        {/* KARTU KEBUTUHAN KALORI */}
        <LinearGradient
          colors={["#04B78A", "#0A9F7A", "#00674D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ds.calorieCard}
        >
          <View style={ds.calorieTop}>
            <View style={{ flex: 1 }}>
              <Text style={ds.overline}>ANALISIS PERSONAL</Text>

              <Text style={ds.calorieHeading}>Kebutuhan Kalori Harian</Text>
            </View>

            <View style={ds.estimateTag}>
              <Ionicons name="flash-outline" size={12} color="#FFFFFF" />
              <Text style={ds.estimateText}>Estimasi</Text>
            </View>
          </View>

          <View style={ds.calorieMain}>
            <View style={{ flex: 1 }}>
              <Text
                style={ds.calorieNumber}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.7}
              >
                {formatNumber(data.calories)}
                <Text style={ds.calorieUnit}> kkal</Text>
              </Text>

              <Text style={ds.calorieDescription}>
                Estimasi kebutuhan energimu berdasarkan metabolisme dan
                aktivitas.
              </Text>
            </View>

            <NutritionRing />
          </View>

          <View style={ds.cardDivider} />

          <View style={ds.macroRow}>
            <MacroBox label="Karbohidrat" percent="55%" color="#69F3BF" />
            <MacroBox label="Protein" percent="20%" color="#FFD68C" />
            <MacroBox label="Lemak" percent="25%" color="#EBC6FF" />
          </View>

          <View style={ds.detailRow}>
            <Text style={ds.detailHint}>Contoh pembagian makronutrien</Text>

            <Pressable
              style={ds.detailButton}
              onPress={() => router.push("/calorie-result")}
            >
              <Text style={ds.detailButtonText}>Lihat Detail</Text>

              <Ionicons name="arrow-forward" color={dc.green} size={16} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* KARTU AI DENGAN GAMBAR ICON1.PNG */}
        <LinearGradient
          colors={["#F3EBFF", "#E1F9EC", "#E8EAF5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ds.aiCard}
        >
          <View style={ds.aiContent}>
            <View style={ds.aiPill}>
              <Text style={ds.aiPillText}>✧ AI DIET COMPANION</Text>
            </View>

            <Text style={ds.aiTitle}>
              Kenalan dengan{"\n"}
              Nutri AI
            </Text>

            <Text style={ds.aiSubtitle}>Tanya seputar gizimu kapan saja</Text>

            <Pressable
              style={ds.aiButton}
              onPress={() => router.push("/ai-chat")}
            >
              <Text style={ds.aiButtonText}>Mulai Chat</Text>

              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <Image
            source={require("../../assets/images/icon1.png")}
            style={ds.aiImage}
            resizeMode="contain"
          />
        </LinearGradient>

        {/* MENU PRAKTIS */}
        <Text style={ds.sectionTitle}>Menu Praktis</Text>

        <View style={ds.menuRow}>
          <MenuCard
            title={"Kalkulator\nGizi"}
            icon="calculator-outline"
            background="#E7F9EF"
            border="#B1F4CF"
            iconColor="#007858"
            onPress={() => router.push("/calorie-result")}
          />

          <MenuCard
            title={"Cari Ahli Gizi"}
            icon="medkit-outline"
            background="#FFF5E8"
            border="#FFE0AB"
            iconColor="#DE7000"
            onPress={() => router.push("/experts")}
          />

          <MenuCard
            title={"Jadwal Saya"}
            icon="calendar-outline"
            background="#F6EDFF"
            border="#E8CEFC"
            iconColor="#7525BD"        
onPress={() => router.push("/my-schedule")}

          />
        </View>

        {/* AHLI GIZI */}
        <View style={ds.titleRow}>
          <Text style={ds.sectionTitle}>Ahli Gizi Pilihan</Text>

          <Pressable onPress={() => router.push("/experts")}>
            <Text style={ds.seeAll}>Lihat Semua</Text>
          </Pressable>
        </View>

        <Text style={ds.sectionSubtitle}>
          Konsultasi dengan ahli gizi terdaftar
        </Text>

        <Pressable
          style={ds.expertCard}
          onPress={() => router.push("/experts")}
        >
          <View style={ds.expertIcon}>
            <Ionicons name="people-outline" size={27} color={dc.green} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={ds.expertTitle}>Temukan Ahli Gizi</Text>

            <Text style={ds.expertSubtitle}>
              Pilih ahli gizi berdasarkan kebutuhan dan jadwal konsultasimu.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={21} color={dc.green} />
        </Pressable>

        {/* JADWAL KONSULTASI */}
        <View style={ds.scheduleHeading}>
          <Ionicons name="calendar-outline" size={22} color={dc.green} />

          <Text style={ds.sectionTitle}>Jadwal Konsultasi</Text>
        </View>

        <View style={ds.emptySchedule}>
          <View style={ds.emptyIcon}>
            <Ionicons
              name="calendar-clear-outline"
              size={27}
              color={dc.green}
            />
          </View>

          <Text style={ds.emptyTitle}>Belum ada jadwal konsultasi aktif</Text>

          <Text style={ds.emptyText}>
            Pilih ahli gizi dan jadwalkan sesi konsultasi pertamamu.
          </Text>

          <Pressable
            style={ds.smallGreenButton}
            onPress={() => router.push("/experts")}
          >
            <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />

            <Text style={ds.smallGreenText}>Buat Jadwal</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* NAVIGASI BAWAH */}
      <BottomNavigation />
    </SafeAreaView>
  );
}
