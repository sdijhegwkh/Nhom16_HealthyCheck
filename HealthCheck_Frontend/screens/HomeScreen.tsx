import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.4:5000";

// === TYPE ===
interface HealthData {
  healthScore: number;
  steps: { stepCount: number };
  sleep: { totalSleepHr: number };
  nutrition: { caloriesConsumed: number };
  waterConsumed: number;
  workout: { workDuration: number };
}

interface UserData {
  bodyStatsHistory?: { bmi: number; date: string }[];
}

type OverviewItem = {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<any>;
  iconName: string;
};

type BlogItem = {
  title: string;
  subtitle: string;
  image: any;
};

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [bmi, setBmi] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  // === ANIMATION ===
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // === LẤY DỮ LIỆU TỪ BACKEND ===
 useFocusEffect(
  React.useCallback(() => {
    let isActive = true; // kiểm tra tránh setState khi màn hình unmount

    const fetchData = async () => {
      try {
        setLoading(true);
        // ⏳ Delay 300ms để đợi NutritionScreen ghi xong MongoDB
        await new Promise((resolve) => setTimeout(resolve, 300));

        const userData = await AsyncStorage.getItem("user");
        if (!userData || !isActive) return;

        const parsed = JSON.parse(userData);
        const userId = parsed?.id || parsed?._id?.$oid || parsed?._id;
        if (!userId) return;

        // LẤY HEALTH DATA
        const resHealth = await fetch(`${API_URL}/healthdata/totalhealthdata/${userId}`);
        if (resHealth.ok) {
          const result = await resHealth.json();
          if (isActive && result.success && result.data) setHealthData(result.data);
        }

        // LẤY BMI
        const resUser = await fetch(`${API_URL}/users/${userId}`);
        if (resUser.ok) {
          const userResult = await resUser.json();
          const history = userResult?.bodyStatsHistory || [];
          if (isActive && history.length > 0) {
            const latest = history[history.length - 1];
            setBmi(latest.bmi.toFixed(1));
          }
        }
      } catch (err) {
        console.error("Load home data error:", err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchData();

    // Cleanup khi rời màn hình
    return () => {
      isActive = false;
    };
  }, [])
);



  // === TÍNH TOÁN overviewData ===
  const overviewData: OverviewItem[] = useMemo(() => {
    if (!healthData || loading) {
      return [
        { label: "Steps", value: "—", color: "#c084fc", icon: Ionicons, iconName: "walk-outline" },
        { label: "Sleep", value: "—", color: "#8b5cf6", icon: Ionicons, iconName: "moon-outline" },
        { label: "Water", value: "—", color: "#38bdf8", icon: Ionicons, iconName: "water-outline" },
        { label: "Nutrition", value: "—", color: "#4ade80", icon: Ionicons, iconName: "fast-food-outline" },
        { label: "BMI", value: "—", color: "#facc15", icon: Ionicons, iconName: "body-outline" },
        { label: "Workout", value: "—", color: "#f87171", icon: Ionicons, iconName: "barbell-outline" },
      ];
    }

    return [
      {
        label: "Steps",
        value: healthData.steps.stepCount.toLocaleString(),
        color: "#c084fc",
        icon: Ionicons,
        iconName: "walk-outline",
      },
      {
        label: "Sleep",
        value: `${healthData.sleep.totalSleepHr.toFixed(1)}h`,
        color: "#8b5cf6",
        icon: Ionicons,
        iconName: "moon-outline",
      },
      {
        label: "Water",
        value: `${(healthData.waterConsumed / 1000).toFixed(1)} L`,
        color: "#38bdf8",
        icon: Ionicons,
        iconName: "water-outline",
      },
      {
        label: "Nutrition",
        value: `${healthData.nutrition.caloriesConsumed} kcal`,
        color: "#4ade80",
        icon: Ionicons,
        iconName: "fast-food-outline",
      },
      {
        label: "BMI",
        value: bmi,
        color: "#facc15",
        icon: Ionicons,
        iconName: "body-outline",
      },
      {
        label: "Workout",
        value: `${healthData.workout.workDuration} min`,
        color: "#f87171",
        icon: Ionicons,
        iconName: "barbell-outline",
      },
    ];
  }, [healthData, bmi, loading]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // === LOADING SCREEN ===
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.header}>
          <View style={styles.headerTop}>
            <Image source={require("../assets/logoxoanen1.png")} style={styles.logo} />
            <Text style={styles.appName}>KayTi</Text>
          </View>
          <Text style={styles.date}>{today}</Text>
        </LinearGradient>

        {/* Overview Title */}
        <Text style={styles.overviewTitle}>
          Overview <Ionicons name="stats-chart-outline" size={26} color="#2563eb" />
        </Text>

        {/* Health Score */}
        <View style={styles.healthCard}>
          <View>
            <Text style={styles.healthTitle}>Health Score</Text>
            <Text style={styles.healthDesc}>
              Based on your overview health tracking, your score is{" "}
              <Text style={{ fontWeight: "bold" }}>
                {healthData?.healthScore ?? "—"}
              </Text>{" "}
              and considered good.
            </Text>
            <TouchableOpacity>
              <Text style={styles.healthLink}>Tell me more</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {healthData?.healthScore ?? "—"}
            </Text>
          </View>
        </View>

        {/* Overview Cards */}
        <View style={styles.cardContainer}>
          {overviewData.map((item) => {
            const IconComp = item.icon;
            const isStep = item.label === "Steps";
            const isSleep = item.label === "Sleep";
            const isWorkout = item.label === "Workout";
            const isWater = item.label === "Water";
            const isNutrition = item.label === "Nutrition";
            const isBMI = item.label === "BMI";

            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                style={[styles.card, { backgroundColor: item.color }]}
                onPress={() => {
                  if (isStep) navigation.navigate("Steps");
                  if (isSleep) navigation.navigate("Sleep");
                  if (isWorkout) navigation.navigate("Workout");
                  if (isWater) navigation.navigate("Water");
                  if (isNutrition) navigation.navigate("Nutrition");
                  if (isBMI) navigation.navigate("BMI");
                }}
              >
                <IconComp name={item.iconName} size={32} color="#fff" />
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardValue}>{item.value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weekly Report */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week Report</Text>
          <View style={styles.weeklyContainer}>
            {weeklyReport.map((item) => {
              const IconComp = item.icon;
              return (
                <View key={item.label} style={styles.weekCard}>
                  <IconComp name={item.iconName} size={28} color={item.color} />
                  <Text style={styles.weekLabel}>{item.label}</Text>
                  <Text style={styles.weekValue}>{item.value}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Blogs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Blogs</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {blogs.map((blog) => (
              <View key={blog.title} style={styles.blogCard}>
                <Image source={blog.image} style={styles.blogImage} />
                <Text style={styles.blogTitle}>{blog.title}</Text>
                <Text style={styles.blogSubtitle}>{blog.subtitle}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <BottomNav />
    </Animated.View>
  );
}

// ====== DỮ LIỆU TĨNH ======
const weeklyReport: OverviewItem[] = [
  {
    label: "Steps",
    value: "697,978",
    color: "#2563eb",
    icon: MaterialCommunityIcons,
    iconName: "shoe-print",
  },
  {
    label: "Workout",
    value: "6h 45min",
    color: "#f87171",
    icon: Ionicons,
    iconName: "fitness-outline",
  },
  {
    label: "Water",
    value: "10,659ml",
    color: "#3b82f6",
    icon: Ionicons,
    iconName: "water-outline",
  },
  {
    label: "Sleep",
    value: "29h 17min",
    color: "#0ea5e9",
    icon: Ionicons,
    iconName: "moon",
  },
];

const blogs: BlogItem[] = [
  {
    title: "More about Apples",
    subtitle: "Benefits, nutrition, and tips",
    image: require("../assets/icon.png"),
  },
  {
    title: "The science of Sleep",
    subtitle: "How rest impacts your health",
    image: require("../assets/icon.png"),
  },
  {
    title: "Hydration Matters",
    subtitle: "The importance of water daily",
    image: require("../assets/icon.png"),
  },
];

// ====== STYLE ======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 130 },
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

  overviewTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111",
    marginTop: 15,
    marginHorizontal: 20,
  },

  // Health Score
  healthCard: {
    marginTop: 15,
    marginHorizontal: 20,
    backgroundColor: "#f5f6ff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  healthTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  healthDesc: { color: "#333", marginTop: 6, lineHeight: 20, width: 220 },
  healthLink: { color: "#2563eb", marginTop: 8, fontWeight: "600", fontSize: 14 },
  scoreBadge: {
    backgroundColor: "#fb923c",
    borderRadius: 12,
    width: 60,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // Overview Cards
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    width: "47%",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
  },
  cardLabel: { color: "#fff", fontSize: 15, marginTop: 10 },
  cardValue: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 4 },

  // Weekly Report
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 15, color: "#111" },
  weeklyContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  weekCard: {
    width: "47%",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    marginBottom: 15,
    elevation: 3,
  },
  weekLabel: { fontSize: 15, color: "#222", marginTop: 6 },
  weekValue: { fontSize: 16, fontWeight: "700", color: "#000", marginTop: 2 },

  // Blog
  blogCard: {
    width: 200,
    marginRight: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  blogImage: { width: "100%", height: 120 },
  blogTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 10, marginTop: 8 },
  blogSubtitle: { fontSize: 14, color: "#555", paddingHorizontal: 10, marginBottom: 10 },

  // Loading
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