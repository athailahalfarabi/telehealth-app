
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { payColor, payStyle } from "../styles/payment.styles";

export default function PaymentHeader({
  title,
}: {
  title: string;
}) {
  return (
    <View style={payStyle.header}>
      <Pressable
        style={payStyle.headerButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={23}
          color={payColor.green}
        />
      </Pressable>

      <Text
        style={payStyle.headerTitle}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>

      <Pressable
        style={payStyle.headerButton}
        onPress={() =>
          Alert.alert(
            "Pembayaran Simulasi",
            "Tidak ada transaksi uang nyata. " +
            "QR dan metode bank hanya untuk demonstrasi NutriCare AI."
          )
        }
      >
        <Ionicons
          name="help-circle-outline"
          size={24}
          color="#33483E"
        />
      </Pressable>
    </View>
  );
}
