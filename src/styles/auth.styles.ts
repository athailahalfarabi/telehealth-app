
import { StyleSheet } from "react-native";

export const colors = {
  primary: "#006B50",
  dark: "#00583F",
  mint: "#DFF8EC",
  text: "#101E36",
  muted: "#596B70",
  placeholder: "#A2B6B5",
  border: "#E5EAE7",
  white: "#FFFFFF",
};

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },

  // WELCOME
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 14,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 45,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D5F8E9",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  languagePill: {
    backgroundColor: "#F1F2FF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  languageText: {
    color: "#8B90B5",
    fontWeight: "700",
    fontSize: 10,
  },
  heroImage: {
    width: "100%",
    borderRadius: 29,
    backgroundColor: "#EAF1EA",
  },
  welcomeBottom: {
    flex: 1,
    justifyContent: "flex-end",
  },
  welcomeTitle: {
    marginTop: 30,
    color: colors.text,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  greenText: {
    color: colors.primary,
  },
  welcomeSubtitle: {
    marginTop: 12,
    fontSize: 13,
    color: "#5D6B6D",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  welcomeButtons: {
    marginTop: 26,
    gap: 12,
  },
  primaryButton: {
    minHeight: 53,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  primaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 49,
    borderRadius: 999,
    backgroundColor: "#F1F2FE",
    borderWidth: 1,
    borderColor: "#E8EAF5",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  welcomeFooter: {
    marginTop: 18,
    fontSize: 9,
    lineHeight: 14,
    color: "#7A8188",
    textAlign: "center",
  },

  // LOGIN & REGISTER
  authContent: {
    flexGrow: 1,
    paddingHorizontal: 34,
    paddingTop: 19,
    paddingBottom: 32,
  },
  authHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  registerBack: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E5ECEB",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerBrandText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  loginIntro: {
    marginTop: 62,
  },
  registerIntro: {
    marginTop: 36,
  },
  authTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.text,
  },
  authSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 19,
    color: colors.muted,
  },
  loginForm: {
    marginTop: 49,
  },
  registerForm: {
    marginTop: 29,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: "#14283A",
    fontWeight: "700",
    marginBottom: 9,
  },
  inputRow: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 2,
  },
  smallLink: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  loginButton: {
    marginTop: 34,
  },
  registerButton: {
    marginTop: 30,
  },
  authFooter: {
    marginTop: 39,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#586A70",
    fontSize: 12,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 3,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#CAD9D2",
    borderRadius: 5,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    color: "#536569",
    fontSize: 11,
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.5,
  },

  // HALAMAN TES LOGIN
  testPage: {
    flex: 1,
    backgroundColor: "#F6FCF9",
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  testCard: {
    padding: 26,
    backgroundColor: colors.white,
    borderRadius: 26,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#E0F1E8",
  },
  testTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 23,
    textAlign: "center",
  },
  testSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
});
