import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabase"; // Sesuaikan jalur relatif file supabase.js

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [statusKoneksi, setStatusKoneksi] = useState(
    "Sedang mengecek koneksi...",
  );

  useEffect(() => {
    async function cekKoneksiSupabase() {
      try {
        const { error } = await supabase
          .from("_dummy_table_check")
          .select("*")
          .limit(1);

        if (
          !error ||
          error.code === "PGRST116" ||
          error.message.includes("relation")
        ) {
          setStatusKoneksi("✅ Berhasil tersambung ke Supabase!");
        } else {
          setStatusKoneksi(
            "✅ Terhubung ke Supabase (Pesan: " + error.message + ")",
          );
        }
      } catch (err: any) {
        setStatusKoneksi("❌ Gagal tersambung: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    cekKoneksiSupabase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TeleHealthApp - Test Koneksi</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Text style={styles.status}>{statusKoneksi}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
});
