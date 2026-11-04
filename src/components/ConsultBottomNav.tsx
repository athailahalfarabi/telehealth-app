
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { cg, cst } from "../styles/consult.styles";

export default function ConsultBottomNav() {
  const tabs = [
    { label: "Beranda", icon: "home-outline" as const },
    { label: "AI Chat", icon: "chatbubble-outline" as const },
    { label: "Konsultasi", icon: "medkit-outline" as const },
    { label: "Profil", icon: "person-outline" as const },
  ];

  return (
    <View style={cst.bottomNav}>
      {tabs.map((tab) => {
        const active = tab.label === "Konsultasi";

        return (
          <Pressable
            key={tab.label}
            style={[
              cst.navTab,
              active && cst.navActive,
            ]}
            onPress={() => {
              if (tab.label === "Beranda") {
                router.replace("/dashboard");
              } else if (tab.label === "AI Chat") {
                router.push("/ai-chat");
              } else if (tab.label === "Profil") {
                router.push("/profile");
              }
            }}
          >
            <Ionicons
              name={tab.icon}
              size={23}
              color={cg.greenDark}
            />

            <Text style={cst.navLabel}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
