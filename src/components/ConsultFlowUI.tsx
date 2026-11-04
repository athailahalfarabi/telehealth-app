
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { doctorPhotos } from "../utils/consultation";
import { cf, fs } from "../styles/consult-flow.styles";

export function ConsultHeader({
  title,
  subtitle,
  rightIcon,
  onRightPress,
}: {
  title: string;
  subtitle?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}) {
  return (
    <View style={fs.header}>
      <Pressable
        style={fs.headerButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color={cf.green}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={fs.headerTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text style={fs.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightIcon && onRightPress ? (
        <Pressable
          style={fs.headerButton}
          onPress={onRightPress}
        >
          <Ionicons
            name={rightIcon}
            size={22}
            color={cf.green}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ConsultPhoto({
  photoKey,
  size = 72,
}: {
  photoKey: "female" | "male";
  size?: number;
}) {
  return (
    <Image
      source={doctorPhotos[photoKey]}
      style={[
        fs.photo,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      resizeMode="cover"
    />
  );
}

export function ConsultBottomNav({
  active = "Jadwal",
}: {
  active?: "Jadwal" | "Chat";
}) {
  const tabs = [
    { label: "Beranda", icon: "home-outline" as const },
    { label: "Jadwal", icon: "calendar-outline" as const },
    { label: "Chat", icon: "chatbubble-outline" as const },
    { label: "Profil", icon: "person-outline" as const },
  ];

  return (
    <View style={fs.bottomNav}>
      {tabs.map((tab) => {
        const selected = active === tab.label;

        return (
          <Pressable
            key={tab.label}
            style={[
              fs.navItem,
              selected && fs.navActive,
            ]}
            onPress={() => {
              if (tab.label === "Beranda") {
                router.replace("/dashboard");
              } else if (
                tab.label === "Jadwal" ||
                tab.label === "Chat"
              ) {
                router.replace("/my-schedule");
              } else {
                router.push("/profile");
              }
            }}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={cf.green}
            />

            <Text style={fs.navText}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
