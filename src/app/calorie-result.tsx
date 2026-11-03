
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle } from "react-native-svg";

import { supabase } from "../../supabase";
import { cc, cs } from "../styles/calorie-result.styles";
import {
  calculateDailyCalories,
  type Sex,
  type Activity,
} from "../utils/nutrition";

type HealthRecord = {
  date_of_birth: string;
  sex_for_calculation: Sex;
  height_cm: number;
  weight_kg: number;
  activity_level: Activity;
  nutrition_goal: string;
};

type Result = {
  bmr: number;
  tdee: number;
  hydration: number;
  carbs: number;
  protein: number;
  fat: number;
  goal: string;
};

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

function getGoalDescription(goal: string) {
  switch (goal) {
    case "lose_weight":
      return "Kebutuhan pemeliharaan • target defisit perlu penyesuaian ahli gizi";
    case "gain_muscle":
      return "Kebutuhan pemeliharaan • penambahan energi perlu penyesuaian";
    case "blood_sugar":
      return "Estimasi kebutuhan energi • pola makan disesuaikan kondisi medis";
    default:
      return "Estimasi kebutuhan energi untuk menjaga berat badan";
  }
}

function showUnavailable(feature: string) {
  Alert.alert(
    feature,
    `Fitur ${feature} akan dihubungkan setelah halaman ini selesai.`
  );
}

// GRAFIK RING 55% KARBO, 20% PROTEIN, 25% LEMAK
function EnergyRing({ calories }: { calories: number }) {
  const radius = 103;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: 55, start: 0, color: "#83F5C1" },
    { value: 20, start: 55, color: "#FFD58B" },
    { value: 25, start: 75, color: "#E9C5FF" },
  ];

  return (
    <View style={cs.ringBox}>
      <Svg width={258} height={258} viewBox="0 0 258 258">
        <Circle
          cx={129}
          cy={129}
          r={radius}
          stroke="#FFFFFF26"
          strokeWidth={14}
          fill="none"
        />

        {segments.map((segment, index) => (
          <Circle
            key={index}
            cx={129}
            cy={129}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={14}
            strokeDasharray={[
              (circumference * segment.value) / 100,
              circumference -
                (circumference * segment.value) / 100,
            ]}
            strokeDashoffset={
              -(circumference * segment.start) / 100
            }
            strokeLinecap="round"
            rotation={-90}
            originX={129}
            originY={129}
          />
        ))}
      </Svg>

      <View style={cs.ringInner}>
        <View style={cs.ringBadge}>
          <Ionicons
            name="leaf-outline"
            size={13}
            color="#B3FFD9"
          />
          <Text style={cs.ringBadgeText}>
            Estimasi Energi
          </Text>
        </View>

        <Text
          style={cs.ringNumber}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatNumber(calories)}
        </Text>

        <Text style={cs.ringUnit}>
          KKAL / HARI
        </Text>
      </View>
    </View>
  );
}

function MacroPill({
  label,
  percentage,
  grams,
  color,
}: {
  label: string;
  percentage: number;
  grams: number;
  color: string;
}) {
  return (
    <View style={cs.macroPill}>
      <View style={cs.macroLabelRow}>
        <View
          style={[
            cs.macroDot,
            { backgroundColor: color },
          ]}
        />

        <Text style={cs.macroLabel}>
          {label}
        </Text>
      </View>

      <Text style={cs.macroPercent}>
        {percentage}%
      </Text>

      <Text style={cs.macroGram}>
        ~{formatNumber(grams)}g
      </Text>
    </View>
  );
}

