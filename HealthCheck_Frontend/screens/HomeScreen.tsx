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

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://nhom16-healthycheck.onrender.com";

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

interface Blog {
  _id: { $oid?: string } | string;
  title: string;
  category?: string;
  content?: string;
  votes: number;
  imageUrl?: string;
  authorName?: string;
  createdAt?: string;
}

type OverviewItem = {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<any>;
  iconName: string;
};

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [bmi, setBmi] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<{
    steps: number;
    sleepHours: number;
    sleepMinutes: number;
    waterMl: number;
    workoutMin: number;
    calories?: number;
  } | null>(null);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(100); // ← MỚI: Health Score tự tính

  // === ANIMATION ===
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // === TÍNH HEALTH SCORE TỪ WEEKLY DATA ===
  // === TÍNH HEALTH SCORE THEO BẢNG MỚI ===
  const calculateHealthScore = (weekly: typeof weeklyData): number => {
    if (!weekly) return 100;

    let score = 100;

    const GOAL_STEPS = 56000;
    const GOAL_SLEEP_HOURS = 56;
    const GOAL_WATER_ML = 14000;
    const GOAL_WORKOUT_MIN = 180;
    const GOAL_CALORIES = 18000;

    const actualSteps = weekly.steps;
    const actualSleepHours = weekly.sleepHours + weekly.sleepMinutes / 60;
    const actualWaterMl = weekly.waterMl;
    const actualWorkoutMin = weekly.workoutMin;
    const actualCalories = weekly.calories || 0;

    const deductPoints = (
      actual: number,
      goal: number,
      isHigherBetter: boolean = true
    ) => {
      const diff = actual - goal;
      const absDiff = Math.abs(diff);
      const percentDiff = goal > 0 ? (absDiff / goal) * 100 : 0;

      if (percentDiff <= 10) return 0;

      if (isHigherBetter) {
        if (diff < 0) {
          // Thiếu
          if (percentDiff <= 20) return -5;
          if (percentDiff <= 30) return -10;
          return -20;
        } else {
          // Dư
          if (percentDiff <= 30) return 0;
          if (percentDiff <= 50) return -5;
          return -10;
        }
      } else {
        // Calories: càng gần càng tốt
        if (percentDiff <= 20) return -5;
        if (percentDiff <= 30) return -10;
        return -20;
      }
    };

    score += deductPoints(actualSteps, GOAL_STEPS, true);
    score += deductPoints(actualSleepHours, GOAL_SLEEP_HOURS, true);
    score += deductPoints(actualWaterMl, GOAL_WATER_ML, true);
    score += deductPoints(actualWorkoutMin, GOAL_WORKOUT_MIN, true);
    score += deductPoints(actualCalories, GOAL_CALORIES, false);

    return Math.max(0, score);
  };

  // === CẬP NHẬT HEALTH SCORE KHI CÓ WEEKLY DATA ===
  useEffect(() => {
    if (weeklyData) {
      const score = calculateHealthScore(weeklyData);
      setHealthScore(score);
    }
  }, [weeklyData]);

  // === LẤY DỮ LIỆU TỪ BACKEND ===
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchAllData = async () => {
        try {
          setLoading(true);
          setBlogLoading(true);

          const userData = await AsyncStorage.getItem("user");
          if (!userData || !isActive) return;

          const parsed = JSON.parse(userData);
          const userId =
            parsed?.id || parsed?._id?.$oid || parsed?.userId?.$oid;

          if (!userId) {
            console.error("User ID not found:", parsed);
            if (isActive) setLoading(false);
            return;
          }

          // GỌI API SONG SONG
          const [resHealth, resUser, resWeekly, resBlogs] = await Promise.all([
            fetch(`${API_URL}/healthdata/totalhealthdata/${userId}`),
            fetch(`${API_URL}/users/${userId}`),
            fetch(`${API_URL}/healthdata/weekly-report/${userId}`),
            fetch(`${API_URL}/blogs/top`),
          ]);

          let newHealthData = null;
          let newBmi = "—";
          let newWeeklyData = null;

          // Health Data (hôm nay)
          if (resHealth.ok) {
            const result = await resHealth.json();
            if (result.success && result.data) newHealthData = result.data;
          }

          // BMI
          if (resUser.ok) {
            const userResult = await resUser.json();
            const history = userResult?.bodyStatsHistory || [];
            if (history.length > 0) newBmi = history.at(-1).bmi.toFixed(1);
          }

          // Weekly Report
          if (resWeekly.ok) {
            const weeklyResult = await resWeekly.json();
            if (weeklyResult.success && weeklyResult.data)
              newWeeklyData = weeklyResult.data;
          }
          if (isActive && newWeeklyData && userId) {
            const score = calculateHealthScore(newWeeklyData);
            setHealthScore(score);

            fetch(`${API_URL}/healthdata/update-score/${userId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ healthScore: score }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) console.log("Health Score saved:", score);
              })
              .catch((err) => console.warn("Save failed:", err));
          }

          // Blogs
          if (resBlogs.ok) {
            const blogResult = await resBlogs.json();
            if (blogResult.success && blogResult.data && isActive)
              setBlogs(blogResult.data);
          }

          if (isActive) {
            setHealthData(newHealthData);
            setBmi(newBmi);
            setWeeklyData(newWeeklyData);
          }
        } catch (err) {
          console.error("Error fetching home data:", err);
        } finally {
          if (isActive) {
            setLoading(false);
            setBlogLoading(false);
          }
        }
      };

      fetchAllData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // === TÍNH TOÁN overviewData ===
  const overviewData: OverviewItem[] = useMemo(() => {
    if (!healthData || loading) {
      return [
        {
          label: "Steps",
          value: "—",
          color: "#c084fc",
          icon: Ionicons,
          iconName: "walk-outline",
        },
        {
          label: "Sleep",
          value: "—",
          color: "#8b5cf6",
          icon: Ionicons,
          iconName: "moon-outline",
        },
        {
          label: "Water",
          value: "—",
          color: "#38bdf8",
          icon: Ionicons,
          iconName: "water-outline",
        },
        {
          label: "Nutrition",
          value: "—",
          color: "#4ade80",
          icon: Ionicons,
          iconName: "fast-food-outline",
        },
        {
          label: "BMI",
          value: "—",
          color: "#facc15",
          icon: Ionicons,
          iconName: "body-outline",
        },
        {
          label: "Workout",
          value: "—",
          color: "#f87171",
          icon: Ionicons,
          iconName: "barbell-outline",
        },
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

  // === WEEKLY REPORT VỚI CALORIES ===
  const weeklyReport: OverviewItem[] = useMemo(() => {
    if (!weeklyData || loading) {
      return [
        {
          label: "Steps",
          value: "—",
          color: "#2563eb",
          icon: MaterialCommunityIcons,
          iconName: "shoe-print",
        },
        {
          label: "Workout",
          value: "—",
          color: "#f87171",
          icon: Ionicons,
          iconName: "fitness-outline",
        },
        {
          label: "Water",
          value: "—",
          color: "#3b82f6",
          icon: Ionicons,
          iconName: "water-outline",
        },
        {
          label: "Sleep",
          value: "—",
          color: "#0ea5e9",
          icon: Ionicons,
          iconName: "moon",
        },
        {
          label: "Calories",
          value: "—",
          color: "#f97316",
          icon: Ionicons,
          iconName: "flame-outline",
        },
      ];
    }

    return [
      {
        label: "Steps",
        value: weeklyData.steps.toLocaleString(),
        color: "#2563eb",
        icon: MaterialCommunityIcons,
        iconName: "shoe-print",
      },
      {
        label: "Workout",
        value: `${Math.floor(weeklyData.workoutMin / 60)}h ${
          weeklyData.workoutMin % 60
        }min`,
        color: "#f87171",
        icon: Ionicons,
        iconName: "fitness-outline",
      },
      {
        label: "Water",
        value: `${weeklyData.waterMl.toLocaleString()}ml`,
        color: "#3b82f6",
        icon: Ionicons,
        iconName: "water-outline",
      },
      {
        label: "Sleep",
        value: `${weeklyData.sleepHours}h ${weeklyData.sleepMinutes}min`,
        color: "#0ea5e9",
        icon: Ionicons,
        iconName: "moon",
      },
    ];
  }, [weeklyData, loading]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // === LOADING ===
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  // === UI ===
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
            <Image
              source={require("../assets/logoxoanen1.png")}
              style={styles.logo}
            />
            <Text style={styles.appName}>KayTi</Text>
          </View>
          <Text style={styles.date}>{today}</Text>
        </LinearGradient>

        {/* Overview Title */}
        <Text style={styles.overviewTitle}>
          Overview{" "}
          <Ionicons name="stats-chart-outline" size={26} color="#2563eb" />
        </Text>

        {/* Health Score – DÙNG HEALTHSCORE TỰ TÍNH */}
        <View style={styles.healthCard}>
          <View>
            <Text style={styles.healthTitle}>Health Score</Text>
            <Text style={styles.healthDesc}>
              Based on your weekly health tracking, your score is{" "}
              <Text style={{ fontWeight: "bold" }}>{healthScore}</Text> and
              considered{" "}
              <Text
                style={{
                  fontWeight: "bold",
                  color:
                    healthScore >= 80
                      ? "#10b981"
                      : healthScore >= 50
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              >
                {healthScore >= 80
                  ? "excellent"
                  : healthScore >= 50
                  ? "fair"
                  : "needs improvement"}
              </Text>
              .
            </Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{healthScore}</Text>
          </View>
        </View>

        {/* Overview Cards */}
        <View style={styles.cardContainer}>
          {overviewData.map((item) => {
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                style={[styles.card, { backgroundColor: item.color }]}
                onPress={() => navigation.navigate(item.label)}
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

        {/* === BLOGS === */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.sectionTitle}>Health Blogs</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Blog")}>
              <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                Show All
              </Text>
            </TouchableOpacity>
          </View>

          {blogLoading ? (
            <ActivityIndicator
              size="small"
              color="#2563eb"
              style={{ marginTop: 10 }}
            />
          ) : blogs.length === 0 ? (
            <Text style={{ color: "#555", marginTop: 10 }}>
              No blogs available.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {blogs.map((blog) => {
                const blogId =
                  typeof blog._id === "string"
                    ? blog._id
                    : blog._id?.$oid || String(blog._id);

                return (
                  <TouchableOpacity
                    key={blogId}
                    style={styles.blogCard}
                    onPress={() => navigation.navigate("BlogDetail", { blog })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          blog.imageUrl ||
                          "https://via.placeholder.com/300x200?text=No+Image",
                      }}
                      style={styles.blogImage}
                      resizeMode="cover"
                    />
                    <View style={styles.blogContent}>
                      <Text style={styles.blogTitle} numberOfLines={1}>
                        {blog.title}
                      </Text>
                      <Text style={styles.blogSubtitle} numberOfLines={2}>
                        by {blog.authorName || "Unknown"} {blog.votes}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </Animated.View>
  );
}

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#111",
  },
  weeklyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
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
  blogTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 10,
    marginTop: 8,
  },
  blogSubtitle: {
    fontSize: 14,
    color: "#555",
    paddingHorizontal: 10,
    marginBottom: 10,
  },

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
  blogContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});
