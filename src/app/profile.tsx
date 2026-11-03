
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../supabase";
import { pc, ps } from "../styles/profile.styles";
import { getAge } from "../utils/nutrition";

type HealthData = {
  date_of_birth: string;
  sex_for_calculation: string;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  nutrition_goal: string;
  allergies: string[];
  medical_conditions: string[];
  notes: string | null;
};

type ProfileData = {
  name: string;
  email: string;
  health: HealthData | null;
};

const activityLabels: Record<string, string> = {
  low: "Aktivitas Ringan",
  moderate: "Aktivitas Sedang",
  high: "Aktivitas Tinggi",
};

const goalLabels: Record<string, string> = {
  maintain: "Menjaga Berat & Pola Makan",
  lose_weight: "Menurunkan Berat Badan",
  gain_muscle: "Menaikkan Massa Otot",
  blood_sugar: "Manajemen Gula Darah",
};

const allergyLabels: Record<string, string> = {
  seafood: "Alergi Makanan Laut",
  lactose: "Intoleransi Laktosa",
};

const conditionLabels: Record<string, string> = {
  gerd: "Maag / GERD",
  diabetes: "Diabetes",
  hypertension: "Hipertensi",
};

function formatNumber(value: number) {
  return Number(value).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  });
}

function getBirthInfo(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Belum tersedia";
  }

  const formatted = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${formatted} (${getAge(date)} Tahun)`;
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        ps.infoRow,
        last && ps.infoRowLast,
      ]}
    >
      <Text style={ps.infoLabel}>
        {label}
      </Text>

      <Text style={ps.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function MetricBox({
  icon,
  label,
  value,
  unit,
  large = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  large?: boolean;
}) {
  return (
    <View style={ps.metricBox}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
      }}>
        <Ionicons
          name={icon}
          size={15}
          color={pc.green}
        />

        <Text style={ps.metricLabel}>
          {label}
        </Text>
      </View>

      <Text
        style={
          large
            ? ps.metricValue
            : ps.metricSmallValue
        }
      >
        {value}
        {unit ? (
          <Text style={ps.metricUnit}>
            {" "}{unit}
          </Text>
        ) : null}
      </Text>
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
    <View style={ps.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.label === "Profil";

        return (
          <Pressable
            key={tab.label}
            style={[
              ps.navItem,
              active && ps.navActive,
            ]}
            
                onPress={() => {
                if (tab.label === "Beranda") {
                    router.replace("/dashboard");
                } else if (tab.label === "AI Chat") {
                    router.push("/ai-chat");
                } else if (!active) {
                    Alert.alert(
                    tab.label,
                    `Fitur ${tab.label} akan kita kerjakan berikutnya.`
                    );
                }
                }}

          >
            <Ionicons
              name={tab.icon}
              size={23}
              color={
                active
                  ? pc.darkGreen
                  : "#283D33"
              }
            />

            <Text style={ps.navText}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const [data, setData] =
    useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // MEMBACA DATA AKUN DAN PROFIL KESEHATAN
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMessage("");

        // 1. AMBIL PENGGUNA YANG SEDANG LOGIN
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const userId = authData.user.id;
        const userEmail = authData.user.email || "";

        // 2. AMBIL NAMA DAN ROLE
        const { data: account, error: accountError } =
          await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", userId)
            .single();

        if (accountError) throw accountError;

        if (!account) {
          throw new Error("Data akun belum ditemukan.");
        }

        if (account.role !== "patient") {
          router.replace("/auth-home");
          return;
        }

        // 3. AMBIL DATA KESEHATAN PASIEN
        const { data: health, error: healthError } =
          await supabase
            .from("patient_health_profiles")
            .select(
              "date_of_birth, sex_for_calculation, " +
              "height_cm, weight_kg, activity_level, " +
              "nutrition_goal, allergies, " +
              "medical_conditions, notes"
            )
            .eq("user_id", userId)
            .maybeSingle();

        if (healthError) throw healthError;

        if (active) {
          setData({
            name: account.full_name || "Pengguna",
            email: userEmail,
            health: (health as HealthData | null) ?? null,
          });
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Tidak dapat memuat profil."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [retryKey]);

  // KELUAR AKUN
  async function handleLogout() {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      Alert.alert("Gagal Logout", error.message);
      return;
    }

    router.replace("/login");
  }

  function confirmLogout() {
    Alert.alert(
      "Keluar dari NutriCare AI?",
      "Kamu perlu login kembali untuk mengakses akun.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => {
            void handleLogout();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          ps.screen,
          {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={pc.green}
        />
        <Text style={{
          marginTop: 14,
          color: pc.muted,
        }}>
          Memuat Profil Saya...
        </Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[
        ps.screen,
        {
          padding: 30,
          justifyContent: "center",
          gap: 15,
        },
      ]}>
        <Text style={ps.headerTitle}>
          Profil gagal dimuat
        </Text>

        <Text style={ps.bodyText}>
          {errorMessage}
        </Text>

        <Pressable
          style={ps.editButton}
          onPress={() => setRetryKey((k) => k + 1)}
        >
          <Text style={ps.editText}>
            Coba Lagi
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const health = data.health;
  const initial =
    data.name.trim().charAt(0).toUpperCase() || "P";

  const sexLabel =
    health?.sex_for_calculation === "female"
      ? "Perempuan"
      : health?.sex_for_calculation === "male"
      ? "Laki-laki"
      : "Belum diisi";

  const allergies = health?.allergies ?? [];
  const conditions = health?.medical_conditions ?? [];

  return (
    <SafeAreaView
      style={ps.screen}
      edges={["top", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ps.content}
      >
        {/* HEADER */}
        <View style={ps.header}>
          <Pressable
            style={ps.iconButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={pc.green}
            />
          </Pressable>

          <Text style={ps.headerTitle}>
            Profil Saya
          </Text>

          <Pressable
            style={ps.iconButton}
            onPress={() =>
              Alert.alert(
                "Pengaturan Profil",
                "Kamu dapat mengubah data kesehatan atau keluar dari akun melalui tombol di bawah."
              )
            }
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={pc.darkGreen}
            />
          </Pressable>
        </View>

        {/* KARTU IDENTITAS */}
        <LinearGradient
          colors={[
            "#E8FBF2",
            "#C7FAE4",
            "#FFFFFF",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ps.hero}
        >
          <View style={ps.avatarOutline}>
            <View style={ps.avatar}>
              <Text style={ps.avatarInitial}>
                {initial}
              </Text>
            </View>

            <View style={ps.avatarBadge}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={ps.profileName}>
            {data.name}
          </Text>

          <Text style={ps.profileEmail}>
            {data.email}
          </Text>

          <View style={ps.statusPill}>
            <Ionicons
              name={
                health
                  ? "checkmark-circle"
                  : "alert-circle-outline"
              }
              color={pc.green}
              size={15}
            />

            <Text style={ps.statusText}>
              {health
                ? "Profil Kesehatan Terisi"
                : "Profil Kesehatan Belum Lengkap"}
            </Text>
          </View>
        </LinearGradient>

        {/* INFORMASI PRIBADI */}
        <View style={ps.card}>
          <View style={ps.cardHeading}>
            <View style={ps.headingIcon}>
              <Ionicons
                name="person-outline"
                color={pc.green}
                size={19}
              />
            </View>

            <Text style={ps.headingTitle}>
              Informasi Pribadi
            </Text>
          </View>

          <InfoRow
            label="Nama Lengkap"
            value={data.name}
          />

          <InfoRow
            label="Email"
            value={data.email}
          />

          <InfoRow
            label="Tanggal Lahir"
            value={
              health
                ? getBirthInfo(health.date_of_birth)
                : "Belum diisi"
            }
          />

          <InfoRow
            label="Jenis Kelamin"
            value={sexLabel}
            last
          />
        </View>

        {/* DATA KESEHATAN */}
        <View style={ps.healthCard}>
          <View style={ps.cardHeading}>
            <View style={[
              ps.headingIcon,
              { backgroundColor: "#D8F4E6" },
            ]}>
              <Ionicons
                name="heart-outline"
                size={20}
                color={pc.green}
              />
            </View>

            <Text style={[
              ps.headingTitle,
              ps.healthHeading,
            ]}>
              Data Kesehatan & Nutrisi
            </Text>

            <View style={ps.currentPill}>
              <Text style={ps.currentText}>
                {health ? "Terkini" : "Kosong"}
              </Text>
            </View>
          </View>

          {health ? (
            <View style={ps.metricGrid}>
              <MetricBox
                icon="resize-outline"
                label="Tinggi Badan"
                value={formatNumber(health.height_cm)}
                unit="cm"
                large
              />

              <MetricBox
                icon="speedometer-outline"
                label="Berat Badan"
                value={formatNumber(health.weight_kg)}
                unit="kg"
                large
              />

              <MetricBox
                icon="walk-outline"
                label="Aktivitas"
                value={
                  activityLabels[health.activity_level] ||
                  health.activity_level
                }
              />

              <MetricBox
                icon="restaurant-outline"
                label="Target Diet"
                value={
                  goalLabels[health.nutrition_goal] ||
                  health.nutrition_goal
                }
              />
            </View>
          ) : (
            <Text style={ps.bodyText}>
              Kamu belum melengkapi Profil Kesehatan.
              Isi dulu agar kebutuhan kalori dapat dihitung.
            </Text>
          )}

          <View style={ps.infoNote}>
            <Ionicons
              name="information-circle-outline"
              color={pc.green}
              size={18}
            />

            <Text style={ps.noteText}>
              Data ini digunakan untuk estimasi kebutuhan
              kalori dan personalisasi layanan nutrisi.
            </Text>
          </View>
        </View>

        {/* INFORMASI TAMBAHAN */}
        <View style={ps.card}>
          <View style={ps.cardHeading}>
            <View style={ps.headingIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={pc.green}
              />
            </View>

            <Text style={ps.headingTitle}>
              Informasi Tambahan
            </Text>
          </View>

          <Text style={ps.extraLabel}>
            Alergi Makanan
          </Text>

          {allergies.length === 0 ? (
            <View style={ps.tag}>
              <Text style={ps.tagText}>
                ✓ Tidak ada alergi yang dilaporkan
              </Text>
            </View>
          ) : (
            allergies.map((item) => (
              <View key={item} style={ps.tag}>
                <Text style={ps.tagText}>
                  {allergyLabels[item] || item}
                </Text>
              </View>
            ))
          )}

          <View style={ps.extraDivider} />

          <Text style={ps.extraLabel}>
            Kondisi Medis Khusus
          </Text>

          {conditions.length === 0 ? (
            <Text style={ps.bodyText}>
              Tidak ada kondisi medis yang dicatat.
            </Text>
          ) : (
            conditions.map((item) => (
              <View key={item} style={ps.tag}>
                <Text style={ps.tagText}>
                  {conditionLabels[item] || item}
                </Text>
              </View>
            ))
          )}

          {health?.notes ? (
            <>
              <View style={ps.extraDivider} />

              <Text style={ps.extraLabel}>
                Catatan Khusus
              </Text>

              <Text style={ps.bodyText}>
                {health.notes}
              </Text>
            </>
          ) : null}

          <View style={ps.extraDivider} />

          <View style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-start",
          }}>
            <Ionicons
              name="lock-closed-outline"
              color={pc.green}
              size={17}
            />

            <Text style={[ps.noteText, { flex: 1 }]}>
              Akses data kesehatan dibatasi oleh
              aturan keamanan akun di Supabase.
            </Text>
          </View>
        </View>

        {/* EDIT PROFIL */}
        <Pressable
          style={ps.editButton}
          onPress={() => router.push("/health-profile")}
        >
          <Ionicons
            name="create-outline"
            size={21}
            color="#FFFFFF"
          />

          <Text style={ps.editText}>
            Edit Profil
          </Text>
        </Pressable>

        {/* LOGOUT */}
        <Pressable
          style={ps.logoutButton}
          onPress={confirmLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#CF2F36"
          />

          <Text style={ps.logoutText}>
            Keluar Akun
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNavigation />
    </SafeAreaView>
  );
}
