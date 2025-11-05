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
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";


const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://nhom16-healthycheck.onrender.com";
const screenWidth = Dimensions.get("window").width;

export default function SleepScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(1)).current;

  const [selectedTab, setSelectedTab] = useState<"today" | "week" | "month">(
    "today"
  );
  const [sleepGoal, setSleepGoal] = useState(8);
  const [editingGoal, setEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState("8");
  const [userId, setUserId] = useState<string | null>(null);
  const [sleepSchedules, setSleepSchedules] = useState<
    { id: number; bedTime: Date; wakeTime: Date; isLocked: boolean }[]
  >([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"bed" | "wake" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sleepDuration, setSleepDuration] = useState("0h 0min");
  const [avgSleepWeek, setAvgSleepWeek] = useState("0h 0min");
  const [avgSleepMonth, setAvgSleepMonth] = useState("0h 0min");
  const [weekData, setWeekData] = useState<number[]>([]);
  const [monthData, setMonthData] = useState<number[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [weekLabels, setWeekLabels] = useState<string[]>([]);
  // === Chuyển Date → "2025-10-28 21:20" (giờ VN) ===
const formatVNTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  // DÙNG LOCAL TIME → NGƯỜI DÙNG Ở VN → ĐÚNG NGÀY
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// === Chuyển "2025-10-28 21:20" → Date (giờ VN) ===
const parseVNTime = (str: string): Date => {
  const [datePart, timePart] = str.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute); // Local time
};

  // ========== EFFECTS ==========

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) return;

        const parsed = JSON.parse(storedUser);
        const uid = parsed._id?.$oid || parsed._id || parsed.id;
        setUserId(uid);

        const storedGoal = await AsyncStorage.getItem(`sleepGoal_${uid}`);
        if (storedGoal) {
          setSleepGoal(Number(storedGoal));
          setInputGoal(storedGoal);
        } else {
          const response = await axios.get(`${API_URL}/users/${uid}`);
          const goalFromDB = response.data.health_goal?.sleepGoal || 480;
          setSleepGoal(goalFromDB / 60);
          setInputGoal((goalFromDB / 60).toString());
        }
      } catch (err) {
        console.error("❌ Load sleep goal failed:", err);
      }
    };
    loadData();
  }, []);

  // Calculate total sleep duration for today
  useEffect(() => {
    let totalMinutes = 0;
    sleepSchedules.forEach((s) => {
      const bed = s.bedTime.getHours() * 60 + s.bedTime.getMinutes();
      const wake = s.wakeTime.getHours() * 60 + s.wakeTime.getMinutes();
      let duration = wake - bed;
      if (duration <= 0) duration += 24 * 60;
      totalMinutes += duration;
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    setSleepDuration(`${h}h ${m}min`);
  }, [sleepSchedules]);

  // Load today's sleep from backend
 // Load today's sleep from backend
useEffect(() => {
  const fetchTodaySleepSessions = async () => {
    if (!userId) return;
    try {
      const now = new Date();
      const vietnamOffset = 7 * 60 * 60 * 1000;
      const nowVN = new Date(now.getTime() + vietnamOffset);
      const yearVN = nowVN.getUTCFullYear();
      const monthVN = nowVN.getUTCMonth();
      const dayVN = nowVN.getUTCDate();
      const startOfDay = new Date(Date.UTC(yearVN, monthVN, dayVN)).toISOString();

      console.log("Fetching sleep sessions for VN date:", startOfDay);
      const response = await axios.get(
        `${API_URL}/healthdata/sleep/today/${userId}?date=${startOfDay}`
      );
      const sessions = response.data.sessions || [];

      if (sessions.length > 0) {
        const mapped = sessions.map((s: any, idx: number) => ({
          id: idx + 1,
          bedTime: parseVNTime(s.sleepTime),   // "2025-10-28 21:00" → Date
          wakeTime: parseVNTime(s.wakeTime),   // "2025-10-28 22:00" → Date
          isLocked: true,
        }));
        console.log("Mapped sleepSchedules:", mapped);
        setSleepSchedules(mapped);
      } else {
        console.log("No sleep sessions found for today.");
        setSleepSchedules([]);
      }
    } catch (err) {
      console.error("Error loading today sleep sessions:", err);
    }
  };
  fetchTodaySleepSessions();
}, [userId]);

  // Load chart data for week/month
  useEffect(() => {
    if (!userId || selectedTab === "today") return;

    const fetchChartData = async () => {
      setLoadingChart(true);
      try {
        const response = await axios.get(
          `${API_URL}/healthdata/sleep/stats?userId=${userId}&range=${selectedTab}`
        );
        if (response.data.success) {
          const { data, labels } = response.data;

          if (selectedTab === "week") {
            setWeekData(data || []);
            setWeekLabels(response.data.labels); // → ["Mon", "Tue", ...]

            // Chỉ tính trung bình trên ngày có ngủ
            const validData = data.filter((v) => v > 0);
            const avgHours =
              validData.length > 0
                ? validData.reduce((a, b) => a + b, 0) / validData.length
                : 0;
            const h = Math.floor(avgHours);
            const m = Math.round((avgHours - h) * 60);
            setAvgSleepWeek(`${h}h ${m}min`);
          } else if (selectedTab === "month") {
            setMonthData(data || []);

            const validData = data.filter((v) => v > 0);
            const avgHours =
              validData.length > 0
                ? validData.reduce((a, b) => a + b, 0) / validData.length
                : 0;
            const h = Math.floor(avgHours);
            const m = Math.round((avgHours - h) * 60);
            setAvgSleepMonth(`${h}h ${m}min`);
          }
        }
      } catch (err) {
        console.error(`Error loading ${selectedTab} data:`, err);
        if (selectedTab === "week") {
          setWeekData([0, 0, 0, 0, 0, 0, 0]);
          setWeekLabels(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
          setAvgSleepWeek("0h 0min");
        } else {
          setMonthData([0, 0, 0, 0, 0, 0]);
          setAvgSleepMonth("0h 0min");
        }
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChartData();
  }, [selectedTab, userId]);

  // Auto-save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      console.log("📤 Auto-saving sleep schedule before leaving...");
      saveSleepSchedule();
    });
    return unsubscribe;
  }, [sleepSchedules, userId]);

  // ========== FUNCTIONS ==========

  const updateSleepGoal = async () => {
    if (!userId) return;
    const goalNumber = Number(inputGoal);
    if (isNaN(goalNumber) || goalNumber < 1 || goalNumber > 24) {
      Alert.alert("Invalid", "Please enter a valid goal between 1–24 hours.");
      return;
    }
    await AsyncStorage.setItem(`sleepGoal_${userId}`, inputGoal);
    try {
      await axios.put(`${API_URL}/users/update-sleep-goal/${userId}`, {
        sleepGoal: goalNumber * 60,
      });
      console.log("✅ Sleep goal updated to backend");
    } catch (err: any) {
      console.warn("⚠️ Backend not reachable:", err.message);
    }
    setSleepGoal(goalNumber);
    setEditingGoal(false);
    Alert.alert("✅ Success", "Sleep goal updated successfully!");
  };

  const addSchedule = () => {
    const newId = Date.now();
    setSleepSchedules((prev) => [
      ...prev,
      {
        id: newId,
        bedTime: new Date(),
        wakeTime: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
        isLocked: false,
      },
    ]);
  };

  const removeSchedule = (id: number) => {
    setSleepSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const openPicker = (id: number, mode: "bed" | "wake") => {
    setEditingId(id);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onChangeTime = (_: any, selectedTime?: Date) => {
    if (selectedTime && editingId !== null && pickerMode) {
      setShowPicker(false);
      setSleepSchedules((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                [pickerMode === "bed" ? "bedTime" : "wakeTime"]: selectedTime,
              }
            : s
        )
      );
    } else setShowPicker(false);
  };

 const saveSleepSchedule = async () => {
  if (!userId) return;
  try {
    const newSessions = sleepSchedules
      .filter((s) => !s.isLocked)
      .map((s) => {
        // LẤY NGÀY HIỆN TẠI (ngày 29)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bed = new Date(s.bedTime);
        const wake = new Date(s.wakeTime);

        const bedMins = bed.getHours() * 60 + bed.getMinutes();
        const wakeMins = wake.getHours() * 60 + wake.getMinutes();

        let bedCopy = new Date(bed);
        let wakeCopy = new Date(wake);

        // XỬ LÝ NGỦ QUA ĐÊM
        if (wakeMins <= bedMins) {
          // bed thuộc ngày TRƯỚC → giảm 1 ngày
          bedCopy.setDate(bedCopy.getDate() - 1);
        }

        // ĐẢM BẢO wakeCopy LUÔN LÀ NGÀY HIỆN TẠI (29)
        const wakeYear = today.getFullYear();
        const wakeMonth = today.getMonth();
        const wakeDay = today.getDate();

        wakeCopy = new Date(wakeYear, wakeMonth, wakeDay, wake.getHours(), wake.getMinutes());

        const durationMin = Math.round((wakeCopy - bedCopy) / 60000);

        return {
          sleepTime: formatVNTime(bedCopy),
          wakeTime: formatVNTime(wakeCopy),
          durationMin,
        };
      });

    if (newSessions.length === 0) return;

    console.log("Saving sessions:", newSessions);
    await axios.post(`${API_URL}/healthdata/sleep/schedule/${userId}`, {
      sessions: newSessions,
    });
navigation.navigate("Home", { refresh: true });
    setSleepSchedules((prev) =>
      prev.map((s) => ({ ...s, isLocked: true }))
    );
  } catch (err) {
    console.error("Error saving sleep:", err);
  }
};

  const getDisplayDuration = () =>
    selectedTab === "today"
      ? sleepDuration
      : selectedTab === "week"
      ? avgSleepWeek
      : avgSleepMonth;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========== CHART DATA ==========
  // Trong renderChartData()
const renderChartData = () => {
  const todaySleepHours = sleepDuration
    ? parseFloat(sleepDuration.split("h")[0]) +
      parseInt(sleepDuration.split(" ")[1]) / 60
    : 0;

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => "#333",
    propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)" },
  };

  if (selectedTab === "today") {
    return {
      labels: ["Goal 🏆", "Actual"],
      datasets: [
        {
          data: [sleepGoal, todaySleepHours],
          colors: [() => "#facc15", () => "#7c3aed"],
        },
      ],
    };
  } else if (selectedTab === "week") {
    const displayData = [...weekData].reverse();
    const displayLabels = [...weekLabels].reverse();
    const labels = ["Goal", ...displayLabels];
    const data = [sleepGoal, ...displayData];
    const colors = data.map((_, i) =>
      i === 0 ? () => "#facc15" : () => "#7c3aed"
    );
    return { labels, datasets: [{ data, colors }] };
  } else {
  // Tab "month": 30 ngày gần nhất, today đầu tiên bên trái
  const today = new Date();
  const todayVN = new Date(today.getTime() + 7 * 60 * 60 * 1000);
  const vnYear = todayVN.getUTCFullYear();
  const vnMonth = todayVN.getUTCMonth();
  const vnDate = todayVN.getUTCDate();

  const displayData: number[] = [];
  const displayLabels: string[] = [];

  // monthData[0] → 30 ngày trước, monthData[29] → hôm nay
  for (let i = 29; i >= 0; i--) {
    displayData.push(monthData[i] || 0);

    const targetDate = new Date(Date.UTC(vnYear, vnMonth, vnDate));
    targetDate.setUTCDate(vnDate - (29 - i)); // 29 - i ngày trước
    const label =
      i === 29
        ? `Today(${targetDate.getUTCDate()})`
        : `${targetDate.getUTCDate()}`;
    displayLabels.push(label);
  }

  const labels = ["Goal", ...displayLabels];
  const data = [sleepGoal, ...displayData];
  const colors = data.map((_, i) =>
    i === 0 ? () => "#facc15" : () => "#7c3aed"
  );

  return { labels, datasets: [{ data, colors }] };
}
};

  const getChartWidth = () => {
  let numCols = 0;
  if (selectedTab === "today") numCols = 8; // Goal + Actual
  else if (selectedTab === "week") numCols = 12; // Goal + 7 ngày
  else if (selectedTab === "month") numCols = 31; // Goal + 30 ngày
  const colWidth = 40; // chiều rộng 1 cột
  const spacing = 10;  // khoảng cách giữa cột
  return numCols * (colWidth + spacing);
};

