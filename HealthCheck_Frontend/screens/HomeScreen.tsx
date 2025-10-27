import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { IconProps } from "@expo/vector-icons/build/createIconSet";
import BottomNav from "../components/BottomNav";
import { useNavigation } from "@react-navigation/native";

type OverviewItem = {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentType<IconProps<any>>;
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#2563eb", "#60a5fa"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <Image
              source={require("../assets/logoxoanen1.png")}
              style={styles.logo}
            />
            <Text style={styles.appName}>KayTi</Text>
          </View>
          <Text style={styles.date}>{today}</Text>
        </LinearGradient>

        {/* Overview title (ra ngoài nền xanh) */}
        <Text style={styles.overviewTitle}>
          Overview{" "}
          <Ionicons
            name="stats-chart-outline"
            size={26}
            color="#2563eb"
            style={{ marginLeft: 8 }}
          />
        </Text>
        {/* Health Score */}
        <View style={styles.healthCard}>
          <View>
            <Text style={styles.healthTitle}>Health Score</Text>
            <Text style={styles.healthDesc}>
              Based on your overview health tracking, your score is{" "}
              <Text style={{ fontWeight: "bold" }}>78</Text> and considered
              good.
            </Text>
            <TouchableOpacity>
              <Text style={styles.healthLink}>Tell me more →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>78</Text>
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
                  if (isStep) navigation.navigate("Steps"); // 👈 điều hướng sang StepScreen
                  if (isSleep) navigation.navigate("Sleep"); // 👈 điều hướng sang SleepScreen
                  if (isWorkout) navigation.navigate("Workout"); // 👈 điều hướng sang WorkoutScreen
                  if (isWater) navigation.navigate("Water"); // 👈 điều hướng sang WaterScreen
                  if (isNutrition) navigation.navigate("Nutrition");
                  if (isBMI) navigation.navigate("BMI");
                }}
              >
                <IconComp name={item.iconName as any} size={32} color="#fff" />
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
                  <IconComp
                    name={item.iconName as any}
                    size={28}
                    color={item.color}
                  />
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

      {/* Bottom Navigation */}
      <BottomNav />
    </View>
  );
}

// ====== DATA ======
const overviewData: OverviewItem[] = [
  {
    label: "Steps",
    value: "—",
    color: "#c084fc", // xanh tím (blue-violet)#93c5fd 
    icon: Ionicons,
    iconName: "walk-outline",
  },
  {
    label: "Sleep",
    value: "7h 31min",
    color: "#8b5cf6",
    icon: Ionicons,
    iconName: "moon-outline",
  },
  {
    label: "Water",
    value: "2.0 L", 
    color: "#38bdf8",
    icon: Ionicons,
    iconName: "water-outline",
  },
  {
    label: "Nutrition",
    value: "960 kcal",
    color: "#4ade80",
    icon: Ionicons,
    iconName: "fast-food-outline",
  },
  {
    label: "BMI",
    value: "22.5",
    color: "#facc15",
    icon: Ionicons,
    iconName: "body-outline",
  },
  {
    label: "Workout",
    value: "1h 15min",
    color: "#f87171",
    icon: Ionicons,
    iconName: "barbell-outline",
  },
];

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
  scrollContent: {
    paddingBottom: 130,
  },
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
  healthLink: {
    color: "#2563eb",
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },
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

  // Bottom Navigation
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    elevation: 10,
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 13, color: "#444", marginTop: 4 },
  profilePic: { width: 38, height: 38, borderRadius: 19 },
  onlineDot: {
    position: "absolute",
    right: 3,
    bottom: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 1,
    borderColor: "#fff",
  },
  
});
