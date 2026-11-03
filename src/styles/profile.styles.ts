
import { StyleSheet } from "react-native";

export const pc = {
  green: "#006B4F",
  darkGreen: "#00543F",
  mint: "#70F1BB",
  text: "#111827",
  muted: "#65736E",
  border: "#E9EEE9",
  background: "#FAF8FF",
  white: "#FFFFFF",
};

export const ps = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: pc.background,
  },
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingBottom: 30,
  },
  header: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: pc.text,
  },

  // KARTU PROFIL ATAS
  hero: {
    borderRadius: 34,
    padding: 25,
    alignItems: "center",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#D5F4E7",
    overflow: "hidden",
  },
  avatarOutline: {
    width: 110,
    height: 110,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: "#16A579",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 48,
    backgroundColor: "#D7F7E8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 39,
    color: pc.green,
    fontWeight: "800",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 31,
    height: 31,
    borderRadius: 18,
    backgroundColor: pc.green,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "800",
    color: pc.text,
    textAlign: "center",
    marginTop: 18,
  },
  profileEmail: {
    fontSize: 14,
    color: "#52645D",
    textAlign: "center",
    marginTop: 5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#D2E6DD",
    backgroundColor: "#FFFFFFBB",
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 16,
  },
  statusText: {
    color: pc.darkGreen,
    fontSize: 11,
    fontWeight: "700",
  },

  // KARTU UMUM
  card: {
    backgroundColor: pc.white,
    borderRadius: 32,
    padding: 25,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#EDF1ED",
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headingIcon: {
    width: 37,
    height: 37,
    backgroundColor: "#F0F3FF",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headingTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: pc.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EF",
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: "#61716B",
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: pc.text,
    fontWeight: "600",
    flex: 1.3,
    textAlign: "right",
  },

  // DATA KESEHATAN
  healthCard: {
    backgroundColor: "#F0FCF6",
    borderRadius: 32,
    padding: 25,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#A9EDCC",
  },
  healthHeading: {
    color: pc.green,
  },
  currentPill: {
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: "#6DF1B6",
  },
  currentText: {
    fontSize: 10,
    color: "#006245",
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
  },
  metricBox: {
    width: "48%",
    minHeight: 105,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7F0EB",
    justifyContent: "space-between",
  },
  metricLabel: {
    color: "#526B60",
    fontSize: 11,
    marginBottom: 11,
  },
  metricValue: {
    color: pc.text,
    fontSize: 22,
    fontWeight: "800",
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: "500",
  },
  metricSmallValue: {
    fontSize: 12,
    fontWeight: "600",
    color: pc.text,
    lineHeight: 18,
  },
  infoNote: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#DDEAE3",
    paddingTop: 14,
    flexDirection: "row",
    gap: 9,
  },
  noteText: {
    color: "#3F6050",
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },

  // INFORMASI TAMBAHAN
  extraLabel: {
    fontSize: 12,
    color: "#4C5B55",
    marginBottom: 10,
  },
  tag: {
    backgroundColor: "#F3F3FF",
    borderColor: "#E1E4F0",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  tagText: {
    color: "#334B43",
    fontSize: 11,
  },
  extraDivider: {
    height: 1,
    backgroundColor: "#EEF0F1",
    marginVertical: 15,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 20,
    color: pc.text,
  },

  // TOMBOL
  editButton: {
    minHeight: 55,
    backgroundColor: pc.green,
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    elevation: 5,
    marginTop: 5,
  },
  editText: {
    fontSize: 15,
    fontWeight: "800",
    color: pc.white,
  },
  logoutButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 19,
    padding: 10,
  },
  logoutText: {
    color: "#CF2F36",
    fontSize: 13,
  },

  // NAVIGASI BAWAH
  bottomNav: {
    height: 70,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5EDE8",
    flexDirection: "row",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-around",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 30,
  },
  navActive: {
    backgroundColor: "#70F1BB",
  },
  navText: {
    fontSize: 10,
    color: "#233C32",
  },
});
