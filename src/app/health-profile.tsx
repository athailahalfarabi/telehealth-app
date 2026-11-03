
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../supabase";
import { hs, healthColors as c } from "../styles/health.styles";
import {
  calculateBMI,
  calculateDailyCalories,
  getAge,
  getBMIStatus,
  type Activity,
  type Sex,
} from "../utils/nutrition";

type Goal =
  | "maintain"
  | "lose_weight"
  | "gain_muscle"
  | "blood_sugar";

const goals: { value: Goal; label: string }[] = [
  { value: "maintain", label: "Menjaga Berat Badan Ideal" },
  { value: "lose_weight", label: "Menurunkan Berat Badan" },
  { value: "gain_muscle", label: "Menaikkan Massa Otot" },
  { value: "blood_sugar", label: "Manajemen Gula Darah" },
];

const activities: {
  value: Activity;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "low",
    label: "Ringan (Sedentari)",
    desc: "Banyak duduk, minim olahraga",
    icon: "cafe-outline",
  },
  {
    value: "moderate",
    label: "Sedang (Aktif Ringan)",
    desc: "Olahraga 1–3x seminggu",
    icon: "walk-outline",
  },
  {
    value: "high",
    label: "Tinggi (Sangat Aktif)",
    desc: "Olahraga intensif 4–6x seminggu",
    icon: "flash-outline",
  },
];