const chartWidth = getChartWidth();


  // ================= RENDER =================
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* HEADER */}
          <LinearGradient colors={["#6366f1", "#a855f7"]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Sleep</Text>
              <View style={{ width: 26 }} />
            </View>
          </LinearGradient>

          {/* SLEEP INFO */}
          <Text style={styles.avgSleepText}>
            <Text style={{ fontWeight: "700" }}>
              {selectedTab === "today"
                ? "Your time of sleep \n today is "
                : selectedTab === "week"
                ? "Your average time of sleep \n this week is "
                : "Your average time of sleep \n this month is "}
            </Text>
            <Text style={{ fontWeight: "800", color: "#7c3aed" }}>
              {getDisplayDuration()}
            </Text>
          </Text>

          {/* TABS */}
          <View style={styles.tabsContainer}>
            {["today", "week", "month"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab as any)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CHART */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartContainer}>
              {loadingChart ? (
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 50,
                    color: "#6b7280",
                  }}
                >
                  Loading chart...
                </Text>
              ) : (
                <BarChart
                  data={renderChartData()}
                 width={(chartWidth)} 
                  height={220}
                  fromZero
                  yAxisSuffix="h"
                  chartConfig={{
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(124,58,237,${opacity})`,
                    labelColor: () => "#333",
                    propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)" },
                  }}
                  style={styles.chart}
                  withCustomBarColorFromData
                  flatColor
                  showValuesOnTopOfBars
                />
              )}
            </View>
          </ScrollView>

          {/* GOAL INPUT */}
          <LinearGradient
            colors={["#fef9c3", "#fde68a"]}
            style={styles.goalCard}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="trophy-outline"
                size={20}
                color="#92400e"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#78350f" }}
              >
                Sleep Goal (hours)
              </Text>
            </View>
            {editingGoal ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={inputGoal}
                  onChangeText={setInputGoal}
                  keyboardType="numeric"
                  style={styles.goalInput}
                />
                <TouchableOpacity
                  style={styles.saveGoalBtn}
                  onPress={updateSleepGoal}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={styles.goalText}>{sleepGoal} h</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* SCHEDULE */}
          <LinearGradient
            colors={["#f3e8ff", "#e9d5ff"]}
            style={styles.scheduleCard}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#6d28d9"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ fontWeight: "700", fontSize: 16, color: "#5b21b6" }}
              >
                Set Your Schedule
              </Text>
            </View>

            {sleepSchedules.length > 0 ? (
              sleepSchedules.map((s) => (
                <Animated.View
                  key={s.id}
                  style={{ transform: [{ scale: listAnim }] }}
                >
                  <View style={styles.scheduleRow}>
                    <View style={{ alignItems: "center" }}>
                      <Ionicons name="moon" size={18} color="#6d28d9" />
                      <TouchableOpacity
                        disabled={s.isLocked}
                        onPress={() => openPicker(s.id, "bed")}
                      >
                        <Text style={styles.timeText}>
                          {formatTime(s.bedTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Ionicons name="arrow-forward" size={20} color="#5b21b6" />

                    <View style={{ alignItems: "center" }}>
                      <Ionicons name="sunny" size={18} color="#a855f7" />
                      <TouchableOpacity
                        disabled={s.isLocked}
                        onPress={() => openPicker(s.id, "wake")}
                      >
                        <Text style={styles.timeText}>
                          {formatTime(s.wakeTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {!s.isLocked && (
                      <TouchableOpacity onPress={() => removeSchedule(s.id)}>
                        <Ionicons name="trash" size={20} color="#b91c1c" />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ))
            ) : (
              <Text
                style={{ textAlign: "center", color: "#6b7280", marginTop: 10 }}
              >
                No schedule today.
              </Text>
            )}

            <TouchableOpacity style={styles.addBtn} onPress={addSchedule}>
              <Ionicons name="add-circle" size={22} color="#6d28d9" />
              <Text style={{ color: "#5b21b6", fontWeight: "700" }}>
                Add Schedule
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {showPicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour
              display="spinner"
              onChange={onChangeTime}
            />
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  avgSleepText: {
    fontSize: 20,
    textAlign: "center",
    marginVertical: 10,
    lineHeight: 26,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 40,
    borderRadius: 25,
    backgroundColor: "#f1f5f9",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 25 },
  activeTab: { backgroundColor: "#7c3aed" },
  tabText: { color: "#7c3aed", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  chartContainer: { marginTop: 20, alignItems: "center" },
  chart: { borderRadius: 16 },
  goalCard: {
    marginTop: 25,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#78350f",
    width: 70,
    textAlign: "center",
    marginRight: 10,
    backgroundColor: "#fff7ed",
  },
  saveGoalBtn: {
    backgroundColor: "#92400e",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goalText: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
    color: "#78350f",
  },
  scheduleCard: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  timeText: { fontWeight: "700", color: "#4c1d95", fontSize: 16, marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
});
