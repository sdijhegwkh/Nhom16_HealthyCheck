import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { DeviceMotion } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;
const API_URL = "https://nhom16-healthycheck.onrender.com";

export default function StepsScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [goal, setGoal] = useState(7500);
  const [editingGoal, setEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState(goal.toString());
  const [selectedTab, setSelectedTab] = useState("day");
  const [userId, setUserId] = useState<string | null>(null);

  const [initialSteps, setInitialSteps] = useState(0); // bước DB
  const [sessionSteps, setSessionSteps] = useState(0); // bước hiện tại
  const [distance, setDistance] = useState(0);
  const [burnedCalories, setBurnedCalories] = useState(0);

  // Chart data
  const [dailyData, setDailyData] = useState<number[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>([]);

  // === Load user info ===
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const id = parsed._id?.$oid || parsed._id || parsed.id;
          setUserId(id);

          const g = parsed.health_goal?.stepsGoal || 7500;
          setGoal(g);
          setInputGoal(g.toString());
        }
      } catch (e) {
        console.warn("Failed to load user:", e);
      }
    })();
  }, []);

  // === Fade in animation ===
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // === DeviceMotion đếm bước ===
  useEffect(() => {
    let lastShake = 0;
    const threshold = 1.2;
    const subscription = DeviceMotion.addListener((motion) => {
      const { acceleration } = motion;
      if (!acceleration) return;
      const total = Math.sqrt(
        acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
      );
      if (total > threshold) {
        const now = Date.now();
        if (now - lastShake > 500) {
          setSessionSteps((s) => s + 1);
          lastShake = now;
        }
      }
    });
    DeviceMotion.setUpdateInterval(100);
    return () => subscription.remove();
  }, []);

  // === Fetch chart data ===
  const fetchStats = async (type: "day" | "week" | "month") => {
    if (!userId) return;
    try {
      const res = await fetch(
        `${API_URL}/healthdata/stats?userId=${userId}&range=${type}`
      );
      const result = await res.json();
      if (!result.success) return;

      if (type === "day") setDailyData(result.data);
      else if (type === "week") setWeeklyData(result.data);
      else setMonthlyData(result.data);
    } catch (err) {
      console.warn("Fetch stats failed", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStats("day");
      fetchStats("week");
      fetchStats("month");
    }
  }, [userId]);

  // === Load steps today ===
  useEffect(() => {
    const fetchTodaySteps = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/healthdata/get-today/${userId}`);
        const result = await res.json();
        if (result.success && result.exists && result.data?.steps) {
          const s = result.data.steps;
          setInitialSteps(s.stepCount || 0);
          setDistance(s.distanceKm || 0);
          setBurnedCalories(s.burnedCalories || 0);
          setSessionSteps(0);
        } else {
          setInitialSteps(0);
          setDistance(0);
          setBurnedCalories(0);
          setSessionSteps(0);
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchTodaySteps();
  }, [userId]);

  const stepsDisplay = initialSteps + sessionSteps;

  // === Sync delta khi rời screen ===
  useEffect(() => {
    return navigation.addListener("beforeRemove", async () => {
      if (!userId) return;
      const delta = sessionSteps;
      if (!delta || delta <= 0) return;

      const deltaDistance = Number((delta * 0.0008).toFixed(2));
      const deltaCalories = Math.round(delta * 0.04);
      const deltaDuration = Math.round(delta / 120);

      try {
        await fetch(`${API_URL}/healthdata/update-steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            stepCount: delta,
            distanceKm: deltaDistance,
            durationMin: deltaDuration,
            burnedCalories: deltaCalories,
          }),
        });
        setInitialSteps((prev) => prev + delta);
        setSessionSteps(0);
        setDistance((prev) => Number((prev + deltaDistance).toFixed(2)));
        setBurnedCalories((prev) => prev + deltaCalories);
      } catch (e) {
        console.warn("Failed to sync steps:", e);
      }
    });
  }, [sessionSteps, navigation, userId]);

  // === Edit goal ===
  const handleSaveGoal = async () => {
    const newGoal = Number(inputGoal);
    if (!newGoal) return Alert.alert("⚠️ Invalid goal");

    try {
      const res = await fetch(`${API_URL}/users/update-goal/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepsGoal: newGoal }),
      });

      if (res.ok) {
        setGoal(newGoal);
        setEditingGoal(false);

        // update AsyncStorage
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.health_goal.stepsGoal = newGoal;
          await AsyncStorage.setItem("user", JSON.stringify(parsed));
        }

        // ✅ Thêm dòng này để fetch lại dữ liệu ngày
        fetchStats("day");

        Alert.alert("✅ Updated", "Your step goal has been updated!");
      } else {
        Alert.alert("❌ Error", "Failed to update goal on server");
      }
    } catch (e) {
      console.error("Goal update error:", e);
      Alert.alert("🚫 Error", "Server not reachable");
    }
  };

  // === Display calculations ===
  const displayData =
    selectedTab === "day"
      ? stepsDisplay
      : selectedTab === "week"
      ? weeklyData.reduce((a, b) => a + b, 0)
      : monthlyData.reduce((a, b) => a + b, 0);
  const displayGoal =
    selectedTab === "day"
      ? goal
      : selectedTab === "week"
      ? goal * 7
      : goal * 30;
  const percentage = Math.min((displayData / displayGoal) * 100, 100);
  const displayKcal = Math.round(displayData * 0.04);
  const displayDistance = (displayData * 0.0008).toFixed(2);
  const displayMinutes = Math.round(displayData / 120);
  const monthlyChartData = [];
  for (let i = 0; i < monthlyData.length; i += 5) {
    const chunk = monthlyData.slice(i, i + 5);
    const sum = chunk.reduce((a, b) => a + b, 0);
    monthlyChartData.push(sum);
  }
  const monthlyLabels = monthlyChartData.map(
    (_, i) => `${i * 5 + 1}-${i * 5 + 5}`
  );

  const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: () => "#111",
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#2563eb" },
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Steps</Text>
            <View style={{ width: 26 }} />
          </View>
        </LinearGradient>

        <Text style={styles.progressText}>
          {selectedTab === "day" && "Today you’ve completed "}
          {selectedTab === "week" && "This week you’ve completed "}
          {selectedTab === "month" && "This month you’ve completed "}
          <Text style={{ color: "#2563eb", fontWeight: "700" }}>
            {"\n"}
            {percentage.toFixed(1)}%
          </Text>{" "}
          of your goal
        </Text>

        <View style={styles.progressContainer}>
          <AnimatedCircularProgress
            size={220}
            width={14}
            fill={percentage}
            tintColor="#2563eb"
            backgroundColor="#e5e7eb"
            rotation={0}
            lineCap="round"
          >
            {() => (
              <View style={{ alignItems: "center" }}>
                <Ionicons
                  name="walk-outline"
                  size={36}
                  color="#2563eb"
                  style={{ marginBottom: 4 }}
                />
                <Text style={styles.stepsValue}>
                  {displayData.toLocaleString()}
                </Text>
                <Text style={styles.stepsGoal}>
                  / {displayGoal.toLocaleString()} steps
                </Text>
              </View>
            )}
          </AnimatedCircularProgress>

          <TouchableOpacity
            style={styles.editGoalBtn}
            onPress={() => setEditingGoal(!editingGoal)}
          >
            <Ionicons name="create-outline" size={20} color="#2563eb" />
            <Text style={{ color: "#2563eb", marginLeft: 4 }}>Edit Goal</Text>
          </TouchableOpacity>

          {editingGoal && (
            <View style={styles.goalInputContainer}>
              <TextInput
                value={inputGoal}
                onChangeText={setInputGoal}
                keyboardType="numeric"
                style={styles.goalInput}
              />
              <TouchableOpacity
                style={styles.saveGoalBtn}
                onPress={handleSaveGoal}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={26} color="#ef4444" />
            <Text style={styles.statValue}>{displayKcal} kcal</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={26} color="#10b981" />
            <Text style={styles.statValue}>{displayDistance} km</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={26} color="#f59e0b" />
            <Text style={styles.statValue}>{displayMinutes} min</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {["day", "week", "month"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab === "day" ? "Ngày" : tab === "week" ? "Tuần" : "Tháng"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          {selectedTab === "day" && (
            <>
              <Text style={styles.chartTitle}>Hoạt động hôm nay</Text>
              <BarChart
                data={{
                  labels: ["Bước hiện tại", "Goal"],
                  datasets: [{ data: [stepsDisplay, goal] }],
                }}
                width={screenWidth - 40}
                height={220}
                fromZero
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  labelColor: () => "#111",
                  barPercentage: 0.5,
                }}
                style={styles.chart}
              />
            </>
          )}

          {selectedTab === "week" && weeklyData.length >= 7 ? (
            <LineChart
              data={{
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{ data: weeklyData }],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : selectedTab === "week" ? (
            <Text style={{ color: "#6b7280", marginTop: 10 }}>
              Chưa đủ dữ liệu để hiển thị biểu đồ tuần.
            </Text>
          ) : null}

          {selectedTab === "month" && monthlyData.length >= 10 ? (
            <LineChart
              data={{
                labels: monthlyLabels,
                datasets: [{ data: monthlyChartData }],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : selectedTab === "month" ? (
            <Text style={{ color: "#6b7280", marginTop: 10 }}>
              Chưa đủ dữ liệu để hiển thị biểu đồ tháng.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  progressText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginTop: 20,
  },
  progressContainer: { alignItems: "center", marginTop: 25 },
  stepsValue: { fontSize: 34, fontWeight: "700", color: "#111" },
  stepsGoal: { color: "#6b7280", marginTop: 4 },
  editGoalBtn: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  goalInputContainer: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
  },
  goalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    borderRadius: 6,
    width: 100,
    textAlign: "center",
  },
  saveGoalBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 30,
  },
  statCard: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    backgroundColor: "#f1f5f9",
    borderRadius: 25,
    marginHorizontal: 40,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 25 },
  activeTab: { backgroundColor: "#2563eb" },
  tabText: { color: "#2563eb", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  chartContainer: { marginTop: 25, alignItems: "center" },
  chart: { borderRadius: 16 },
});
