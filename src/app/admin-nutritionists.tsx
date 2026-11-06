import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

type NutritionistRow = {
  id: string;
  display_name: string | null;
  specialty: string | null;
  bio: string | null;
  photo_key: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  is_demo: boolean | null;
  account_id: string | null;
  created_at: string | null;
};

type Filter = "all" | "active" | "inactive";

const GREEN = "#087A55";
const DARK_GREEN = "#075238";
const MINT = "#B9F7D9";
const BG = "#F8F8FC";
const TEXT = "#172B26";
const MUTED = "#74817D";

function displayName(name: string | null) {
  return name?.trim() || "Nama ahli gizi belum diisi";
}

function getInitials(name: string | null) {
  const clean = displayName(name).replace(/^dr\.?\s*/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AG";
}

export default function AdminNutritionistsScreen() {
  const [items, setItems] = useState<NutritionistRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNutritionists = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");

    try {
      // Pemeriksaan role di layar hanyalah pengaman tambahan.
      // Akses database tetap harus dikontrol oleh RLS Supabase.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Sesi habis. Silakan login kembali.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.role !== "admin") {
        throw new Error("Halaman ini hanya dapat dibuka oleh Admin.");
      }

      const { data, error } = await supabase
        .from("nutritionists")
        .select(
          "id, display_name, specialty, bio, photo_key, is_active, is_verified, is_demo, account_id, created_at"
        )
        .order("display_name", { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as NutritionistRow[]);
    } catch (err) {
      console.error("Gagal memuat ahli gizi Admin:", err);
      const message =
        err !== null && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Gagal memuat daftar ahli gizi.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Daftar otomatis diperbarui saat halaman kembali dibuka.
  useFocusEffect(
    useCallback(() => {
      void loadNutritionists();
    }, [loadNutritionists])
  );

  const countActive = items.filter((item) => item.is_active === true).length;
  const countInactive = items.length - countActive;

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      const active = item.is_active === true;
      if (filter === "active" && !active) return false;
      if (filter === "inactive" && active) return false;
      if (!keyword) return true;
      return (
        displayName(item.display_name).toLowerCase().includes(keyword) ||
        (item.specialty ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [items, filter, search]);

  // Form Tambah, Detail, dan Edit akan dibuat pada tahap berikutnya.
  // Sementara pakai pemberitahuan, supaya tidak membuka route yang belum tersedia.
  const comingNext = (title: string) => {
    Alert.alert(
      title,
      "Halaman ini akan kita buat setelah halaman Kelola Ahli Gizi selesai diuji."
    );
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      {/* HEADER */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Dashboard Admin"
          onPress={() => router.replace("/admin-dashboard")}
          style={s.headerBack}
        >
          <Ionicons name="arrow-back" size={23} color={DARK_GREEN} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kelola Ahli Gizi</Text>
          <Text style={s.headerSubtitle}>
            {loading ? "Memuat praktisi..." : `${items.length} praktisi terdaftar`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka Notifikasi Admin"
          onPress={() => router.push("/admin-notifications")}
          style={s.iconButton}
        >
          <Ionicons name="notifications-outline" size={21} color={TEXT} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNutritionists(true)}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {/* PENCARIAN */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={20} color={MUTED} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama ahli gizi..."
            placeholderTextColor="#9AA5A1"
            style={s.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} accessibilityLabel="Hapus pencarian">
              <Ionicons name="close-circle" size={19} color={MUTED} />
            </Pressable>
          )}
        </View>

        {/* FILTER */}
        <View style={s.filters}>
          {(
            [
              { id: "all", label: `Semua (${items.length})` },
              { id: "active", label: `Aktif (${countActive})` },
              { id: "inactive", label: `Nonaktif (${countInactive})` },
            ] as { id: Filter; label: string }[]
          ).map((choice) => {
            const selected = filter === choice.id;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                onPress={() => setFilter(choice.id)}
                style={[s.filterChip, selected && s.filterChipActive]}
              >
                {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                <Text style={[s.filterText, selected && s.filterTextActive]}>
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* JUDUL DAFTAR + TOMBOL TAMBAH */}
        <View style={s.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>
              {filter === "active"
                ? "Praktisi Aktif"
                : filter === "inactive"
                ? "Praktisi Nonaktif"
                : "Daftar Praktisi"}
            </Text>
            <Text style={s.sectionSubtitle}>
              {visibleItems.length} hasil ditampilkan
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/admin-nutritionist-create")}
            style={s.addButton}
          >
            <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
            <Text style={s.addButtonText}>Tambah Ahli Gizi</Text>
          </Pressable>
        </View>

        {/* STATUS ERROR / LOADING / KOSONG */}
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={s.helperText}>Mengambil data ahli gizi dari Supabase...</Text>
          </View>
        ) : errorMessage ? (
          <View style={s.centerBox}>
            <Ionicons name="alert-circle-outline" size={35} color="#BB6B39" />
            <Text style={s.emptyTitle}>Gagal memuat daftar ahli gizi</Text>
            <Text style={s.helperText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadNutritionists()} style={s.retryButton}>
              <Text style={s.retryText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={s.centerBox}>
            <Ionicons name="people-outline" size={36} color={GREEN} />
            <Text style={s.emptyTitle}>Ahli gizi tidak ditemukan</Text>
            <Text style={s.helperText}>
              {search.trim()
                ? "Coba kata kunci lain atau ubah filter."
                : "Belum ada ahli gizi pada kategori ini."}
            </Text>
          </View>
        ) : (
          visibleItems.map((item) => {
            const active = item.is_active === true;
            return (
              <View key={item.id} style={[s.card, !active && s.cardInactive]}>
                <View style={s.cardTop}>
                  {/* Avatar inisial: aman tanpa menebak path foto lokal */}
                  <View style={[s.avatar, !active && s.avatarInactive]}>
                    <Text style={s.avatarText}>{getInitials(item.display_name)}</Text>
                  </View>

                  <View style={s.cardInfo}>
                    <Text style={[s.expertName, !active && s.inactiveText]} numberOfLines={2}>
                      {displayName(item.display_name)}
                    </Text>
                    <Text style={s.expertSpecialty} numberOfLines={2}>
                      {item.specialty?.trim() || "Bidang keahlian belum dicantumkan"}
                    </Text>
                    <Text style={s.expertMeta}>
                      {item.account_id ? "Akun login terhubung" : "Akun login belum terhubung"}
                    </Text>
                  </View>
                </View>

                <View style={s.badges}>
                  <View style={[s.badge, active ? s.badgeActive : s.badgeInactive]}>
                    <View style={[s.dot, { backgroundColor: active ? GREEN : "#838B9A" }]} />
                    <Text style={[s.badgeText, { color: active ? DARK_GREEN : "#596476" }]}>
                      {active ? "Akun Aktif" : "Akun Nonaktif"}
                    </Text>
                  </View>
                  <View style={[s.badge, item.is_verified ? s.badgeVerified : s.badgePending]}>
                    <Ionicons
                      name={item.is_verified ? "shield-checkmark-outline" : "time-outline"}
                      size={12}
                      color={item.is_verified ? DARK_GREEN : "#9B671E"}
                    />
                    <Text
                      style={[
                        s.badgeText,
                        { color: item.is_verified ? DARK_GREEN : "#9B671E" },
                      ]}
                    >
                      {item.is_verified ? "Terverifikasi" : "Belum Terverifikasi"}
                    </Text>
                  </View>
                  {item.is_demo && (
                    <View style={[s.badge, s.badgeDemo]}>
                      <Text style={[s.badgeText, { color: "#6672A0" }]}>Profil Demo</Text>
                    </View>
                  )}
                </View>

                <View style={s.actions}>
                  <Pressable
                    style={s.detailButton}        
onPress={() =>
  router.push({
    pathname: "/admin-nutritionist-detail",
    params: { id: item.id },
  })
}

                  >
                    <Text style={s.detailText}>Lihat Detail</Text>
                    <Ionicons name="chevron-forward" size={16} color={GREEN} />
                  </Pressable>
                  <Pressable
                    style={s.editButton}
onPress={() =>
  router.push({
    pathname: "/admin-nutritionist-edit",
    params: { id: item.id },
  })
}
                    accessibilityLabel={`Edit ${displayName(item.display_name)}`}
                  >
                    <Ionicons name="pencil-outline" size={18} color={DARK_GREEN} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* NAVIGASI BAWAH ADMIN */}
      <View style={s.bottomNav}>
        <Pressable style={s.navItem} onPress={() => router.replace("/admin-dashboard")}>
          <Ionicons name="home-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Beranda</Text>
        </Pressable>
        <Pressable style={s.navItem} onPress={() => {}}>
          <View style={s.navActiveIcon}>
            <Ionicons name="people" size={22} color={DARK_GREEN} />
          </View>
          <Text style={s.navActiveText}>Ahli Gizi</Text>
        </Pressable>
        <Pressable style={s.navItem} onPress={() => router.replace("/admin-schedule")}>
          <Ionicons name="calendar-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Jadwal</Text>
        </Pressable>
        <Pressable style={s.navItem} onPress={() => router.replace("/admin-profile")}>
          <Ionicons name="person-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Profil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    minHeight: 65, flexDirection: "row", alignItems: "center", paddingHorizontal: 18,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#EAEDEB",
  },
  headerBack: { width: 36, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  headerSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  iconButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E5EAE7", borderRadius: 15,
    paddingHorizontal: 14, height: 50,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14, paddingVertical: 8 },
  filters: { flexDirection: "row", gap: 7, marginTop: 13, marginBottom: 22, flexWrap: "wrap" },
  filterChip: {
    borderWidth: 1, borderColor: "#DCE7E2", borderRadius: 50, backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 4,
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 11, fontWeight: "700", color: "#53645E" },
  filterTextActive: { color: "#FFFFFF" },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 12, marginBottom: 13,
  },
  sectionTitle: { fontSize: 14, color: TEXT, fontWeight: "800" },
  sectionSubtitle: { fontSize: 11, color: MUTED, marginTop: 3 },
  addButton: {
    backgroundColor: GREEN, borderRadius: 50, paddingHorizontal: 13, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  centerBox: {
    alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF",
    borderRadius: 22, padding: 27, marginTop: 7, borderWidth: 1, borderColor: "#EDF0ED", gap: 12,
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "800", textAlign: "center" },
  helperText: { color: MUTED, fontSize: 12, textAlign: "center", lineHeight: 19 },
  retryButton: { backgroundColor: GREEN, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1,
    borderColor: "#DCEFE7", padding: 15, marginBottom: 12,
    shadowColor: "#1B4935", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardInactive: { borderColor: "#ECECF0", opacity: 0.83 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#DDF8EA",
    borderWidth: 2, borderColor: "#B0E8CD", alignItems: "center", justifyContent: "center",
  },
  avatarInactive: { backgroundColor: "#E9EAEE", borderColor: "#D9DDE4" },
  avatarText: { color: DARK_GREEN, fontSize: 17, fontWeight: "800" },
  cardInfo: { flex: 1, gap: 3 },
  expertName: { fontSize: 14, fontWeight: "800", color: TEXT },
  inactiveText: { color: "#69736F" },
  expertSpecialty: { color: GREEN, fontSize: 11, fontWeight: "600" },
  expertMeta: { fontSize: 10, color: MUTED },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13, marginBottom: 12 },
  badge: {
    borderRadius: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 9,
    paddingVertical: 5, gap: 4,
  },
  badgeActive: { backgroundColor: "#CBF7E1" },
  badgeInactive: { backgroundColor: "#E7E9F3" },
  badgeVerified: { backgroundColor: "#D7F9E9" },
  badgePending: { backgroundColor: "#FFF1D7" },
  badgeDemo: { backgroundColor: "#ECEFFC" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 9, alignItems: "center" },
  detailButton: {
    flex: 1, height: 37, borderRadius: 20, borderWidth: 1, borderColor: GREEN,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  detailText: { color: DARK_GREEN, fontSize: 11, fontWeight: "800" },
  editButton: {
    width: 37, height: 37, borderRadius: 19, backgroundColor: "#E9ECFF",
    alignItems: "center", justifyContent: "center",
  },
  bottomNav: {
    flexDirection: "row", minHeight: 70, backgroundColor: "#FFFFFF", paddingTop: 7,
    borderTopWidth: 1, borderTopColor: "#E8ECE8", paddingHorizontal: 15,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  navActiveIcon: {
    width: 64, height: 35, borderRadius: 22, backgroundColor: MINT,
    justifyContent: "center", alignItems: "center",
  },
  navText: { fontSize: 11, fontWeight: "600", color: MUTED },
  navActiveText: { fontSize: 11, fontWeight: "800", color: DARK_GREEN },
});
