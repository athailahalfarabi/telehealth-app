import type { ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { supabase } from "../../supabase";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

type IconName = ComponentProps<typeof Ionicons>["name"];

type Practitioner = {
  id: string;
  display_name: string;
  specialty: string;
  photo_key: string | null;
  photo_storage_path?: string | null;
  education_formal?: string | null;
  license_number?: string | null;
  experience_years?: number | null;
  is_verified?: boolean;
  is_demo: boolean;
};

type Props = {
  expert: Practitioner;
  email?: string | null;
  upcomingCount: number;
  completedCount: number;
  nextSessionStartsAt?: number | null;
  onOpenSchedule: () => void;
  onLogout: () => void;
  // Isi dari data yang sudah diverifikasi jika tersedia nanti.
  education?: string | null;
  licenseNumber?: string | null;
  experience?: string | null;
};

const GREEN = "#087A55";
const DARK = "#174A3A";
const MUTED = "#778C81";
const BORDER = "#E3EEE8";

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} color={GREEN} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricLabelRow}>
        <Ionicons name={icon} color={GREEN} size={13} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function wibDate(timestamp?: number | null) {
  if (!timestamp) return "Belum ada";
  return new Date(timestamp).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " WIB";
}

export default function NutritionistProfilePanel({
  expert,
  email,
  upcomingCount,
  completedCount,
  nextSessionStartsAt,
  onOpenSchedule,
  onLogout,
  education,
  licenseNumber,
  experience,
}: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const storagePath = expert.photo_storage_path?.trim();
  const photo = storagePath
    ? {
        uri: supabase.storage
          .from("nutritionist-photos")
          .getPublicUrl(storagePath).data.publicUrl,
      }
    : expert.photo_key === "male"
      ? require("../../assets/images/dokterL.png")
      : expert.photo_key === "female"
        ? require("../../assets/images/dokterP.png")
        : null;
  const verified = expert.is_verified === true && !expert.is_demo;
  const visibleEducation = education ?? expert.education_formal;
  const visibleLicense = licenseNumber ?? expert.license_number;
  const visibleExperience = experience ?? (
    expert.experience_years == null ? null : `${expert.experience_years} tahun`
  );

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.kicker}>AKUN PRAKTISI</Text>
          <Text style={styles.pageTitle}>Profil Praktisi</Text>
        </View>
        <View style={styles.titleIcon}>
          <Ionicons name="person-circle-outline" color={GREEN} size={28} />
        </View>
      </View>

      <LinearGradient
        colors={["#E0F6EA", "#F8FFF9", "#FFFFFF"]}
        style={styles.heroCard}
      >
        <View style={styles.avatarOuter}>
          {photo && !photoFailed ? (
            <Image
              source={photo}
              style={styles.avatar}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <Ionicons name="person-outline" size={48} color={GREEN} />
          )}
          <View style={styles.cameraDot}>
            <Ionicons name="camera" size={13} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.name}>{expert.display_name}</Text>
        <Text style={styles.specialty}>{expert.specialty}</Text>
        <View style={styles.demoBadge}>
          <Ionicons
            name={verified ? "checkmark-circle" : "information-circle"}
            size={14}
            color={GREEN}
          />
          <Text style={styles.demoText}>
            {verified
              ? "Kredensial telah diverifikasi"
                : expert.is_demo
                  ? "Profil demo · identitas belum diverifikasi"
                  : "Kredensial belum diverifikasi"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.headingIcon}>
            <Ionicons name="school-outline" size={18} color={GREEN} />
          </View>
          <Text style={styles.sectionTitle}>Pendidikan & Lisensi</Text>
        </View>
        <View style={styles.line} />
        <DetailRow
          icon="school-outline"
          label="Pendidikan formal"
          value={visibleEducation?.trim() || "Belum dicantumkan"}
        />
        <DetailRow
          icon="shield-checkmark-outline"
          label="Nomor STR / lisensi"
          value={visibleLicense?.trim() || "Belum dicantumkan"}
        />
        <DetailRow
          icon="briefcase-outline"
          label="Pengalaman praktik"
          value={visibleExperience?.trim() || "Belum dicantumkan"}
        />
        {!verified && (
          <View style={styles.infoLine}>
            <Ionicons name="information-circle-outline" color="#9D6B20" size={15} />
            <Text style={styles.infoText}>
              {expert.is_demo
                ? "Data pendidikan dan lisensi pada profil demo adalah simulasi dan belum diverifikasi."
                : "Informasi pendidikan dan lisensi belum diverifikasi secara resmi."}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, styles.scheduleSection]}>
        <View style={styles.sectionHeading}>
          <View style={styles.headingIcon}>
            <Ionicons name="calendar-outline" size={18} color={GREEN} />
          </View>
          <Text style={styles.sectionTitle}>Jadwal Praktik</Text>
          <View style={styles.smallTag}>
            <Text style={styles.smallTagText}>Dari booking</Text>
          </View>
        </View>
        <View style={styles.metricsGrid}>
          <Metric icon="calendar-outline" label="Sesi mendatang" value={`${upcomingCount} sesi`} />
          <Metric icon="checkmark-circle-outline" label="Sesi selesai" value={`${completedCount} sesi`} />
          <Metric icon="time-outline" label="Sesi terdekat" value={wibDate(nextSessionStartsAt)} />
          <Metric icon="chatbubble-ellipses-outline" label="Layanan" value="Chat Online" />
        </View>
        <Text style={styles.scheduleNote}>
          Jadwal di atas mengikuti booking pada akun ahli gizi ini, bukan jam praktik tetap.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.headingIcon}>
            <Ionicons name="id-card-outline" size={18} color={GREEN} />
          </View>
          <Text style={styles.sectionTitle}>Informasi Akun</Text>
        </View>
        <View style={styles.line} />
        <DetailRow icon="mail-outline" label="Email terdaftar" value={email || "Email tidak tersedia"} />
        <DetailRow icon="finger-print-outline" label="ID internal praktisi" value={`${expert.id.slice(0, 8)}…`} />
      </View>

      <Pressable style={styles.scheduleButton} onPress={onOpenSchedule} accessibilityRole="button">
        <Ionicons name="calendar-outline" color={GREEN} size={19} />
        <Text style={styles.scheduleButtonText}>Lihat Jadwal Praktik</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={onLogout} accessibilityRole="button">
        <Ionicons name="log-out-outline" color="#BC3438" size={19} />
        <Text style={styles.logoutButtonText}>Keluar dari Akun</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 28, gap: 15 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1 },
  kicker: { fontSize: 10, color: GREEN, fontWeight: "800", letterSpacing: 1 },
  pageTitle: { fontSize: 23, fontWeight: "800", color: DARK, marginTop: 5 },
  titleIcon: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#DCF7E8" },
  heroCard: { borderRadius: 24, borderWidth: 1, borderColor: "#CDECDC", padding: 20, alignItems: "center", overflow: "hidden" },
  avatarOuter: { width: 114, height: 114, borderRadius: 57, backgroundColor: "#D8F5E5", borderWidth: 3, borderColor: "#6CDCB0", justifyContent: "center", alignItems: "center", marginTop: 4 },
  avatar: { width: 105, height: 105, borderRadius: 53 },
  cameraDot: { position: "absolute", right: 0, bottom: 3, width: 29, height: 29, borderRadius: 15, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  name: { fontSize: 18, fontWeight: "800", color: DARK, textAlign: "center", marginTop: 15 },
  specialty: { fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 18, marginTop: 5 },
  demoBadge: { flexDirection: "row", gap: 5, alignItems: "center", borderRadius: 18, backgroundColor: "#D8F8E7", marginTop: 13, paddingVertical: 7, paddingHorizontal: 12 },
  demoText: { color: GREEN, fontSize: 10, fontWeight: "700", textAlign: "center" },
  sectionCard: { backgroundColor: "#FFFFFF", borderColor: BORDER, borderWidth: 1, borderRadius: 21, padding: 16, gap: 13 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  headingIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: "#E7F8EF", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: DARK, fontSize: 14, fontWeight: "800", flex: 1 },
  line: { height: 1, backgroundColor: "#EAF1ED" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  detailIcon: { width: 26, height: 26, backgroundColor: "#F4FBF7", alignItems: "center", justifyContent: "center", borderRadius: 8 },
  detailLabel: { fontSize: 10, fontWeight: "600", color: MUTED },
  detailValue: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: DARK, marginTop: 3 },
  infoLine: { backgroundColor: "#FFF8E8", padding: 10, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" },
  infoText: { fontSize: 10, lineHeight: 16, color: "#916927", flex: 1 },
  scheduleSection: { backgroundColor: "#F0FFF7", borderColor: "#C7ECD8" },
  smallTag: { backgroundColor: "#D9F7E5", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  smallTagText: { color: GREEN, fontSize: 9, fontWeight: "800" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9 },
  metric: { width: "48%", minHeight: 85, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6F3EB", borderRadius: 13, padding: 10, gap: 7 },
  metricLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metricLabel: { fontSize: 10, color: MUTED, flex: 1 },
  metricValue: { fontSize: 12, fontWeight: "800", color: DARK, lineHeight: 17 },
  scheduleNote: { fontSize: 10, color: MUTED, lineHeight: 16 },
  scheduleButton: { minHeight: 47, borderRadius: 23, borderColor: GREEN, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#FFFFFF" },
  scheduleButtonText: { color: GREEN, fontSize: 13, fontWeight: "800" },
  logoutButton: { minHeight: 47, borderRadius: 23, backgroundColor: "#FFE2E0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  logoutButtonText: { color: "#BC3438", fontSize: 13, fontWeight: "800" },
});
