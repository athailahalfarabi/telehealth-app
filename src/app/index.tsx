
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { colors, styles } from "../styles/auth.styles";

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const imageHeight = Math.min(
    350,
    Math.max(240, height * 0.405)
  );

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={[
          "#DCF8E9",
          "#F5FFFA",
          "#FFFFFF",
          "#FFFFFF",
        ]}
        locations={[0, 0.38, 0.75, 1]}
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.page,
          styles.welcomeContent,
          {
            minHeight:
              height - insets.top - insets.bottom,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.welcomeHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="leaf-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <Text style={styles.brandText}>
              NutriCare AI
            </Text>
          </View>

          <View style={styles.languagePill}>
            <Text style={styles.languageText}>
              ID
            </Text>
          </View>
        </View>

        {/* FOTO MAKANAN */}
        <Image
          source={require("../../assets/images/login1.png")}
          style={[
            styles.heroImage,
            {
              height: imageHeight,
              marginTop: 36,
            },
          ]}
          resizeMode="cover"
        />

        {/* JUDUL DAN TOMBOL */}
        <View style={styles.welcomeBottom}>
          <Text style={styles.welcomeTitle}>
            Nutrisi Cerdas,{"\n"}
            <Text style={styles.greenText}>
              Hidup Lebih Sehat
            </Text>
          </Text>

          <Text style={styles.welcomeSubtitle}>
            Konsultasi ahli gizi & panduan pola makan
            {"\n"}personal bertenaga AI.
          </Text>

          <View style={styles.welcomeButtons}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.primaryText}>
                Mulai
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.secondaryText}>
                Masuk
              </Text>
            </Pressable>
          </View>

          <Text style={styles.welcomeFooter}>
            NutriCare AI · Konsultasi gizi online
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