const conditions = [
  { value: "gerd", label: "Maag / GERD" },
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hipertensi" },
];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function SectionHeading({
  icon,
  title,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: string;
}) {
  return (
    <>
      <View style={hs.sectionHeading}>
        <Ionicons name={icon} size={19} color={c.green} />

        <Text style={hs.sectionTitle}>{title}</Text>

        {badge ? (
          <View style={hs.badge}>
            <Text style={hs.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={hs.divider} />
    </>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[hs.chip, active && hs.chipActive]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
    >
      <Text
        style={[
          hs.chipText,
          active && hs.chipTextActive,
        ]}
      >
        {active ? "✓  " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

export default function HealthProfileScreen() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [noAllergies, setNoAllergies] = useState(false);
  const [medicalConditions, setMedicalConditions] =
    useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const heightNumber = Number(height.replace(",", "."));
  const weightNumber = Number(weight.replace(",", "."));

  const bmi = calculateBMI(heightNumber, weightNumber);

  // MEMUAT DATA LAMA JIKA PASIEN PERNAH MENGISI
  useEffect(() => {
    let active = true;

    async function loadHealthProfile() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("patient_health_profiles")
          .select("*")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (error) throw error;
        if (!active || !data) return;

        setBirthDate(
          new Date(`${data.date_of_birth}T12:00:00`)
        );
        setSex(data.sex_for_calculation as Sex);
        setHeight(String(data.height_cm));
        setWeight(String(data.weight_kg));
        setActivity(data.activity_level as Activity);
        setGoal(data.nutrition_goal as Goal);

        const storedAllergies = data.allergies ?? [];
        setAllergies(storedAllergies);
        setNoAllergies(storedAllergies.length === 0);

        setMedicalConditions(
          data.medical_conditions ?? []
        );
        setNotes(data.notes ?? "");
      } catch (error) {
        Alert.alert(
          "Gagal Memuat Data",
          error instanceof Error
            ? error.message
            : "Silakan coba kembali."
        );
      } finally {
        if (active) setLoadingData(false);
      }
    }

    loadHealthProfile();

    return () => {
      active = false;
    };
  }, []);

  function toggleAllergy(value: string) {
    setNoAllergies(false);

    setAllergies((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
  }

  function toggleCondition(value: string) {
    setMedicalConditions((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
  }

  // SIMPAN DATA KE SUPABASE
  async function handleSave() {
    if (
      !birthDate ||
      !sex ||
      !height.trim() ||
      !weight.trim() ||
      !activity ||
      !goal
    ) {
      Alert.alert(
        "Data Belum Lengkap",
        "Lengkapi data fisik, aktivitas, dan target nutrisi."
      );
      return;
    }

    if (
      !Number.isFinite(heightNumber) ||
      !Number.isFinite(weightNumber) ||
      heightNumber < 50 ||
      heightNumber > 250 ||
      weightNumber < 10 ||
      weightNumber > 400
    ) {
      Alert.alert(
        "Periksa Pengukuran",
        "Tinggi harus 50–250 cm dan berat 10–400 kg."
      );
      return;
    }

    if (getAge(birthDate) < 18) {
      Alert.alert(
        "Perhitungan Belum Tersedia",
        "Estimasi kalori pada prototipe ini hanya disiapkan untuk pengguna berusia 18 tahun ke atas."
      );
      return;
    }

    if (!noAllergies && allergies.length === 0) {
      Alert.alert(
        "Informasi Alergi",
        "Pilih Bebas Alergi atau salah satu jenis alergi."
      );
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Sesi login berakhir. Silakan masuk lagi.");
      }

      const { error } = await supabase
        .from("patient_health_profiles")
        .upsert(
          {
            user_id: authData.user.id,
            date_of_birth: toDateString(birthDate),
            sex_for_calculation: sex,
            height_cm: heightNumber,
            weight_kg: weightNumber,
            activity_level: activity,
            nutrition_goal: goal,
            allergies: noAllergies ? [] : allergies,
            medical_conditions: medicalConditions,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      const calories = calculateDailyCalories({
        birthDate,
        sex,
        heightCm: heightNumber,
        weightKg: weightNumber,
        activity,
      });

      Alert.alert(
        "Profil Kesehatan Tersimpan! 💚",
        `BMI: ${bmi.toFixed(1)} (${getBMIStatus(bmi)})\n\nEstimasi kebutuhan energi: ${calories.dailyCalories.toLocaleString("id-ID")} kkal/hari.\n\nAngka ini merupakan estimasi awal.`,
        [
          {
            text: "Lanjut",
            onPress: () => router.replace("/auth-home"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Gagal Menyimpan",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan. Coba lagi."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <SafeAreaView
        style={[
          hs.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={c.green}
        />
        <Text style={{ marginTop: 12, color: c.secondary }}>
          Memuat profil kesehatan...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={hs.screen}>
      <LinearGradient
        colors={["#F3FFFA", "#FAF8FF", "#F7FBFF"]}
        style={hs.gradient}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={hs.scrollContent}
      >
        {/* HEADER */}
        <View style={hs.header}>
          <Pressable
            style={hs.backButton}
           onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={c.green}
            />
          </Pressable>

          <View style={hs.headerCenter}>
            <Text style={hs.headerTitle}>
              Profil Kesehatan
            </Text>
            <Text style={hs.headerStep}>
              Langkah 1 dari 2
            </Text>
          </View>

          <View style={hs.headerLogo}>
            <Ionicons
              name="leaf-outline"
              size={20}
              color={c.green}
            />
          </View>
        </View>

        <View style={hs.progressTrack}>
          <View style={hs.progressFill} />
        </View>

        {/* AI ASSISTANT */}
        <View style={hs.assistantCard}>
          <View style={hs.assistantImageBox}>
            <Image
              source={require("../../assets/images/icon1.png")}
              resizeMode="contain"
              style={hs.assistantImage}
            />
          </View>

          <View style={hs.assistantText}>
            <Text style={hs.assistantTag}>
              ✧ AI NutriCare Assistant
            </Text>

            <Text style={hs.assistantTitle}>
              Lengkapi Data Medis & Fisik
            </Text>

            <Text style={hs.assistantDescription}>
              Informasi ini membantu memperkirakan
              kebutuhan energi dan menyesuaikan
              layanan nutrisi.
            </Text>
          </View>
        </View>

        {/* DATA FISIK */}
        <View style={hs.card}>
          <SectionHeading
            icon="pulse-outline"
            title="Data Fisik & Biometrik"
            badge="Klinis"
          />

          <Text style={hs.label}>Tanggal Lahir</Text>

          <Pressable
            style={hs.field}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={c.green}
            />
            <Text style={hs.fieldText}>
              {birthDate
                ? birthDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Pilih tanggal lahir"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color="#61716C"
            />
          </Pressable>

          {showPicker && (
            <View>
              <DateTimePicker
                value={birthDate ?? new Date(2000, 0, 1)}
                mode="date"
                display={
                  Platform.OS === "ios"
                    ? "spinner"
                    : "default"
                }
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === "android") {
                    setShowPicker(false);
                  }

                  if (
                    event.type === "set" &&
                    selectedDate
                  ) {
                    setBirthDate(selectedDate);
                  }
                }}
              />

              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => setShowPicker(false)}
                >
                  <Text style={{ color: c.green }}>
                    Selesai
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={hs.spacedSection}>
            <Text style={hs.label}>
              Jenis Kelamin (untuk perhitungan)
            </Text>

            <View style={hs.row}>
              {([
                ["female", "Perempuan", "female-outline"],
                ["male", "Laki-laki", "male-outline"],
              ] as const).map(([value, label, icon]) => (
                <Pressable
                  key={value}
                  onPress={() => setSex(value)}
                  style={[
                    hs.choice,
                    sex === value && hs.choiceActive,
                  ]}
                >
                  <Ionicons
                    name={icon}
                    size={16}
                    color={c.green}
                  />
                  <Text
                    style={[
                      hs.choiceText,
                      sex === value && hs.choiceTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {sex === value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={c.green}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[hs.row, hs.spacedSection]}>
            <View style={hs.half}>
              <Text style={hs.label}>
                Tinggi Badan
              </Text>
              <View style={hs.field}>
                <TextInput
                  style={hs.numericInput}
                  placeholder="165"
                  keyboardType="decimal-pad"
                  value={height}
                  onChangeText={setHeight}
                  maxLength={6}
                />
                <Text style={hs.unit}>cm</Text>
              </View>
            </View>

            <View style={hs.half}>
              <Text style={hs.label}>
                Berat Badan
              </Text>
              <View style={hs.field}>
                <TextInput
                  style={hs.numericInput}
                  placeholder="58"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                  maxLength={6}
                />
                <Text style={hs.unit}>kg</Text>
              </View>
            </View>
          </View>

          <View style={hs.bmiBox}>
            <View style={hs.bmiIcon}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color="#FFFFFF"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={hs.bmiOverline}>
                KALKULASI OTOMATIS
              </Text>
              <Text style={hs.bmiValue}>
                BMI: {bmi > 0 ? bmi.toFixed(1) : "—"}
              </Text>
            </View>

            <Text style={hs.bmiStatus}>
              ● {getBMIStatus(bmi)}
            </Text>
          </View>
        </View>

        {/* AKTIVITAS */}
        <View style={hs.card}>
          <SectionHeading
            icon="walk-outline"
            title="Tingkat Aktivitas Harian"
          />

          {activities.map((item) => {
            const selected = activity === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() => setActivity(item.value)}
                style={[
                  hs.activityItem,
                  selected && hs.activityActive,
                ]}
              >
                <View
                  style={[
                    hs.activityIcon,
                    selected && hs.activityIconActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={selected ? "#FFFFFF" : c.dark}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={hs.activityTitle}>
                    {item.label}
                  </Text>
                  <Text style={hs.activitySubtitle}>
                    {item.desc}
                  </Text>
                </View>

                <View
                  style={[
                    hs.radio,
                    selected && hs.radioActive,
                  ]}
                >
                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* TARGET NUTRISI */}
        <View style={hs.card}>
          <SectionHeading
            icon="flag-outline"
            title="Target Nutrisi & Kesehatan"
          />

          <Text style={hs.helper}>
            Pilih fokus utama tujuan nutrisi yang ingin
            kamu capai:
          </Text>

          <View style={hs.chips}>
            {goals.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={goal === item.value}
                onPress={() => setGoal(item.value)}
              />
            ))}
          </View>
        </View>

        {/* RIWAYAT MEDIS */}
        <View style={hs.card}>
          <SectionHeading
            icon="shield-checkmark-outline"
            title="Skrining Riwayat Medis"
            badge="Multi-pilihan"
          />

          <Text style={hs.helper}>
            Pilih kondisi yang berlaku atau riwayat
            alergi makanan:
          </Text>

          <View style={hs.chips}>
            <Chip
              label="Bebas Alergi"
              active={noAllergies}
              onPress={() => {
                setNoAllergies(true);
                setAllergies([]);
              }}
            />

            <Chip
              label="Alergi Makanan Laut"
              active={allergies.includes("seafood")}
              onPress={() => toggleAllergy("seafood")}
            />

            <Chip
              label="Intoleransi Laktosa"
              active={allergies.includes("lactose")}
              onPress={() => toggleAllergy("lactose")}
            />

            {conditions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                active={medicalConditions.includes(item.value)}
                onPress={() => toggleCondition(item.value)}
              />
            ))}
          </View>

          <View style={hs.spacedSection}>
            <Text style={hs.label}>
              Catatan Khusus (Opsional)
            </Text>

            <TextInput
              style={hs.notesInput}
              placeholder="Tuliskan preferensi makanan atau kondisi medis lainnya..."
              placeholderTextColor="#A0A5B0"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        {/* SIMPAN */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[hs.submit, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={hs.submitText}>
                Simpan & Hitung Kebutuhan Kalori
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </>
          )}
        </Pressable>

        <Text style={hs.footer}>
          Data kesehatan hanya dapat diakses oleh akun
          yang diizinkan sesuai aturan akses aplikasi.
          Estimasi kalori bukan diagnosis medis.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
