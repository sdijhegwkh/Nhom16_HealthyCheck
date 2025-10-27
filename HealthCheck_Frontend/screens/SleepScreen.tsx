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
import DateTimePicker from "@react-native-community/datetimepicker";

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
  const [inputGoal, setInputGoal] = useState(sleepGoal.toString());

  const [sleepSchedules, setSleepSchedules] = useState<
    { bedTime: Date; wakeTime: Date; id: number }[]
  >([
    {
      id: 1,
      bedTime: new Date(2025, 1, 1, 22, 30),
      wakeTime: new Date(2025, 1, 2, 7, 0),
    },
  ]);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"bed" | "wake" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [sleepDuration, setSleepDuration] = useState("0h 0min");
  const [avgSleepWeek, setAvgSleepWeek] = useState("7h 15min");
  const [avgSleepMonth, setAvgSleepMonth] = useState("7h 30min");

  // Fade-in effect
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // Tính tổng thời gian ngủ
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

  // Lấy thời gian hiển thị tương ứng tab
  const getDisplayDuration = () => {
    if (selectedTab === "today") return sleepDuration;
    if (selectedTab === "week") return avgSleepWeek;
    return avgSleepMonth;
  };

  // Dữ liệu biểu đồ
  const todaySleepHours = 7.5;
  const weeklyData = [7, 5.5, 6.8, 7.2, 6, 8, 6.5];
  const monthlyData = [7, 7.5, 6, 8, 5, 7, 6.5, 7, 8, 6, 7.5, 7];

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => "#333",
    propsForBackgroundLines: { stroke: "rgba(0,0,0,0.05)" },
  };

  const renderChartData = () => {
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
      const labels = [
        "Goal 🏆",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
      ];
      const data = [sleepGoal, ...weeklyData];
      const colors = data.map((_, i) =>
        i === 0 ? () => "#facc15" : () => "#7c3aed"
      );
      return { labels, datasets: [{ data, colors }] };
    } else {
      const labels = [
        "Goal 🏆",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ];
      const data = [sleepGoal, ...monthlyData];
      const colors = data.map((_, i) =>
        i === 0 ? () => "#facc15" : () => "#7c3aed"
      );
      return { labels, datasets: [{ data, colors }] };
    }
  };

  const chartWidth =
    selectedTab === "today"
      ? screenWidth - 40
      : selectedTab === "week"
      ? screenWidth * 1.6
      : screenWidth * 2.2;

  // Mở TimePicker
  const openPicker = (id: number, mode: "bed" | "wake") => {
    setEditingId(id);
    setPickerMode(mode);
    setShowPicker(true);
  };

  // Chọn giờ
  const onChangeTime = (event: any, selectedTime?: Date) => {
  if (selectedTime && editingId !== null && pickerMode) {
    setShowPicker(false);
    setSleepSchedules((prev) =>
      prev.map((s) => {
        if (s.id === editingId) {
          const updated =
            pickerMode === "bed"
              ? { ...s, bedTime: selectedTime }
              : { ...s, wakeTime: selectedTime };

          const bed =
            updated.bedTime.getHours() * 60 + updated.bedTime.getMinutes();
          const wake =
            updated.wakeTime.getHours() * 60 + updated.wakeTime.getMinutes();

          // ✅ Nếu wake < bed => coi như wake là ngày hôm sau
          const duration = wake >= bed ? wake - bed : wake + 24 * 60 - bed;

          if (duration <= 0) {
            alert("Wake-up time must be after bedtime ⏰");
            return s;
          }

          return updated;
        }
        return s;
      })
    );
  } else setShowPicker(false);
};

  // Thêm schedule
  const addSchedule = () => {
    const newId = Date.now();
    const newItem = {
      id: newId,
      bedTime: new Date(),
      wakeTime: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
    };
    setSleepSchedules((prev) => [...prev, newItem]);
    Animated.spring(listAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  // Xóa schedule
  const removeSchedule = (id: number) => {
    Animated.timing(listAnim, {
      toValue: 0.9,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSleepSchedules((prev) => prev.filter((s) => s.id !== id));
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
          <LinearGradient colors={["#6366f1", "#a855f7"]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Sleep</Text>
              <View style={{ width: 26 }} />
            </View>
          </LinearGradient>

          {/* Sleep Duration */}
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

          {/* Chart */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartContainer}>
              <BarChart
                data={renderChartData()}
                width={chartWidth}
                height={220}
                fromZero
                yAxisSuffix="h"
                chartConfig={chartConfig}
                style={styles.chart}
                withCustomBarColorFromData
                flatColor
                showValuesOnTopOfBars
              />
            </View>
          </ScrollView>

          <Text style={styles.sleepRateText}>
            {selectedTab === "today"
              ? "Sleep rate today: 94% 😴"
              : selectedTab === "week"
              ? "Sleep rate this week: 88% 🌙"
              : "Sleep rate this month: 92% 💤"}
          </Text>

          {/* Goal Card */}
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
              <Text style={{fontSize: 16, fontWeight: "700", color: "#78350f" }}>
                Sleep Goal (hours)
              </Text>
            </View>

            {editingGoal ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  value={inputGoal}
                  onChangeText={setInputGoal}
                  keyboardType="numeric"
                  style={[styles.goalInput, { borderColor: "#92400e" }]}
                />
                <TouchableOpacity
                  style={[styles.saveGoalBtn, { backgroundColor: "#92400e" }]}
                  onPress={() => {
                    setSleepGoal(Number(inputGoal));
                    setEditingGoal(false);
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingGoal(true)}>
                <Text style={[styles.goalText, { color: "#78350f" }]}>
                  {sleepGoal} h
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Schedule */}
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

            {sleepSchedules.map((s) => (
              <Animated.View
                key={s.id}
                style={{ transform: [{ scale: listAnim }] }}
              >
                <View style={styles.scheduleRow}>
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="moon" size={18} color="#6d28d9" />
                    <TouchableOpacity onPress={() => openPicker(s.id, "bed")}>
                      <Text style={styles.timeText}>
                        {s.bedTime.getHours().toString().padStart(2, "0")}:
                        {s.bedTime.getMinutes().toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Ionicons name="arrow-forward" size={20} color="#5b21b6" />

                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="sunny" size={18} color="#a855f7" />
                    <TouchableOpacity onPress={() => openPicker(s.id, "wake")}>
                      <Text style={styles.timeText}>
                        {s.wakeTime.getHours().toString().padStart(2, "0")}:
                        {s.wakeTime.getMinutes().toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => removeSchedule(s.id)}>
                    <Ionicons name="trash" size={20} color="#b91c1c" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}

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
  goalCard: {
    marginTop: 25,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: "#7c3aed",
    borderRadius: 6,
    paddingHorizontal: 10,
    width: 80,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  saveGoalBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "center",
  },
  goalText: {
    color: "#78350f",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 4,
    marginLeft: 5,
  },
  sleepRateText: {
    marginTop: 10,
    fontWeight: "700",
    color: "#4c1d95",
    fontSize: 16,
    textAlign: "center",
  },
});
