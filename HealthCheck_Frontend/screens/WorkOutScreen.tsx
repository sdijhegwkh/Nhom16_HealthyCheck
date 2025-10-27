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
import { LineChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";

const screenWidth = Dimensions.get("window").width;

export default function WorkoutScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(1)).current;

  // Tabs & Goal
  const [selectedTab, setSelectedTab] = useState<"today" | "week" | "month">(
    "today"
  );
  const [workoutGoal, setWorkoutGoal] = useState(60);
  const [editingGoal, setEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState(workoutGoal.toString());

  // Dữ liệu Workout
  const [workouts, setWorkouts] = useState<
    { id: number; date: Date; duration: number; note: string }[]
  >([]);

  // Chế độ thêm workout
  const [mode, setMode] = useState<"quick" | "range">("quick");
  const [durationInput, setDurationInput] = useState("");
  const [note, setNote] = useState("");

  // TimePicker
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Hiệu ứng fade-in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const today = new Date();
  const totalToday = workouts
    .filter(
      (w) =>
        w.date.getDate() === today.getDate() &&
        w.date.getMonth() === today.getMonth()
    )
    .reduce((sum, w) => sum + w.duration, 0);

  const totalWeek = workouts.reduce((sum, w) => sum + w.duration, 0);
  const totalMonth = workouts.reduce((sum, w) => sum + w.duration, 0);

  const getDisplayTotal = () => {
    if (selectedTab === "today") return `${totalToday} min`;
    if (selectedTab === "week") return `${totalWeek} min`;
    return `${totalMonth} min`;
  };

  // Biểu đồ dữ liệu
  const weeklyData = [30, 45, 50, 60, 40, 70, 55];
  const monthlyData = [40, 60, 45, 55, 50, 65, 70, 60, 75, 80, 65, 70]; // 12 tháng

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
    labelColor: () => "#444",
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#fb923c" },
  };

  const renderChartData = () => {
    if (selectedTab === "today") {
      return {
        labels: ["Goal 🏆", "Actual"],
        datasets: [{ data: [workoutGoal, totalToday], color: () => "#ef4444" }],
      };
    } else if (selectedTab === "week") {
      return {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{ data: weeklyData }],
      };
    } else {
      return {
        labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        datasets: [{ data: monthlyData }],
      };
    }
  };

  const chartWidth =
    selectedTab === "today"
      ? screenWidth - 40
      : selectedTab === "week"
      ? screenWidth * 1.3
      : screenWidth * 1.8;

  // Thêm workout + hiệu ứng
  const addWorkout = () => {
    let duration = 0;

    if (mode === "quick") {
      if (!durationInput)
        return Alert.alert("⚠️ Please enter workout duration (minutes)");
      duration = parseInt(durationInput);
    } else {
      if (!startTime || !endTime)
        return Alert.alert("⚠️ Please select both start and end times!");
      const diff = (endTime.getTime() - startTime.getTime()) / 60000;
      if (diff <= 0)
        return Alert.alert("⚠️ End time must be later than start time!");
      duration = diff;
    }

    const newItem = {
      id: Date.now(),
      date: new Date(),
      duration,
      note: note.trim() || "No note",
    };

    // hiệu ứng thêm
    Animated.sequence([
      Animated.timing(listAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setWorkouts((prev) => [...prev, newItem]);
    setDurationInput("");
    setStartTime(null);
    setEndTime(null);
    setNote("");
  };

  // Xoá workout + hiệu ứng fade
  const removeWorkout = (id: number) => {
    Animated.timing(listAnim, {
      toValue: 0.8,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      listAnim.setValue(1);
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <LinearGradient colors={["#ef4444", "#fb923c"]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Workout</Text>
              <View style={{ width: 26 }} />
            </View>
          </LinearGradient>

          {/* Tổng thời gian */}
          <Text style={styles.summaryText}>
            <Text style={styles.boldText}>
              {selectedTab === "today"
                ? "Today you trained "
                : selectedTab === "week"
                ? "Total training this week: "
                : "Total training this month: "}
            </Text>
            <Text style={styles.redText}>{getDisplayTotal()}</Text>
            {selectedTab === "today"
              ? " 💪"
              : selectedTab === "week"
              ? " 🔥"
              : " 🏋️"}
          </Text>

          {/* Tabs */}
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

          {/* Biểu đồ */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartContainer}>
              <LineChart
                data={renderChartData()}
                width={chartWidth}
                height={220}
                fromZero
                yAxisSuffix="m"
                chartConfig={chartConfig}
                bezier={false}
                style={styles.chart}
              />
            </View>
          </ScrollView>
          <Text style={styles.sleepRateText}>
            {selectedTab === "today"
              ? "Workout performance today: 94% 💪"
              : selectedTab === "week"
              ? "Workout performance this week: 88% 🏋️"
              : "Workout performance this month: 92% 🔥"}
          </Text>

          {/* Goal */}
          <LinearGradient
            colors={["#fee2e2", "#fecaca"]}
            style={styles.goalCard}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="barbell-outline"
                size={20}
                color="#b91c1c"
                style={{ marginRight: 6 }}
              />
              <Text style={{fontSize:16, fontWeight: "700", color: "#7f1d1d" }}>
                Workout Goal (minutes)
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
                  onPress={() => {
                    setWorkoutGoal(Number(inputGoal));
                    setEditingGoal(false);
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={styles.goalText}>{workoutGoal} min</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Workout Log */}
          <LinearGradient
            colors={["#fef3c7", "#fde68a"]}
            style={styles.scheduleCard}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#92400e"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ fontWeight: "700", fontSize: 16, color: "#78350f" }}
              >
                Workout Log
              </Text>
            </View>

            {workouts.length === 0 ? (
              <Text style={{ color: "#92400e", marginTop: 8 }}>
                No workout logged yet
              </Text>
            ) : (
              workouts.map((w) => (
                <Animated.View
                  key={w.id}
                  style={{ transform: [{ scale: listAnim }] }}
                >
                  <View style={styles.scheduleRow}>
                    <View>
                      <Text style={styles.timeText}>
                        {w.date.toDateString()}
                      </Text>
                      <Text style={styles.noteText}>📝 {w.note}</Text>
                    </View>
                    <Text style={styles.durationText}>{w.duration} min</Text>
                    <TouchableOpacity onPress={() => removeWorkout(w.id)}>
                      <Ionicons name="trash" size={20} color="#b91c1c" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))
            )}

            {/* Chế độ thêm */}
            <View style={styles.addModeContainer}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === "quick" && styles.activeModeBtn,
                ]}
                onPress={() => setMode("quick")}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "quick" && styles.activeModeText,
                  ]}
                >
                  Quick Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  mode === "range" && styles.activeModeBtn,
                ]}
                onPress={() => setMode("range")}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "range" && styles.activeModeText,
                  ]}
                >
                  Time Range
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            {mode === "quick" ? (
              <View style={styles.addRow}>
                <TextInput
                  placeholder="Minutes"
                  value={durationInput}
                  onChangeText={setDurationInput}
                  keyboardType="numeric"
                  style={styles.durationInput}
                />
              </View>
            ) : (
              <View style={styles.addRow}>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={styles.timePickerBtn}
                >
                  <Ionicons name="time-outline" size={16} color="#92400e" />
                  <Text style={{ marginLeft: 6 }}>
                    {startTime
                      ? startTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Start"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={styles.timePickerBtn}
                >
                  <Ionicons name="time-outline" size={16} color="#92400e" />
                  <Text style={{ marginLeft: 6 }}>
                    {endTime
                      ? endTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "End"}
                  </Text>
                </TouchableOpacity>

                {/* TimePickers */}
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime || new Date()}
                    mode="time"
                    is24Hour
                    display="spinner"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setStartTime(date);
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime || new Date()}
                    mode="time"
                    is24Hour
                    display="spinner"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndTime(date);
                    }}
                  />
                )}
              </View>
            )}

            <TextInput
              placeholder="Add note..."
              value={note}
              onChangeText={setNote}
              style={styles.noteInput}
            />

            <TouchableOpacity style={styles.addBtn} onPress={addWorkout}>
              <Ionicons name="add-circle" size={22} color="#92400e" />
              <Text style={{ color: "#78350f", fontWeight: "700" }}>
                Add Workout
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ===================== STYLES =====================
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
  summaryText: { fontSize: 20, textAlign: "center", marginVertical: 12 },
  boldText: { fontWeight: "bold" },
  redText: { color: "#ef4444", fontWeight: "bold" },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 40,
    borderRadius: 25,
    backgroundColor: "#fee2e2",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 25 },
  activeTab: { backgroundColor: "#ef4444" },
  tabText: { color: "#ef4444", fontWeight: "600" },
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
    borderColor: "#ef4444",
    borderRadius: 6,
    paddingHorizontal: 10,
    width: 80,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  saveGoalBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  goalText: { color: "#b91c1c", fontWeight: "700", fontSize: 16, marginTop: 4 },
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
  timeText: { fontWeight: "700", color: "#78350f", fontSize: 15 },
  noteText: { color: "#92400e", fontSize: 13 },
  durationText: { fontWeight: "700", color: "#92400e", fontSize: 15 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 6,
    paddingHorizontal: 8,
    width: 100,
    backgroundColor: "#fff",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 6,
    paddingHorizontal: 8,
    marginTop: 10,
    backgroundColor: "#fff",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  addModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#fde68a",
  },
  activeModeBtn: { backgroundColor: "#fbbf24" },
  modeText: { color: "#78350f", fontWeight: "600" },
  activeModeText: { color: "#fff", fontWeight: "700" },
  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#92400e",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  sleepRateText: {
    marginTop: 10,
    fontWeight: "700",
    color: "#92400e",
    fontSize: 16,
    textAlign: "center",
  },
});