function MetabolismItem({
  icon,
  label,
  description,
  value,
  unit,
  iconColor,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: number;
  unit: string;
  iconColor: string;
  background: string;
}) {
  return (
    <View style={cs.detailItem}>
      <View
        style={[
          cs.detailIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <View style={cs.detailInfo}>
        <Text style={cs.detailLabel}>
          {label}
        </Text>

        <Text style={cs.detailDescription}>
          {description}
        </Text>
      </View>

      <View>
        <Text
          style={[
            cs.detailNumber,
            { color: iconColor },
          ]}
        >
          {formatNumber(value)}
        </Text>

        <Text style={cs.detailUnit}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

function BottomNavigation() {
  const items = [
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
    <View style={cs.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={[
            cs.navItem,
            item.label === "Beranda" && cs.navActive,
          ]}
          
            onPress={() => {
            if (item.label === "Beranda") {
                router.replace("/dashboard");
            } else if (item.label === "AI Chat") {
                router.push("/ai-chat");
            } else if (item.label === "Profil") {
                router.push("/profile");
            } else {
                showUnavailable(item.label);
            }
            }}

        >
          <Ionicons
            name={item.icon}
            size={23}
            color={cc.greenDark}
          />

          <Text style={cs.navText}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CalorieResultScreen() {
  const [result, setResult] =
    useState<Result | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retry, setRetry] = useState(0);

  // AMBIL DATA KESEHATAN DAN HITUNG HASIL
  useEffect(() => {
    let active = true;

    async function loadResult() {
      try {
        setLoading(true);
        setErrorMessage("");

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data: health, error: healthError } =
          await supabase
            .from("patient_health_profiles")
            .select(
              "date_of_birth, sex_for_calculation, " +
              "height_cm, weight_kg, activity_level, " +
              "nutrition_goal"
            )
            .eq("user_id", authData.user.id)
            .maybeSingle();

        if (healthError) throw healthError;

        if (!health) {
          router.replace("/health-profile");
          return;
        }

        const row = health as HealthRecord;

        const height = Number(row.height_cm);
        const weight = Number(row.weight_kg);

        const calculation = calculateDailyCalories({
          birthDate: new Date(
            `${row.date_of_birth}T12:00:00`
          ),
          sex: row.sex_for_calculation,
          heightCm: height,
          weightKg: weight,
          activity: row.activity_level,
        });

        const calories = calculation.dailyCalories;

        if (!Number.isFinite(calories) || calories <= 0) {
          throw new Error(
            "Data kesehatan belum valid. Perbarui profil kesehatan."
          );
        }

        // Contoh komposisi 55% / 20% / 25%.
        // Karbohidrat dan protein 4 kkal/gram.
        // Lemak 9 kkal/gram.
        const carbs = (calories * 0.55) / 4;
        const protein = (calories * 0.20) / 4;
        const fat = (calories * 0.25) / 9;

        // Perkiraan kasar hidrasi: 35 mL/kg.
        // Dibulatkan ke 50 mL terdekat.
        const hydration =
          Math.round((weight * 35) / 50) * 50;

        if (active) {
          setResult({
            bmr: calculation.bmr,
            tdee: calories,
            hydration,
            carbs,
            protein,
            fat,
            goal: row.nutrition_goal,
          });
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Gagal menghitung kebutuhan kalori."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResult();

    return () => {
      active = false;
    };
  }, [retry]);

  async function handleShare() {
    if (!result) return;

    try {
      await Share.share({
        message:
          "Hasil Analisis Kalori NutriCare AI\n\n" +
          `BMR: ${formatNumber(result.bmr)} kkal/hari\n` +
          `TDEE: ${formatNumber(result.tdee)} kkal/hari\n` +
          `Estimasi cairan: ${formatNumber(result.hydration)} mL/hari\n\n` +
          "Angka merupakan estimasi awal, bukan diagnosis medis.",
      });
    } catch {
      Alert.alert(
        "Gagal Berbagi",
        "Tidak dapat membuka menu berbagi."
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          cs.screen,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={cc.green}
        />
        <Text
          style={{
            marginTop: 12,
            color: cc.muted,
          }}
        >
          Menghitung kebutuhan kalorimu...
        </Text>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView
        style={[
          cs.screen,
          {
            justifyContent: "center",
            padding: 25,
            gap: 15,
          },
        ]}
      >
        <Text style={cs.title}>
          Hasil belum tersedia
        </Text>

        <Text style={cs.subtitle}>
          {errorMessage}
        </Text>

        <Pressable
          style={cs.consultButton}
          onPress={() => setRetry((r) => r + 1)}
        >
          <Text style={cs.consultText}>
            Coba Lagi
          </Text>
        </Pressable>

        <Pressable
          style={cs.updateButton}
          onPress={() => router.replace("/health-profile")}
        >
          <Text style={cs.updateText}>
            Perbarui Profil Kesehatan
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={cs.screen}
      edges={["top", "bottom"]}
    >
      {/* HEADER */}
      <View style={cs.header}>
        <Pressable
          style={cs.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={cc.text}
          />
        </Pressable>

        <Text style={cs.headerTitle}>
          Hasil Analisis Kalori
        </Text>

        <Pressable
          style={cs.iconButton}
          onPress={handleShare}
        >
          <Ionicons
            name="share-social-outline"
            size={22}
            color={cc.green}
          />
        </Pressable>
      </View>

      <ScrollView
        style={cs.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={cs.content}
      >
        {/* LABEL ANALISIS */}
        <View style={cs.topBadge}>
          <Ionicons
            name="flash-outline"
            size={15}
            color={cc.greenDark}
          />

          <Text style={cs.topBadgeText}>
            Analisis Berdasarkan Mifflin–St Jeor
          </Text>
        </View>

        {/* JUDUL */}
        <Text style={cs.title}>
          Kebutuhan Energi{"\n"}
          Harianmu
        </Text>

        <Text style={cs.subtitle}>
          Berdasarkan profil kesehatan, aktivitas,
          dan target nutrisi yang kamu pilih.
        </Text>

        {/* KARTU HIJAU */}
        <LinearGradient
          colors={[
            "#006B4F",
            "#068A65",
            "#005C47",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cs.calorieCard}
        >
          <EnergyRing calories={result.tdee} />

          <Text style={cs.targetHint}>
            {getGoalDescription(result.goal)}
          </Text>

          <View style={cs.greenDivider} />

          <View style={cs.macroRow}>
            <MacroPill
              label="Karbo"
              percentage={55}
              grams={result.carbs}
              color="#83F5C1"
            />

            <MacroPill
              label="Protein"
              percentage={20}
              grams={result.protein}
              color="#FFD58B"
            />

            <MacroPill
              label="Lemak"
              percentage={25}
              grams={result.fat}
              color="#E9C5FF"
            />
          </View>
        </LinearGradient>

        {/* RINCIAN METABOLISME */}
        <View style={cs.detailsCard}>
          <View style={cs.cardHeading}>
            <View style={cs.headingAccent} />

            <Text style={cs.cardTitle}>
              Rincian Metabolisme
            </Text>

            <View style={cs.smallBadge}>
              <Text style={cs.smallBadgeText}>
                Estimasi
              </Text>
            </View>
          </View>

          <MetabolismItem
            icon="moon-outline"
            label="BMR (Basal Metabolic Rate)"
            description="Estimasi energi saat istirahat"
            value={result.bmr}
            unit="kkal"
            iconColor="#006B50"
            background="#C0F6E3"
          />

          <MetabolismItem
            icon="walk-outline"
            label="TDEE (Total Energi Harian)"
            description="BMR disesuaikan dengan aktivitas"
            value={result.tdee}
            unit="kkal"
            iconColor="#006B50"
            background="#C0F6E3"
          />

          <MetabolismItem
            icon="water-outline"
            label="Kebutuhan Hidrasi"
            description="Perkiraan awal 35 mL/kg berat badan"
            value={result.hydration}
            unit="mL/hari"
            iconColor="#0781C8"
            background="#DFE9FF"
          />

          <Text style={cs.footnote}>
            Perkiraan untuk orang dewasa. Kebutuhan
            nyata dapat berbeda karena kondisi
            kesehatan, aktivitas, dan faktor lainnya.
          </Text>
        </View>

        {/* KARTU NUTRI AI */}
        <LinearGradient
          colors={[
            "#F0E8FF",
            "#E3F9ED",
            "#F7FFFA",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cs.aiCard}
        >
          <View style={cs.aiBadge}>
            <Text style={cs.aiBadgeText}>
              ✧ Asisten Pintar Nutri AI
            </Text>
          </View>

          <View style={cs.aiRow}>
            <Image
              source={require("../../assets/images/icon1.png")}
              style={cs.aiImage}
              resizeMode="contain"
            />

            <View style={cs.aiTextBox}>
              <Text style={cs.aiTitle}>
                Mau susun menu makan sesuai{" "}
                {formatNumber(result.tdee)} kkal?
              </Text>

              <Text style={cs.aiDescription}>
                Konsultasikan rencana menu harianmu
                bersama Nutri AI atau ahli gizi.
              </Text>
            </View>
          </View>

          <Pressable
            style={cs.aiButton}
            onPress={() => router.push("/ai-chat")}
          >
            <Text style={cs.aiButtonText}>
              Chat dengan Nutri AI Sekarang
            </Text>

            <Ionicons
              name="chatbubble-ellipses-outline"
              size={19}
              color="#FFFFFF"
            />
          </Pressable>
        </LinearGradient>

        {/* KONSULTASI */}
        <Pressable
          style={cs.consultButton}
          onPress={() =>
            showUnavailable("Konsultasi Ahli Gizi")
          }
        >
          <Ionicons
            name="medkit-outline"
            size={20}
            color={cc.greenDark}
          />

          <Text style={cs.consultText}>
            Konsultasi dengan Ahli Gizi Berlisensi
          </Text>
        </Pressable>

        {/* EDIT PROFIL KESEHATAN */}
        <Pressable
          style={cs.updateButton}
          onPress={() =>
            router.push("/health-profile")
          }
        >
          <Ionicons
            name="create-outline"
            size={17}
            color="#283E32"
          />

          <Text style={cs.updateText}>
            Perbarui Data Profil
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}
