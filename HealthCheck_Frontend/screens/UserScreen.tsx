import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.4:5000";

interface User {
  _id: { $oid: string } | string;
  name: string;
  gender: string;
  email: string;
  age: number;
  bodyStatsHistory?: { date: string; height: number; weight: number; bmi: number }[];
  health_goal?: {
    stepsGoal: number;
    caloriesGoal: number;
    workoutGoal: number;
    waterGoal: number;
    sleepGoal: number;
  };
}

export default function UserScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // === NGÀY HIỆN TẠI – GIỐNG HOMESCREEN ===
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);

        const userData = await AsyncStorage.getItem("user");
        if (!userData) {
          Alert.alert("Thông báo", "Chưa đăng nhập");
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(userData);
        const userId = parsed?.id;

        if (!userId) {
          Alert.alert("Lỗi", "Không tìm thấy ID người dùng");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/users/${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const result = await res.json();
        if (result && result._id) {
          setUser(result);
        } else {
          Alert.alert("Lỗi", "Dữ liệu không hợp lệ");
        }
      } catch (err: any) {
        Alert.alert("Lỗi", err.message || "Kết nối thất bại");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // === ĐĂNG XUẤT ===
  const handleLogout = async () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc muốn đăng xuất?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("user");
            navigation.replace("Login");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
          Không có dữ liệu người dùng
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER – GIỐNG HỆT HOMESCREEN */}
      <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require("../assets/logoxoanen1.png")} style={styles.logo} />
          <Text style={styles.appName}>KayTi</Text>
        </View>
        <Text style={styles.date}>{today}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AVATAR & NAME */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={50} color="#2563eb" />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* THÔNG TIN CƠ BẢN */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thông Tin Cá Nhân</Text>

          <View style={styles.infoRow}>
            <Ionicons name="male-female" size={20} color="#666" />
            <Text style={styles.label}>Giới tính</Text>
            <Text style={styles.value}>{user.gender}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.label}>Tuổi</Text>
            <Text style={styles.value}>{user.age} tuổi</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
        </View>

        {/* MỤC TIÊU SỨC KHỎE */}
        {user.health_goal && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Mục Tiêu Hàng Ngày</Text>

            <View style={styles.goalRow}>
              <Ionicons name="walk" size={20} color="#c084fc" />
              <Text style={styles.goalLabel}>Bước chân</Text>
              <Text style={styles.goalValue}>
                {user.health_goal.stepsGoal.toLocaleString()}
              </Text>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="flame" size={20} color="#f87171" />
              <Text style={styles.goalLabel}>Calo</Text>
              <Text style={styles.goalValue}>
                {user.health_goal.caloriesGoal.toLocaleString()} kcal
              </Text>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="barbell" size={20} color="#f97316" />
              <Text style={styles.goalLabel}>Tập luyện</Text>
              <Text style={styles.goalValue}>
                {user.health_goal.workoutGoal} phút
              </Text>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="water" size={20} color="#38bdf8" />
              <Text style={styles.goalLabel}>Nước</Text>
              <Text style={styles.goalValue}>
                {(user.health_goal.waterGoal / 1000).toFixed(1)} L
              </Text>
            </View>

            <View style={styles.goalRow}>
              <Ionicons name="moon" size={20} color="#8b5cf6" />
              <Text style={styles.goalLabel}>Ngủ</Text>
              <Text style={styles.goalValue}>
                {Math.floor(user.health_goal.sleepGoal / 60)}h{" "}
                {user.health_goal.sleepGoal % 60}p
              </Text>
            </View>
          </View>
        )}

        {/* LỊCH SỬ BMI */}
        {user.bodyStatsHistory && user.bodyStatsHistory.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Lịch Sử BMI (Gần nhất)</Text>
            {user.bodyStatsHistory.slice(-3).reverse().map((stat, idx) => (
              <View key={idx} style={styles.bmiRow}>
                <Text style={styles.bmiDate}>
                  {new Date(stat.date).toLocaleDateString("vi-VN")}
                </Text>
                <Text style={styles.bmiValue}>
                  Cân nặng: {stat.weight}kg • BMI: {stat.bmi.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* NÚT ĐĂNG XUẤT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

// ====== STYLES – COPY 100% TỪ HOMESCREEN ======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 130 },

  // HEADER – Y CHANG HOMESCREEN
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  logo: { width: 35, height: 35, marginRight: 8 },
  appName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  date: { color: "#e0f2fe", marginTop: 10, fontSize: 15 },

  // PROFILE – GIỐNG HOME
  profileSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
    marginTop: 12,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },

  // CARD – GIỐNG HOME
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },

  // INFO ROW
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  label: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#444",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  // GOAL ROW
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#444",
  },
  goalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  // BMI HISTORY
  bmiRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
  },
  bmiDate: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
  bmiValue: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },

  // LOGOUT BUTTON
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    elevation: 3,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
});