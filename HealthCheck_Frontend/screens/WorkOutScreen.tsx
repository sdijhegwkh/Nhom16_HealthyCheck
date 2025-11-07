import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://nhom16-healthycheck.onrender.com";
const screenWidth = Dimensions.get("window").width;

export default function WorkoutScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(1)).current;

  const [selectedTab, setSelectedTab] = useState<"today" | "week" | "month">("today");
  const [workoutGoal, setWorkoutGoal] = useState(60);
  const [editingGoal, setEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState("60");
  const [userId, setUserId] = useState<string | null>(null);
  const [weekLabels, setWeekLabels] = useState<string[]>([]);

  const [workouts, setWorkouts] = useState<
    { id: number; note: string; duration: number; isLocked: boolean }[]
  >([]);

  const [durationInput, setDurationInput] = useState("");
  const [note, setNote] = useState("");

  // Chart
  const [weekData, setWeekData] = useState<number[]>([]);
  const [monthData, setMonthData] = useState<number[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [avgWorkoutWeek, setAvgWorkoutWeek] = useState("0 min");
  const [avgWorkoutMonth, setAvgWorkoutMonth] = useState("0 min");

  // Effects
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  // SỬA 1: loadUser giống SleepScreen
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
          console.warn("Không có user trong AsyncStorage");
          return;
        }

        const parsed = JSON.parse(storedUser);
        const uid = parsed._id?.$oid || parsed._id || parsed.id;
        if (!uid) {
          console.warn("userId không hợp lệ:", parsed);
          return;
        }

        setUserId(uid);

        const storedGoal = await AsyncStorage.getItem(`workoutGoal_${uid}`);
        if (storedGoal) {
          setWorkoutGoal(Number(storedGoal));
          setInputGoal(storedGoal);
        } else {
          const response = await axios.get(`${API_URL}/users/${uid}`);
          const goalFromDB = response.data.health_goal?.workoutGoal || 3600;
          setWorkoutGoal(goalFromDB);
          setInputGoal(goalFromDB.toString());
        }
      } catch (err) {
        console.error("Load workout goal failed:", err);
      }
    };
    loadData();
  }, []);

  // Load today workouts
  useEffect(() => {
    const fetchToday = async () => {
      if (!userId) return;
      try {
        const now = new Date();
        const vnOffset = 7 * 60 * 60 * 1000;
        const nowVN = new Date(now.getTime() + vnOffset);
        const startOfDay = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate())).toISOString();

        const res = await axios.get(`${API_URL}/healthdata/workout/today/${userId}?date=${startOfDay}`);
        const sessions = res.data.sessions || [];
        const mapped = sessions.map((s: any, i: number) => ({
          id: i + 1,
          note: s.note || "No note",
          duration: s.durationMin || 0,
          isLocked: true,
        }));
        setWorkouts(mapped);
      } catch (err) {
        console.error("Load today workout error:", err);
      }
    };
    fetchToday();
  }, [userId]);

  // Load chart
  useEffect(() => {
    if (!userId || selectedTab === "today") return;
    const fetchStats = async () => {
      setLoadingChart(true);
      try {
        const res = await axios.get(`${API_URL}/healthdata/workout/stats?userId=${userId}&range=${selectedTab}`);
        if (res.data.success) {
          const { data, labels } = res.data;
          if (selectedTab === "week") {
            setWeekData(data || []);
            setWeekLabels(labels || []); // ← LẤY labels
            const valid = data.filter((v: number) => v > 0);
            const avg = valid.length ? valid.reduce((a: number, b: number) => a + b, 0) / valid.length : 0;
            setAvgWorkoutWeek(`${Math.round(avg)} min`);
          } else {
            setMonthData(data || []);
            const valid = data.filter((v: number) => v > 0);
            const avg = valid.length ? valid.reduce((a: number, b: number) => a + b, 0) / valid.length : 0;
            setAvgWorkoutMonth(`${Math.round(avg)} min`);
          }
        }
      } catch (err) {
        console.error("Load stats error:", err);
        // Fallback
        if (selectedTab === "week") {
          setWeekData([0, 0, 0, 0, 0, 0, 0]);
          setWeekLabels(["", "", "", "", "", "", ""]);
          setAvgWorkoutWeek("0 min");
        } else {
          setMonthData([0, 0, 0, 0, 0, 0]);
          setAvgWorkoutMonth("0 min");
        }
      } finally {
        setLoadingChart(false);
      }
    };
    fetchStats();
  }, [selectedTab, userId]);

  // SỬA 2: Auto-save trước khi rời màn hình
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async (e) => {
      const hasUnsaved = workouts.some(w => w.id && !w.isLocked);
      if (!hasUnsaved) return;

      e.preventDefault();

      try {
        await saveWorkout();
        navigation.dispatch(e.data.action);
      } catch (err) {
        Alert.alert("Lỗi", "Không thể lưu workout. Vui lòng thử lại.");
      }
    });

    return unsubscribe;
  }, [workouts, userId, navigation]);

  // Functions
  // SỬA 4: updateGoal giống SleepScreen
  const updateGoal = async () => {
  if (!userId) return;

  const goal = Number(inputGoal);
  if (isNaN(goal) || goal < 1) {
    Alert.alert("Invalid", "Please enter a valid goal (min)");
    return;
  }

  await AsyncStorage.setItem(`workoutGoal_${userId}`, goal.toString());

  try {
    await axios.put(`${API_URL}/users/update-workout-goal/${userId}`, {
      workoutGoal: goal, // GỬI PHÚT, KHÔNG NHÂN 60
    });
    console.log("Workout goal updated to backend (minutes)");
  } catch (err: any) {
    console.warn("Backend not reachable:", err.message);
  }

  setWorkoutGoal(goal);
  setEditingGoal(false);
  Alert.alert("Success", "Workout goal updated!");
};

  const addWorkout = () => {
    if (!durationInput) return Alert.alert("Enter duration");
    const duration = parseInt(durationInput);
    if (duration <= 0) return Alert.alert("Duration > 0");

    const newId = Date.now();
    setWorkouts(prev => [...prev, { id: newId, note: note || "No note", duration, isLocked: false }]);
    setDurationInput("");
    setNote("");
  };

  const removeWorkout = (id: number) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  // SỬA 3: saveWorkout + log + throw
  const saveWorkout = async () => {
    if (!userId) {
      console.warn("Không có userId khi lưu workout");
      return;
    }

    const newSessions = workouts
      .filter(w => w.id && !w.isLocked)
      .map(w => ({
        note: w.note || "No note",
        durationMin: w.duration,
      }));

    if (!newSessions.length) {
      console.log("Không có session mới để lưu");
      return;
    }

    console.log("Đang lưu workout:", newSessions);

    try {
      const res = await axios.post(
        `${API_URL}/healthdata/workout/schedule/${userId}`,
        { sessions: newSessions }
      );
      console.log("Lưu workout thành công:", res.data);

      setWorkouts(prev =>
        prev.map(w => w.id ? { ...w, isLocked: true } : w)
      );
    } catch (err: any) {
      console.error("Lỗi lưu workout:", err.response?.data || err.message);
      throw err;
    }
  };

  const totalToday = workouts.reduce((sum, w) => sum + w.duration, 0);
  const getDisplay = () => selectedTab === "today" ? `${totalToday} min` : selectedTab === "week" ? avgWorkoutWeek : avgWorkoutMonth;

  // Chart
  const renderChartData = () => {
  if (selectedTab === "today") {
    return {
      labels: ["Goal", "Actual"],
      datasets: [
        { data: [workoutGoal, totalToday], colors: [() => "#facc15", () => "#ef4444"] },
      ],
    };
  } else if (selectedTab === "week") {
    // ✅ đảo ngược data để ngày mới nhất nằm đầu
    const displayData = [...weekData].reverse();
    const displayLabels = [...weekLabels].reverse();

    return {
      labels: displayLabels, // ví dụ 7/11, 6/11, 5/11, ...
      datasets: [
        {
          data: displayData,
          colors: displayData.map(() => () => "#ef4444"),
        },
      ],
    };
  } else {
    // ✅ MONTH
    const today = new Date();

    // Giả định monthData.length = số ngày trong tháng (ví dụ 30)
    const labels: string[] = [];
    const data: number[] = [];

    // Duyệt ngược để ngày mới nhất nằm đầu
    for (let i = 0; i < monthData.length; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const day = d.getDate();
      const month = d.getMonth() + 1;
      labels.push(`${day}/${month}`);
      data.push(monthData[i]);
    }

    return {
      labels,
      datasets: [
        {
          data,
          colors: data.map(() => () => "#ef4444"),
        },
      ],
    };
  }
};


  const chartWidth =
  selectedTab === "today"
    ? screenWidth - 40
    : selectedTab === "week"
    ? Math.max(screenWidth * 1.6, 400)
    : Math.max(screenWidth * 2.2, 2000); // 30 cột, đủ rộng

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <LinearGradient colors={["#ef4444", "#fb923c"]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Workout</Text>
              <View style={{ width: 26 }} />
            </View>
          </LinearGradient>

          <Text style={styles.summaryText}>
            <Text style={{ fontWeight: "700" }}>
              {selectedTab === "today" ? "Today you trained " : selectedTab === "week" ? "Avg this week: " : "Avg this month: "}
            </Text>
            <Text style={{ fontWeight: "800", color: "#ef4444" }}>{getDisplay()}</Text>
          </Text>

          <View style={styles.tabsContainer}>
            {["today", "week", "month"].map(tab => (
              <TouchableOpacity key={tab} style={[styles.tab, selectedTab === tab && styles.activeTab]} onPress={() => setSelectedTab(tab as any)}>
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView horizontal>
            <View style={styles.chartContainer}>
              {loadingChart ? (
                <Text style={{ marginTop: 50, color: "#6b7280" }}>Loading...</Text>
              ) : (
                <BarChart
                  data={renderChartData()}
                  width={chartWidth}
                  height={220}
                  fromZero
                  yAxisSuffix="m"
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: () => "#ef4444",
                    labelColor: () => "#333",
                  }}
                  style={styles.chart}
                  withCustomBarColorFromData
                  flatColor
                  showValuesOnTopOfBars
                />
              )}
            </View>
          </ScrollView>

          <LinearGradient colors={["#fee2e2", "#fecaca"]} style={styles.goalCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="barbell-outline" size={20} color="#b91c1c" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#7f1d1d" }}>Workout Goal (min)</Text>
            </View>
            {editingGoal ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput value={inputGoal} onChangeText={setInputGoal} keyboardType="numeric" style={styles.goalInput} />
                <TouchableOpacity style={styles.saveGoalBtn} onPress={updateGoal}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={styles.goalText}>{workoutGoal} min</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          <LinearGradient colors={["#fef3c7", "#fde68a"]} style={styles.scheduleCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={20} color="#92400e" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: "700", fontSize: 16, color: "#78350f" }}>Workout Log</Text>
            </View>

            {workouts.length === 0 ? (
              <Text style={{ color: "#92400e", marginTop: 8 }}>No workout today</Text>
            ) : (
              workouts.map(w => (
                <Animated.View key={w.id} style={{ transform: [{ scale: listAnim }] }}>
                  <View style={styles.scheduleRow}>
                    <View>
                      <Text style={styles.durationText}>{w.duration} min</Text>
                      <Text style={styles.noteText}>Note: {w.note}</Text>
                    </View>
                    {!w.isLocked && (
                      <TouchableOpacity onPress={() => removeWorkout(w.id)}>
                        <Ionicons name="trash" size={20} color="#b91c1c" />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ))
            )}

            <TextInput
              placeholder="Duration (minutes)"
              value={durationInput}
              onChangeText={setDurationInput}
              keyboardType="numeric"
              style={styles.durationInput}
            />
            <TextInput
              placeholder="Note (optional)"
              value={note}
              onChangeText={setNote}
              style={styles.noteInput}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addWorkout}>
              <Ionicons name="add-circle" size={22} color="#92400e" />
              <Text style={{ color: "#78350f", fontWeight: "700" }}>Add Workout</Text>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  summaryText: { fontSize: 20, textAlign: "center", marginVertical: 12, lineHeight: 26 },
  tabsContainer: { flexDirection: "row", justifyContent: "center", marginHorizontal: 40, borderRadius: 25, backgroundColor: "#fee2e2" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 25 },
  activeTab: { backgroundColor: "#ef4444" },
  tabText: { color: "#ef4444", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  chartContainer: { marginTop: 20, alignItems: "center" },
  chart: { borderRadius: 16 },
  goalCard: { marginTop: 25, marginHorizontal: 20, borderRadius: 12, padding: 16 },
  goalInput: { borderWidth: 1, borderColor: "#b91c1c", borderRadius: 6, paddingHorizontal: 10, width: 70, backgroundColor: "#fff", marginRight: 8 },
  saveGoalBtn: { backgroundColor: "#b91c1c", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  goalText: { fontSize: 18, fontWeight: "800", color: "#7f1d1d", marginTop: 4 },
  scheduleCard: { marginTop: 20, marginHorizontal: 20, borderRadius: 12, padding: 16 },
  scheduleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
  durationText: { fontWeight: "700", color: "#92400e", fontSize: 16 },
  noteText: { color: "#92400e", fontSize: 13 },
  durationInput: { borderWidth: 1, borderColor: "#92400e", borderRadius: 6, paddingHorizontal: 8, marginTop: 10, backgroundColor: "#fff" },
  noteInput: { borderWidth: 1, borderColor: "#92400e", borderRadius: 6, paddingHorizontal: 8, marginTop: 6, backgroundColor: "#fff" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, gap: 6 },
});