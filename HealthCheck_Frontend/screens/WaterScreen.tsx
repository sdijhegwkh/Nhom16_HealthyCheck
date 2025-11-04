import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BarChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://nhom16-healthycheck.onrender.com";

export default function WaterScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // ---- State ----
  const [goal, setGoal] = useState(2000);
  const [waterPerDrink, setWaterPerDrink] = useState(250);
  const [currentWater, setCurrentWater] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"goal" | "water">("goal");
  const [inputValue, setInputValue] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Stats
  const [waterStats, setWaterStats] = useState<number[]>([]);
  const [waterLabels, setWaterLabels] = useState<string[]>([]);

  const progress = useSharedValue(0);
  const wavePhase = useSharedValue(0);

  // Fade-in
  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // Sóng nước
  useEffect(() => {
    wavePhase.value = withRepeat(withTiming(2 * Math.PI, { duration: 4000 }), -1);
  }, []);

  useEffect(() => {
    progress.value = withTiming(currentWater / goal, { duration: 800 });
  }, [currentWater, goal]);

  // TẢI waterPerDrink
  useEffect(() => {
    const loadWaterPerDrink = async () => {
      try {
        const saved = await AsyncStorage.getItem("waterPerDrink");
        if (saved) setWaterPerDrink(parseInt(saved));
      } catch (err) {
        console.error("Load waterPerDrink error:", err);
      }
    };
    loadWaterPerDrink();
  }, []);

  // TẢI USER ID + GOAL + CURRENT WATER
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        let uid: string | null = null;
        if (typeof user._id === "string") uid = user._id;
        else if (user._id?.$oid) uid = user._id.$oid;
        else if (user.id) uid = user.id;

        if (!uid) return;
        setUserId(uid);

        // Load goal
        const goalRes = await axios.get(`${API_URL}/users/${uid}`);
        const dbGoal = goalRes.data.health_goal?.waterGoal ?? 2000;
        setGoal(dbGoal);

        // Load today water
        const todayRes = await axios.get(`${API_URL}/healthdata/get-today/${uid}`);
        const todayWater = todayRes.data.data?.waterConsumed ?? 0;
        setCurrentWater(todayWater);
      } catch (err: any) {
        console.error("Load data error:", err.response?.data || err.message);
      }
    };
    loadData();
  }, []);

  // CẬP NHẬT GOAL
  const updateWaterGoalInDB = async (newGoal: number) => {
    if (!userId) return;
    try {
      await axios.put(`${API_URL}/users/update-water-goal/${userId}`, { waterGoal: newGoal });
    } catch (err: any) {
      Alert.alert("Error", "Failed to update goal");
    }
  };

  // LƯU NƯỚC
  const saveWaterToHealthData = async (ml: number) => {
    if (!userId || ml === 0) return;
    try {
      await axios.put(`${API_URL}/healthdata/water/${userId}`, { waterConsumed: ml });
    } catch (err: any) {
      console.error("Save water error:", err.response?.data || err.message);
    }
  };

  // TỰ ĐỘNG LƯU KHI RỜI
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (currentWater > 0 && userId) saveWaterToHealthData(currentWater);
      };
    }, [currentWater, userId])
  );

  // THÊM / BỚT NƯỚC
  const handleAddWater = () => {
    setCurrentWater((prev) => Math.min(prev + waterPerDrink, goal));
  };

  const handleRemoveWater = () => {
    setCurrentWater((prev) => Math.max(prev - waterPerDrink, 0));
  };

  // MỞ MODAL
  const openModal = (type: "goal" | "water", current: number) => {
    setModalType(type);
    setInputValue(current.toString());
    setModalVisible(true);
  };

  // LƯU INPUT
  const handleSaveInput = async () => {
    const val = parseInt(inputValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert("Invalid input", "Please enter a valid number!");
      return;
    }

    try {
      if (modalType === "goal") {
        setGoal(val);
        await updateWaterGoalInDB(val);
        Alert.alert("Success", "Water goal updated!");
      } else if (modalType === "water") {
        setWaterPerDrink(val);
        await AsyncStorage.setItem("waterPerDrink", val.toString());
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save");
    }
  };

  // LOAD 7-DAY STATS
  const loadWaterStats = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/healthdata/water-stats/${userId}`);
      if (res.data.success) {
        setWaterLabels(res.data.labels);
        setWaterStats(res.data.data);
      }
    } catch (err) {
      console.log("No stats yet");
    }
  };

  const handleViewStats = () => {
    loadWaterStats();
    setShowStats(true);
  };

  // Sóng nước
  const tankHeight = 300;
  const amplitude = 12;
  const animatedProps = useAnimatedProps(() => {
    const points = [];
    const step = 10;
    const waterLevel = tankHeight - tankHeight * progress.value;
    for (let x = 0; x <= width * 0.8; x += step) {
      const y = amplitude * Math.sin((x / (width * 0.8)) * 4 * Math.PI + wavePhase.value) + waterLevel;
      points.push(`${x},${y}`);
    }
    const d = `M0,${tankHeight} L${points.join(" ")} L${width * 0.8},${tankHeight} Z`;
    return { d };
  });

  const percent = Math.round((currentWater / goal) * 100);

  return (
    <RNAnimated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient colors={["#60a5fa", "#3b82f6", "#2563eb"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Water</Text>
          <View style={{ width: 26 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.todayText}>
          Today you drank{"\n"}
          <Text style={{ color: "#3b82f6", fontWeight: "700" }}>{currentWater} ml</Text> water
        </Text>

        {/* View Statistics Button */}
        <TouchableOpacity
          style={styles.statsButton}
          onPress={handleViewStats}
        >
          <Ionicons name="stats-chart-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.statsButtonText}>View Statistics</Text>
        </TouchableOpacity>

       {/* Stats Modal */}
{/* Stats Modal */}
<Modal visible={showStats} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Water Intake - Last 7 Days</Text>

      {waterStats.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <BarChart
            data={{
              labels: waterLabels,
              datasets: [{ data: waterStats }]
            }}
            width={520} // ĐỦ ĐỂ HIỆN 7 CỘT + TRỤC Y
            height={300}
            yAxisLabel=""
            yAxisSuffix=" ml" // CÁCH RA ĐỂ HIỆN RÕ
            fromZero
            showValuesOnTopOfBars
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: () => "#2563eb",
              labelColor: () => "#374151",
              style: {},
              propsForLabels: {
                fontSize: 12,
                fontWeight: "600",
              },
              propsForBackgroundLines: {
                stroke: "#e5e7eb",
                strokeDasharray: "",
              },
              barPercentage: 0.7,
              fillShadowGradient: "#3b82f6",
              fillShadowGradientOpacity: 0.3,
            }}
            style={{
              borderRadius: 16,
              paddingRight: 60, // TĂNG ĐỂ HIỆN TRỤC Y + "ml"
              marginLeft: 10,
            }}
            verticalLabelRotation={0}
            segments={5} // Chia trục Y đẹp
          />
        </ScrollView>
      ) : (
        <Text style={styles.noDataText}>Chưa có dữ liệu nước</Text>
      )}

      <TouchableOpacity style={styles.closeButton} onPress={() => setShowStats(false)}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
        {/* Bình nước */}
        <View style={styles.waveContainer}>
          <View style={styles.waterTank}>
            <Svg width="100%" height="100%">
              <Defs>
                <SvgGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#0288D1" stopOpacity="1" />
                </SvgGradient>
              </Defs>
              <AnimatedPath animatedProps={animatedProps} fill="url(#waveGradient)" />
            </Svg>
          </View>

          <View style={styles.overlayCenter}>
            <Text style={styles.percentText}>{percent}%</Text>
            <TouchableOpacity style={styles.goalButton} onPress={() => openModal("goal", goal)}>
              <Ionicons name="trophy-outline" size={22} color="#fff" />
              <Text style={styles.goalText}> Goal: {goal} ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          {percent === 0 && <Text style={styles.messageText}>Keep going! Drink more water!</Text>}
          {percent > 0 && percent <= 30 && <Text style={styles.messageText}>Keep going! Drink more water!</Text>}
          {percent > 30 && percent <= 70 && <Text style={styles.messageText}>Almost there, keep sipping!</Text>}
          {percent > 70 && percent < 100 && <Text style={styles.messageText}>Great job, nearly done!</Text>}
          {percent === 100 && <Text style={styles.messageText}>Congratulations! You reached your goal!</Text>}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.smallButton} onPress={handleRemoveWater}>
            <Ionicons name="remove" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.waterButton} onPress={handleAddWater} activeOpacity={0.8}>
            <Svg width={80} height={90}>
              <Defs>
                <SvgGradient id="cupGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4FC3F7" />
                  <Stop offset="100%" stopColor="#0288D1" />
                </SvgGradient>
              </Defs>
              <Path d="M10 0 L70 0 L65 80 Q40 95 15 80 Z" fill="url(#cupGradient)" stroke="#0277BD" strokeWidth={2} />
            </Svg>
            <Ionicons name="add" size={32} color="white" style={styles.dropIcon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButton} onPress={() => openModal("water", waterPerDrink)}>
            <Ionicons name="water-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Input Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.inputModal}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputTitle}>
                {modalType === "goal" ? "Set Goal (ml)" : "Set Water Per Drink (ml)"}
              </Text>
            </View>
            <View style={styles.inputBody}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="number-pad"
                style={styles.textInput}
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveInput}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", textAlign: "center" },
  content: { flex: 1, alignItems: "center", paddingTop: 20 },
  todayText: { textAlign: "center", fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 10 },
  statsButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  statsButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  waveContainer: { width: "100%", alignItems: "center", justifyContent: "center", flex: 1 },
  waterTank: { width: "80%", height: 300, borderRadius: 25, overflow: "hidden", backgroundColor: "#E0F2F7" },
  overlayCenter: { position: "absolute", top: "45%", alignItems: "center" },
  percentText: { fontSize: 36, fontWeight: "800", color: "#01579B" },
  goalButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#0288D1", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 10 },
  goalText: { color: "#fff", fontWeight: "600" },
  messageContainer: { marginTop: 15, alignItems: "center" },
  messageText: { fontSize: 18, fontWeight: "600", textAlign: "center", marginBottom: 20 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-evenly", width: "100%", marginBottom: 40, marginTop: 20 },
  smallButton: { backgroundColor: "#039BE5", padding: 14, borderRadius: 30 },
  waterButton: { width: 80, height: 90, alignItems: "center", justifyContent: "center" },
  dropIcon: { position: "absolute", top: 28 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "95%", backgroundColor: "#fff", borderRadius: 15, padding: 15, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15, textAlign: "center" },
  noDataText: { textAlign: "center", color: "#6b7280", marginVertical: 20 },
  closeButton: { alignSelf: "center", marginTop: 20, backgroundColor: "#2563eb", paddingHorizontal: 25, paddingVertical: 10, borderRadius: 10 },
  closeButtonText: { color: "#fff", fontWeight: "600" },
  chart: { borderRadius: 12, paddingRight: 20 },
  inputModal: { width: 300, backgroundColor: "#fff", borderRadius: 15, overflow: "hidden" },
  inputHeader: { backgroundColor: "#3b82f6", paddingVertical: 12 },
  inputTitle: { fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center" },
  inputBody: { padding: 20 },
  textInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  inputButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 15 },
  cancelButton: { marginRight: 10, backgroundColor: "#ef4444", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  saveButton: { backgroundColor: "#22c55e", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});