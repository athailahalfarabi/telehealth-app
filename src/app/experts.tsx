
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  type ImageSourcePropType,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "../../supabase";
import ConsultBottomNav from "../components/ConsultBottomNav";
import { cg, cst } from "../styles/consult.styles";
import {
  doctorPhotos,
  formatRupiah,
  type ConsultationSlot,
  type Nutritionist,
} from "../utils/consultation";

type Filter = "all" | Nutritionist["focus"];

type NutritionistWithPhoto = Nutritionist & {
  photo_storage_path?: string | null;
};

function photoSource(expert: NutritionistWithPhoto): ImageSourcePropType | null {
  const path = expert.photo_storage_path?.trim();
  if (path) {
    const { data } = supabase.storage
      .from("nutritionist-photos")
      .getPublicUrl(path);
    return { uri: data.publicUrl };
  }

  if (expert.photo_key === "female" || expert.photo_key === "male") {
    return doctorPhotos[expert.photo_key];
  }
  return null;
}

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "weight", label: "Berat Badan" },
  { value: "eating", label: "Pola Makan" },
  { value: "mother", label: "Ibu & Anak" },
];

function NutritionistCard({
  expert,
  recommended,
  hasSlots,
}: {
  expert: NutritionistWithPhoto;
  recommended: boolean;
  hasSlots: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const source = photoSource(expert);

  return (
    <View
      style={[
        cst.expertCard,
        recommended && cst.recommendedCard,
      ]}
    >
      <View style={cst.expertTop}>
        <View style={cst.photoBox}>
          {source && !photoFailed ? (
            <Image
              source={source}
              style={cst.photo}
              resizeMode="cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <View style={[cst.photo, { alignItems: "center", justifyContent: "center", backgroundColor: "#E8F7EF" }]}>
              <Ionicons name="person-outline" size={35} color={cg.green} />
            </View>
          )}

          {hasSlots && <View style={cst.onlineDot} />}
        </View>

        <View style={{ flex: 1 }}>
          <View style={cst.verifiedBadge}>
            <Text style={cst.verifiedText}>
              {expert.is_verified && !expert.is_demo
                ? "✧ STR & SIP Terverifikasi"
                : "✧ Profil Demo"}
            </Text>
          </View>

          <Text style={cst.expertName}>
            {expert.display_name}
          </Text>

          <Text style={cst.expertSpecialty}>
            {expert.specialty}
          </Text>
        </View>
      </View>

      <View style={cst.cardDivider} />

      <View style={cst.serviceRow}>
        <Ionicons
          name="chatbox-outline"
          size={19}
          color={cg.green}
        />

        <Text style={cst.serviceText}>
          Konsultasi Chat
        </Text>

        <Text style={{ color: "#B7C9BD" }}>•</Text>

        <Text style={cst.serviceText}>
          {expert.session_minutes} Menit
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ color: cg.muted, fontSize: 11 }}>
          {hasSlots
            ? "Jadwal tersedia"
            : "Belum ada jadwal"}
        </Text>

        <Text style={cst.servicePrice}>
          {formatRupiah(expert.price_idr)}
          <Text style={{ fontSize: 11, fontWeight: "400" }}>
            {" "}/ sesi
          </Text>
        </Text>
      </View>

      <Pressable
        style={[
          cst.primaryButton,
          !recommended && cst.outlineButton,
        ]}
        onPress={() =>
          router.push({
            pathname: "/expert-detail",
            params: { id: expert.id },
          })
        }
      >
        <Text
          style={[
            cst.primaryText,
            !recommended && cst.outlineText,
          ]}
        >
          Lihat Profil
        </Text>

        <Ionicons
          name="arrow-forward"
          size={19}
          color={recommended ? "#FFFFFF" : cg.green}
        />
      </Pressable>
    </View>
  );
}

