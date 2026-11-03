
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, styles } from "../styles/auth.styles";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: "mail-outline" | "lock-closed-outline" | "person-outline";
  secure?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoComplete?: TextInputProps["autoComplete"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export default function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secure = false,
  keyboardType = "default",
  autoComplete,
  autoCapitalize = "none",
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputRow}>
        <Ionicons
          name={icon}
          size={17}
          color="#738C89"
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !showPassword}
          selectionColor={colors.primary}
        />

        {secure && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            accessibilityLabel={
              showPassword
                ? "Sembunyikan password"
                : "Tampilkan password"
            }
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={19}
              color="#718B87"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
