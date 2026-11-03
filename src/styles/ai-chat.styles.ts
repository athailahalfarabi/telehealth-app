
import { StyleSheet } from "react-native";

export const ac = {
  green: "#006B4F",
  darkGreen: "#00553E",
  mint: "#6FF1BB",
  text: "#111827",
  muted: "#677670",
  white: "#FFFFFF",
  background: "#FAF8FF",
};

export const ais = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ac.background,
  },
  header: {
    height: 65,
    backgroundColor: "#FAF8FF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFF3",
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 34,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 23,
    backgroundColor: "#DCF9ED",
    borderWidth: 2,
    borderColor: "#70EDB8",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "800",
    color: ac.green,
  },
  headerSubtitle: {
    fontSize: 11,
    color: ac.darkGreen,
    marginTop: 2,
  },

  // AREA PESAN
  scrollContent: {
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 22,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },

  // KARTU SAMBUTAN
  welcomeCard: {
    borderWidth: 1,
    borderColor: "#BDF5DD",
    borderRadius: 32,
    padding: 22,
    overflow: "hidden",
    marginBottom: 23,
    elevation: 3,
    shadowColor: "#006B4F",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
  },
  intelligenceBadge: {
    backgroundColor: "#BDF8DE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderRadius: 18,
    marginBottom: 13,
  },
  intelligenceText: {
    color: ac.darkGreen,
    fontSize: 10,
    fontWeight: "700",
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  welcomeTextBox: {
    flex: 1,
  },
  welcomeTitle: {
    color: ac.green,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 7,
  },
  welcomeDescription: {
    color: "#53645F",
    fontSize: 12,
    lineHeight: 19,
  },
  mascotImage: {
    width: 94,
    height: 115,
    borderRadius: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#DDE5E5",
    marginTop: 17,
    marginBottom: 14,
  },
  quickTitle: {
    fontSize: 11,
    color: "#3A4B43",
    marginBottom: 11,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: "#63EFB0",
    backgroundColor: "#FFFFFFE8",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  quickChipText: {
    color: ac.darkGreen,
    fontSize: 11,
    fontWeight: "600",
  },

  // TANGGAL
  dayPill: {
    backgroundColor: "#EFF0FA",
    borderRadius: 17,
    alignSelf: "center",
    paddingHorizontal: 15,
    paddingVertical: 7,
    marginBottom: 22,
  },
  dayText: {
    color: "#53605E",
    fontSize: 10,
  },

  // BUBBLE CHAT
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 9,
  },
  messageAvatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#E0FFF0",
    borderWidth: 1,
    borderColor: "#83EFC0",
    overflow: "hidden",
  },
  messageAvatarImage: {
    width: "100%",
    height: "100%",
  },
  messageGroup: {
    maxWidth: "83%",
    flexShrink: 1,
  },
  assistantBubble: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 19,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E3EAE6",
  },
  userBubble: {
    backgroundColor: ac.green,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 19,
    borderTopRightRadius: 4,
  },
  assistantText: {
    color: "#26332F",
    fontSize: 13,
    lineHeight: 21,
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 21,
  },
  timeText: {
    color: "#78857F",
    fontSize: 10,
    marginTop: 6,
    marginHorizontal: 4,
  },
  typingText: {
    fontSize: 12,
    color: ac.muted,
    marginLeft: 44,
    marginBottom: 16,
  },

  // AREA INPUT
  composerContainer: {
    backgroundColor: ac.background,
    paddingHorizontal: 16,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F3",
  },
  composer: {
    minHeight: 56,
    maxHeight: 115,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE9E2",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    minHeight: 40,
    fontSize: 13,
    color: ac.text,
    paddingVertical: 10,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 41,
    height: 41,
    borderRadius: 23,
    backgroundColor: ac.green,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  disclaimer: {
    color: "#86908B",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 15,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },

  // NAVIGASI BAWAH
  bottomNav: {
    height: 67,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E8ECE9",
    paddingHorizontal: 9,
  },
  navItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    gap: 4,
  },
  navActive: {
    backgroundColor: "#70F2BA",
  },
  navLabel: {
    fontSize: 10,
    color: "#293D33",
  },
});