export default function ExpertsScreen() {
  const [experts, setExperts] = useState<NutritionistWithPhoto[]>([]);
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data: userData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !userData.user) {
          router.replace("/login");
          return;
        }

        const [expertResult, slotResult, healthResult] =
          await Promise.all([
            supabase
              .from("nutritionists")
              .select("*")
              .eq("is_active", true)
              .order("created_at"),

            supabase
              .from("consultation_slots")
              .select("*")
              .eq("is_booked", false)
              .gte("starts_at", new Date().toISOString())
              .order("starts_at"),

            supabase
              .from("patient_health_profiles")
              .select("nutrition_goal")
              .eq("user_id", userData.user.id)
              .maybeSingle(),
          ]);

        if (expertResult.error) throw expertResult.error;
        if (slotResult.error) throw slotResult.error;
        if (healthResult.error) throw healthResult.error;

        setExperts(expertResult.data ?? []);
        setSlots(slotResult.data ?? []);
        setGoal(healthResult.data?.nutrition_goal ?? null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat ahli gizi."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = experts.filter((expert) => {
    const matchesFilter =
      filter === "all" || expert.focus === filter;

    const query = search.trim().toLowerCase();

    const matchesSearch =
      expert.display_name.toLowerCase().includes(query) ||
      expert.specialty.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const recommendedFocus =
    goal === "lose_weight" || goal === "gain_muscle"
      ? "weight"
      : "eating";

  const recommended =
    filtered.find((item) => item.focus === recommendedFocus) ??
    filtered[0];

  const otherExperts = filtered.filter(
    (item) => item.id !== recommended?.id
  );

  function hasSlots(id: string) {
    return slots.some(
      (slot) => slot.nutritionist_id === id
    );
  }

  return (
    <SafeAreaView
      style={cst.screen}
      edges={["top", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={cst.content}
      >
        {/* HEADER */}
        <View style={cst.header}>
          <Pressable
            style={cst.backCircle}
            onPress={() => router.replace("/dashboard")}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={cg.green}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={cst.headerTitle}>
              Temukan Ahli Gizi
            </Text>

            <Text style={cst.headerSubtitle}>
              Pilih yang sesuai untukmu
            </Text>
          </View>
        </View>

        {/* PENCARIAN */}
        <View style={cst.searchBar}>
          <Ionicons
            name="search-outline"
            size={25}
            color={cg.green}
          />

          <TextInput
            style={cst.searchInput}
            placeholder="Cari ahli gizi..."
            placeholderTextColor="#98A49D"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={cst.filters}
        >
          {filters.map((item) => {
            const active = item.value === filter;

            return (
              <Pressable
                key={item.value}
                style={[
                  cst.filter,
                  active && cst.filterSelected,
                ]}
                onPress={() => setFilter(item.value)}
              >
                <Text
                  style={[
                    cst.filterText,
                    active && cst.filterTextSelected,
                  ]}
                >
                  {active ? "✓  " : ""}
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={cg.green}
            style={{ marginTop: 45 }}
          />
        ) : errorMessage ? (
          <Text style={cst.noticeText}>
            {errorMessage}
          </Text>
        ) : filtered.length === 0 ? (
          <View style={cst.notice}>
            <Ionicons
              name="search-outline"
              size={22}
              color={cg.green}
            />
            <Text style={cst.noticeText}>
              Belum ada ahli gizi yang sesuai
              dengan pencarian atau filter ini.
            </Text>
          </View>
        ) : (
          <>
            {/* REKOMENDASI */}
            <View style={cst.headingRow}>
              <Text style={cst.sectionTitle}>
                ✧ Rekomendasi{"\n"}    untukmu
              </Text>

              <View style={cst.miniPill}>
                <Text style={cst.miniPillText}>
                  Berdasarkan target nutrisi
                </Text>
              </View>
            </View>

            {recommended && (
              <NutritionistCard
                expert={recommended}
                recommended
                hasSlots={hasSlots(recommended.id)}
              />
            )}

            {/* DAFTAR LAIN */}
            <View style={cst.headingRow}>
              <Text style={cst.sectionTitle}>
                Daftar Ahli Gizi
              </Text>

              <Text style={{ color: cg.muted, fontSize: 11 }}>
                {otherExperts.length} lainnya
              </Text>
            </View>

            {otherExperts.map((expert) => (
              <NutritionistCard
                key={expert.id}
                expert={expert}
                recommended={false}
                hasSlots={hasSlots(expert.id)}
              />
            ))}
          </>
        )}

        <View style={cst.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={cg.green}
          />

          <Text style={cst.noticeText}>
            Konsultasi menggunakan chat privat
            NutriCare. Profil bertanda Demo belum
            merupakan tenaga profesional terverifikasi.
          </Text>
        </View>
      </ScrollView>

      <ConsultBottomNav />
    </SafeAreaView>
  );
}
