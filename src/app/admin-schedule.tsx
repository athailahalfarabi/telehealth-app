import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

type Nutritionist = {
  id: string;
  display_name: string | null;
  session_minutes: number | null;
  is_active: boolean | null;
};

type Slot = {
  id: string | number;
  starts_at: string;
  ends_at: string;
  is_booked: boolean | null;
};

const GREEN = "#087A55";
const DARK_GREEN = "#075238";
const MINT = "#B9F7D9";
const BG = "#F8F8FC";
const TEXT = "#172B26";
const MUTED = "#74817D";
const DANGER = "#BD343B";

const DAY_COUNT = 21;
const TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

// ---------- helper waktu (semua dalam WIB / UTC+7) ----------
const WIB_MS = 7 * 60 * 60 * 1000;

function wibKey(date: Date) {
  return new Date(date.getTime() + WIB_MS).toISOString().slice(0, 10);
}
function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function toIso(key: string, time: string) {
  return new Date(`${key}T${time}:00+07:00`).toISOString();
}
function dayChipLabel(key: string) {
  const d = new Date(`${key}T12:00:00+07:00`);
  const wd = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(d);
  const dd = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  }).format(d);
  return { wd, dd };
}
function dayHeading(key: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00+07:00`));
}
function hhmm(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(".", ":");
}
function errText(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

function DayChips({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {days.map((key) => {
        const { wd, dd } = dayChipLabel(key);
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[s.dayChip, active && s.dayChipActive]}
          >
            <Text style={[s.dayWd, active && s.chipTextActive]}>{wd}</Text>
            <Text style={[s.dayDd, active && s.chipTextActive]}>{dd}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function AdminScheduleScreen() {
  const params = useLocalSearchParams<{ nutritionistId?: string }>();
  const [experts, setExperts] = useState<Nutritionist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    typeof params.nutritionistId === "string" ? params.nutritionistId : null,
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const initialUpdate = setTimeout(updateNow, 0);
    const interval = setInterval(updateNow, 15_000);

    return () => {
      clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, []);

  // form tambah
  const days = useMemo(() => {
    const today = wibKey(new Date());
    return Array.from({ length: DAY_COUNT }, (_, i) => addDays(today, i));
  }, []);
  const [addDate, setAddDate] = useState(days[0]);
  const [addTimes, setAddTimes] = useState<string[]>([]);

  // form edit
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [editDate, setEditDate] = useState(days[0]);
  const [editTime, setEditTime] = useState<string | null>(null);

  const selected = experts.find((e) => e.id === selectedId) ?? null;
  const sessionMinutes =
    selected?.session_minutes && selected.session_minutes > 0
      ? selected.session_minutes
      : 60;

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMessage("");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) {
          router.replace("/login");
          return;
        }
        const { data: me, error: meError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", auth.user.id)
          .single();
        if (meError) throw meError;
        if (me?.role !== "admin")
          throw new Error("Halaman ini hanya dapat dibuka oleh Admin.");

        const { data: list, error: listError } = await supabase
          .from("nutritionists")
          .select("id, display_name, session_minutes, is_active")
          .order("display_name", { ascending: true });
        if (listError) throw listError;
        const rows = (list ?? []) as Nutritionist[];
        setExperts(rows);

        const activeId =
          selectedId && rows.some((r) => r.id === selectedId)
            ? selectedId
            : (rows[0]?.id ?? null);
        if (activeId !== selectedId) setSelectedId(activeId);

        if (activeId) {
          const startOfToday = new Date(
            `${wibKey(new Date())}T00:00:00+07:00`,
          ).toISOString();
          const { data: slotRows, error: slotError } = await supabase
            .from("consultation_slots")
            .select("id, starts_at, ends_at, is_booked")
            .eq("nutritionist_id", activeId)
            .gte("starts_at", startOfToday)
            .order("starts_at", { ascending: true });
          if (slotError) throw slotError;
          setSlots((slotRows ?? []) as Slot[]);
        } else {
          setSlots([]);
        }
      } catch (err) {
        setErrorMessage(errText(err, "Gagal memuat jadwal."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = wibKey(new Date(slot.starts_at));
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return Array.from(map.entries());
  }, [slots]);

  const bookedCount = slots.filter((s) => s.is_booked === true).length;

  function isPast(key: string, time: string) {
    return now === null || new Date(toIso(key, time)).getTime() <= now;
  }

  function toggleTime(time: string) {
    setAddTimes((cur) =>
      cur.includes(time) ? cur.filter((t) => t !== time) : [...cur, time],
    );
  }

  async function handleAdd() {
    if (!selected || addTimes.length === 0) return;
    setSaving(true);
    try {
      const starts = [...addTimes].sort().map((t) => toIso(addDate, t));
      const { data, error } = await supabase.rpc("admin_add_slots", {
        p_nutritionist_id: selected.id,
        p_starts: starts,
        p_minutes: sessionMinutes,
      });
      if (error) throw error;
      const inserted = Number(
        (data as { inserted?: number } | null)?.inserted ?? 0,
      );
      const skipped = Number(
        (data as { skipped?: number } | null)?.skipped ?? 0,
      );
      setAddTimes([]);
      Alert.alert(
        inserted > 0 ? "Slot ditambahkan" : "Tidak ada slot baru",
        `${inserted} slot ditambahkan${skipped > 0 ? `, ${skipped} dilewati (bentrok atau sudah lewat)` : ""}.`,
      );
      await load();
    } catch (err) {
      Alert.alert("Gagal menambah slot", errText(err, "Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(slot: Slot) {
    setEditSlot(slot);
    setEditDate(wibKey(new Date(slot.starts_at)));
    setEditTime(hhmm(slot.starts_at));
  }

  async function handleEditSave() {
    if (!editSlot || !editTime) return;
    setSaving(true);
    try {
      const startsAt = toIso(editDate, editTime);
      const endsAt = new Date(
        new Date(startsAt).getTime() + sessionMinutes * 60000,
      ).toISOString();
      const { error } = await supabase.rpc("admin_update_slot", {
        p_slot_id: String(editSlot.id),
        p_starts_at: startsAt,
        p_ends_at: endsAt,
      });
      if (error) throw error;
      setEditSlot(null);
      await load();
    } catch (err) {
      Alert.alert("Gagal mengubah slot", errText(err, "Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(slot: Slot) {
    Alert.alert(
      "Hapus slot?",
      `${dayHeading(wibKey(new Date(slot.starts_at)))}\n${hhmm(slot.starts_at)} - ${hhmm(slot.ends_at)}`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc("admin_delete_slot", {
                p_slot_id: String(slot.id),
              });
              if (error) throw error;
              await load();
            } catch (err) {
              Alert.alert("Gagal menghapus slot", errText(err, "Coba lagi."));
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <Pressable
          style={s.headerBack}
          onPress={() => router.replace("/admin-dashboard")}
          accessibilityLabel="Kembali"
        >
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kelola Jadwal</Text>
          <Text style={s.headerSubtitle}>Atur slot konsultasi ahli gizi</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={s.helper}>Memuat jadwal...</Text>
        </View>
      ) : errorMessage ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={34} color={DANGER} />
          <Text style={s.helper}>{errorMessage}</Text>
          <Pressable style={s.retry} onPress={() => void load()}>
            <Text style={s.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        >
          {experts.length === 0 ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Belum ada ahli gizi</Text>
              <Text style={s.helper}>
                Tambahkan ahli gizi dulu dari menu Ahli Gizi.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.label}>Ahli gizi</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
              >
                {experts.map((e) => {
                  const active = e.id === selectedId;
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => {
                        setSelectedId(e.id);
                        setAddTimes([]);
                      }}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text
                        style={[s.chipText, active && s.chipTextActive]}
                        numberOfLines={1}
                      >
                        {e.display_name || "Tanpa nama"}
                        {e.is_active === false ? " (nonaktif)" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* TAMBAH SLOT */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Tambah slot</Text>
                <Text style={s.helper}>
                  Durasi per sesi: {sessionMinutes} menit. Pilih tanggal dan
                  satu atau lebih jam mulai.
                </Text>
                <Text style={s.label}>Tanggal</Text>
                <DayChips
                  days={days}
                  value={addDate}
                  onChange={(k) => {
                    setAddDate(k);
                    setAddTimes([]);
                  }}
                />
                <Text style={s.label}>Jam mulai (WIB)</Text>
                <View style={s.timeGrid}>
                  {TIMES.map((t) => {
                    const disabled = isPast(addDate, t);
                    const active = addTimes.includes(t);
                    return (
                      <Pressable
                        key={t}
                        disabled={disabled}
                        onPress={() => toggleTime(t)}
                        style={[
                          s.timeChip,
                          active && s.chipActive,
                          disabled && { opacity: 0.35 },
                        ]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={[
                    s.primary,
                    (addTimes.length === 0 || saving) && { opacity: 0.5 },
                  ]}
                  disabled={addTimes.length === 0 || saving}
                  onPress={() => void handleAdd()}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={s.primaryText}>
                        {addTimes.length > 0
                          ? `Tambah ${addTimes.length} slot`
                          : "Pilih jam dulu"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* DAFTAR SLOT */}
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>Slot mendatang</Text>
                <Text style={s.helper}>
                  {slots.length} slot • {bookedCount} terbooking
                </Text>
              </View>

              {grouped.length === 0 ? (
                <View style={s.card}>
                  <Text style={s.helper}>
                    Belum ada slot untuk{" "}
                    {selected?.display_name || "ahli gizi ini"}.
                  </Text>
                </View>
              ) : (
                grouped.map(([key, daySlots]) => (
                  <View key={key} style={s.card}>
                    <Text style={s.dayTitle}>{dayHeading(key)}</Text>
                    {daySlots.map((slot) => {
                      const booked = slot.is_booked === true;
                      return (
                        <View key={String(slot.id)} style={s.slotRow}>
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color={booked ? MUTED : GREEN}
                          />
                          <Text style={s.slotTime}>
                            {hhmm(slot.starts_at)} - {hhmm(slot.ends_at)}
                          </Text>
                          <View
                            style={[
                              s.badge,
                              booked ? s.badgeBooked : s.badgeFree,
                            ]}
                          >
                            <Text
                              style={[
                                s.badgeText,
                                { color: booked ? "#8B6B29" : DARK_GREEN },
                              ]}
                            >
                              {booked ? "Terbooking" : "Tersedia"}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <Pressable
                            disabled={booked}
                            onPress={() => openEdit(slot)}
                            style={[s.iconBtn, booked && { opacity: 0.3 }]}
                            accessibilityLabel="Edit slot"
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={17}
                              color={DARK_GREEN}
                            />
                          </Pressable>
                          <Pressable
                            disabled={booked}
                            onPress={() => confirmDelete(slot)}
                            style={[
                              s.iconBtn,
                              { backgroundColor: "#FBE8E6" },
                              booked && { opacity: 0.3 },
                            ]}
                            accessibilityLabel="Hapus slot"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color={DANGER}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* MODAL EDIT */}
      <Modal
        visible={editSlot !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditSlot(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <Text style={s.cardTitle}>Edit slot</Text>
            <Text style={s.helper}>
              Durasi tetap {sessionMinutes} menit. Pilih tanggal dan jam mulai
              baru.
            </Text>
            <Text style={s.label}>Tanggal</Text>
            <DayChips
              days={days}
              value={editDate}
              onChange={(k) => {
                setEditDate(k);
                setEditTime(null);
              }}
            />
            <Text style={s.label}>Jam mulai (WIB)</Text>
            <View style={s.timeGrid}>
              {TIMES.map((t) => {
                const disabled = isPast(editDate, t);
                const active = editTime === t;
                return (
                  <Pressable
                    key={t}
                    disabled={disabled}
                    onPress={() => setEditTime(t)}
                    style={[
                      s.timeChip,
                      active && s.chipActive,
                      disabled && { opacity: 0.35 },
                    ]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Pressable
                style={[s.secondary, { flex: 1 }]}
                onPress={() => setEditSlot(null)}
              >
                <Text style={s.secondaryText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[
                  s.primary,
                  { flex: 1, marginTop: 0 },
                  (!editTime || saving) && { opacity: 0.5 },
                ]}
                disabled={!editTime || saving}
                onPress={() => void handleEditSave()}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.primaryText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* NAVIGASI BAWAH ADMIN */}
      <View style={s.bottomNav}>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-dashboard")}
        >
          <Ionicons name="home-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Beranda</Text>
        </Pressable>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-nutritionists")}
        >
          <Ionicons name="people-outline" size={23} color={MUTED} />
          <Text style={s.navText}>Ahli Gizi</Text>
        </Pressable>
        <Pressable style={s.navItem} onPress={() => {}}>
          <View style={s.navActiveIcon}>
            <Ionicons name="calendar" size={22} color={DARK_GREEN} />
          </View>
          <Text style={s.navActiveText}>Jadwal</Text>
        </Pressable>
        <Pressable
          style={s.navItem}
          onPress={() => router.replace("/admin-profile")}
        >
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
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDEB",
  },
  headerBack: { width: 36, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  headerSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },
  content: { padding: 16, paddingBottom: 28 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  helper: { color: MUTED, fontSize: 12, lineHeight: 18 },
  retry: {
    backgroundColor: GREEN,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DCEFE7",
    padding: 15,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: TEXT, marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#DCE7E2",
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 12, fontWeight: "700", color: "#53645E" },
  chipTextActive: { color: "#FFFFFF" },
  dayChip: {
    width: 62,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE7E2",
    backgroundColor: "#FFFFFF",
  },
  dayChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  dayWd: { fontSize: 11, fontWeight: "600", color: MUTED },
  dayDd: { fontSize: 12, fontWeight: "800", color: TEXT, marginTop: 2 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: {
    borderWidth: 1,
    borderColor: "#DCE7E2",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 64,
    alignItems: "center",
  },
  primary: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 24,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondary: {
    borderRadius: 24,
    height: 46,
    borderWidth: 1,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: DARK_GREEN, fontSize: 13, fontWeight: "800" },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  dayTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: DARK_GREEN,
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F1",
  },
  slotTime: { fontSize: 13, fontWeight: "700", color: TEXT },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  badgeFree: { backgroundColor: "#CBF7E1" },
  badgeBooked: { backgroundColor: "#FFF1D7" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E9ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
  },
  bottomNav: {
    flexDirection: "row",
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#E8ECE8",
    paddingHorizontal: 15,
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  navActiveIcon: {
    width: 64,
    height: 35,
    borderRadius: 22,
    backgroundColor: MINT,
    justifyContent: "center",
    alignItems: "center",
  },
  navText: { fontSize: 11, fontWeight: "600", color: MUTED },
  navActiveText: { fontSize: 11, fontWeight: "800", color: DARK_GREEN },
});
