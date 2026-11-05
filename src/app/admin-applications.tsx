
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

const GREEN = "#087A55";
const DARK = "#173C2D";
const MUTED = "#71877B";
const BG = "#F8FAF8";

type Status =
  | "pending"
  | "contacted"
  | "approved"
  | "rejected";

type Application = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  specialty: string;
  status: Status;
  created_at: string;
};

type Filter = "all" | Status;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "contacted", label: "Dihubungi" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

function getStatusLabel(status: Status) {
  switch (status) {
    case "pending":
      return "Menunggu";
    case "contacted":
      return "Sudah Dihubungi";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
  }
}

function getStatusColor(status: Status) {
  switch (status) {
    case "pending":
      return { bg: "#FFF4DB", text: "#95621C" };
    case "contacted":
      return { bg: "#E8F0FE", text: "#3561A8" };
    case "approved":
      return { bg: "#DEF8E9", text: GREEN };
    case "rejected":
      return { bg: "#FDE8E8", text: "#B23B42" };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={GREEN} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  type = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  type?: "primary" | "outline" | "danger";
  disabled?: boolean;
}) {
  const isOutline = type === "outline";
  const isDanger = type === "danger";

  return (
    <Pressable
      style={[
        styles.actionButton,
        isOutline && styles.outlineButton,
        isDanger && styles.dangerButton,
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionText,
          (isOutline || isDanger) && { color: GREEN },
          isDanger && { color: "#B23B42" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function AdminApplicationsScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadApplications = useCallback(async () => {
    setErrorMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Silakan login sebagai Admin.");
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        throw new Error(
          "Halaman ini hanya dapat diakses oleh Admin."
        );
      }

      const { data, error } = await supabase
        .from("nutritionist_applications")
        .select(
          "id, full_name, email, whatsapp, specialty, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setApplications((data ?? []) as Application[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal memuat pengajuan."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadApplications();
    }, [loadApplications])
  );

  async function updateStatus(
    item: Application,
    newStatus: Status
  ) {
    if (busyId) return;

    setBusyId(item.id);

    try {
      const { data, error } = await supabase
        .from("nutritionist_applications")
        .update({ status: newStatus })
        .eq("id", item.id)
        .select("id, status")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Data tidak ditemukan.");

      setApplications((previous) =>
        previous.map((row) =>
          row.id === item.id
            ? { ...row, status: newStatus }
            : row
        )
      );

      Alert.alert(
        "Berhasil",
        `Status pengajuan diubah menjadi ${getStatusLabel(
          newStatus
        )}.`
      );
    } catch (error) {
      Alert.alert(
        "Gagal memperbarui status",
        error instanceof Error
          ? error.message
          : "Silakan coba lagi."
      );
    } finally {
      setBusyId(null);
    }
  }

  function confirmStatus(
    item: Application,
    newStatus: Status
  ) {
    const label = getStatusLabel(newStatus);

    const message =
      newStatus === "approved"
        ? "Pastikan identitas, pendidikan, dan dokumen profesi calon mitra sudah diperiksa secara manual sebelum menyetujui pengajuan. Persetujuan ini tidak otomatis memverifikasi STR atau membuat akun."
        : `Ubah status pengajuan ${item.full_name} menjadi ${label}?`;

    Alert.alert("Konfirmasi Pengajuan", message, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Lanjutkan",
        onPress: () => void updateStatus(item, newStatus),
      },
    ]);
  }

  function refresh() {
    setRefreshing(true);
    void loadApplications();
  }

  const filtered = applications.filter(
    (item) => filter === "all" || item.status === filter
  );

  const pendingCount = applications.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = applications.filter(
    (item) => item.status === "approved"
  ).length;

  return (
    <SafeAreaView
      style={styles.root}
      edges={["top", "bottom"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={GREEN}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Pengajuan Mitra
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={refresh}
        >
          <Ionicons
            name="refresh-outline"
            size={21}
            color={GREEN}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        {/* JUDUL */}
        <Text style={styles.pageTitle}>
          Kelola Pengajuan Mitra
        </Text>

        <Text style={styles.subtitle}>
          Tinjau calon ahli gizi yang ingin bergabung
          dengan NutriCare AI.
        </Text>

        {/* STATISTIK */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={GREEN}
            />
            <Text style={styles.statNumber}>
              {applications.length}
            </Text>
            <Text style={styles.statLabel}>
              Total Pengajuan
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="time-outline"
              size={22}
              color="#B78024"
            />
            <Text style={styles.statNumber}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>
              Menunggu
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={GREEN}
            />
            <Text style={styles.statNumber}>
              {approvedCount}
            </Text>
            <Text style={styles.statLabel}>
              Disetujui
            </Text>
          </View>
        </View>

        {/* FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((option) => {
            const active = filter === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  styles.filterButton,
                  active && styles.filterActive,
                ]}
                onPress={() => setFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* DAFTAR */}
        {loading ? (
          <ActivityIndicator
            color={GREEN}
            size="large"
            style={{ marginTop: 35 }}
          />
        ) : errorMessage ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color="#B23B42"
            />
            <Text style={styles.emptyText}>
              {errorMessage}
            </Text>
            <ActionButton
              title="Coba Lagi"
              onPress={() => void loadApplications()}
            />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="file-tray-outline"
              size={35}
              color={GREEN}
            />
            <Text style={styles.emptyText}>
              Belum ada pengajuan pada kategori ini.
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const badge = getStatusColor(item.status);
            const disabled = busyId !== null;

            return (
              <View
                key={item.id}
                style={styles.applicationCard}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person-outline"
                      color={GREEN}
                      size={24}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {item.full_name}
                    </Text>

                    <Text style={styles.date}>
                      {formatDate(item.created_at)} WIB
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: badge.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: badge.text },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <InfoRow
                  icon="mail-outline"
                  label="Email"
                  value={item.email}
                />

                <InfoRow
                  icon="logo-whatsapp"
                  label="WhatsApp"
                  value={item.whatsapp}
                />

                <InfoRow
                  icon="nutrition-outline"
                  label="Bidang Keahlian"
                  value={item.specialty}
                />

                {/* TINDAKAN ADMIN */}
                {item.status === "pending" && (
                  <View style={styles.buttonRow}>
                    <ActionButton
                      title="Tandai Dihubungi"
                      disabled={disabled}
                      onPress={() =>
                        confirmStatus(item, "contacted")
                      }
                    />
                    <ActionButton
                      title="Tolak"
                      type="danger"
                      disabled={disabled}
                      onPress={() =>
                        confirmStatus(item, "rejected")
                      }
                    />
                  </View>
                )}

                {item.status === "contacted" && (
                  <View style={styles.buttonRow}>
                    <ActionButton
                      title="Setujui"
                      disabled={disabled}
                      onPress={() =>
                        confirmStatus(item, "approved")
                      }
                    />
                    <ActionButton
                      title="Tolak"
                      type="danger"
                      disabled={disabled}
                      onPress={() =>
                        confirmStatus(item, "rejected")
                      }
                    />
                  </View>
                )}

                {item.status === "approved" && (
                  <View style={{ marginTop: 16 }}>
                    <ActionButton
                      title="Lanjut Buat Akun Ahli Gizi"
                      onPress={() =>
                        router.push(
                          "/admin-nutritionist-create"
                        )
                      }
                    />
                    <Text style={styles.cardNote}>
                      Isi akun menggunakan data calon mitra
                      yang sudah diperiksa. Persetujuan belum
                      otomatis membuat akun login.
                    </Text>
                  </View>
                )}

                {item.status === "rejected" && (
                  <Text style={styles.cardNote}>
                    Pengajuan ini telah ditolak.
                  </Text>
                )}
              </View>
            );
          })
        )}

        <View style={styles.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={GREEN}
          />

          <Text style={styles.noticeText}>
            Hanya Admin yang boleh melihat kontak calon
            mitra. Persetujuan pengajuan bukan bukti
            verifikasi izin praktik profesional.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E7EFEA",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "800",
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  pageTitle: {
    color: DARK,
    fontSize: 23,
    fontWeight: "800",
  },

  subtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 22,
  },

  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 22,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E3EEE7",
    gap: 8,
  },

  statNumber: {
    color: DARK,
    fontSize: 23,
    fontWeight: "800",
  },

  statLabel: {
    color: MUTED,
    fontSize: 10,
  },

  filterRow: {
    gap: 8,
    marginBottom: 19,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: "#DDEBE1",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  filterActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  filterText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  applicationCard: {
    backgroundColor: "#FFFFFF",
    padding: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    marginBottom: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    backgroundColor: "#E6F8ED",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 15,
    fontWeight: "800",
    color: DARK,
  },

  date: {
    fontSize: 10,
    color: MUTED,
    marginTop: 5,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 14,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#E9F1EB",
    marginVertical: 16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },

  infoLabel: {
    fontSize: 10,
    color: MUTED,
  },

  infoValue: {
    fontSize: 12,
    color: DARK,
    fontWeight: "700",
    marginTop: 3,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 9,
  },

  actionButton: {
    flex: 1,
    backgroundColor: GREEN,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  outlineButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: GREEN,
  },

  dangerButton: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#F5BBBB",
  },

  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  cardNote: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 11,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
  },

  notice: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: "#EAF8EF",
    padding: 16,
    borderRadius: 18,
    marginTop: 9,
    alignItems: "flex-start",
  },

  noticeText: {
    flex: 1,
    color: "#567B66",
    fontSize: 11,
    lineHeight: 18,
  },
});
