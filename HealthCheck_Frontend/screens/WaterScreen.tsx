import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
import { BarChart } from "react-native-chart-kit";
import { ScrollView } from "react-native";
import {
  Rect,
  Text as TextSVG,
  Line,
  Circle,
  Image as SvgImage,
} from "react-native-svg";

const { width } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function WaterScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  // Fade-in
  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // ---- Logic nước ----
  const [goal, setGoal] = useState(2000);
  const [waterPerDrink, setWaterPerDrink] = useState(250);
  const [currentWater, setCurrentWater] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(""); // "goal" hoặc "water"
  const [inputValue, setInputValue] = useState("");
  const [showStats, setShowStats] = useState(false);

  const progress = useSharedValue(0);
  const wavePhase = useSharedValue(0);

  useEffect(() => {
    wavePhase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 4000 }),
      -1
    );
  }, []);

  useEffect(() => {
    progress.value = withTiming(currentWater / goal, { duration: 800 });
  }, [currentWater, goal]);

  const handleAddWater = () =>
    setCurrentWater((prev) => Math.min(prev + waterPerDrink, goal));
  const handleRemoveWater = () =>
    setCurrentWater((prev) => Math.max(prev - waterPerDrink, 0));

  const openModal = (type: "goal" | "water", current: number) => {
    setModalType(type);
    setInputValue(current.toString());
    setModalVisible(true);
  };

  const handleSaveInput = () => {
    const val = parseInt(inputValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert("⚠️ Invalid input", "Please enter a valid number!");
      return;
    }
    if (modalType === "goal") setGoal(val);
    else if (modalType === "water") setWaterPerDrink(val);
    setModalVisible(false);
  };

  // Sóng nước
  const tankHeight = 300;
  const amplitude = 12;
  const animatedProps = useAnimatedProps(() => {
    const points = [];
    const step = 10;
    const waterLevel = tankHeight - tankHeight * progress.value;
    for (let x = 0; x <= width * 0.8; x += step) {
      const y =
        amplitude *
          Math.sin((x / (width * 0.8)) * 4 * Math.PI + wavePhase.value) +
        waterLevel;
      points.push(`${x},${y}`);
    }
    const d = `M0,${tankHeight} L${points.join(" ")} L${
      width * 0.8
    },${tankHeight} Z`;
    return { d };
  });

  const percent = Math.round((currentWater / goal) * 100);

  return (
    <RNAnimated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient
        colors={["#60a5fa", "#3b82f6", "#2563eb"]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Water</Text>
          <View style={{ width: 26 }} />
        </View>
      </LinearGradient>

      {/* Nội dung */}
      <View style={styles.content}>
        <Text style={styles.todayText}>
          Today you drank{"\n"}
          <Text style={{ color: "#3b82f6", fontWeight: "700" }}>
            {currentWater} ml
          </Text>{" "}
          water
        </Text>

        {/* Nút thống kê */}
        <TouchableOpacity
          style={{
            backgroundColor: "#3b82f6",
            paddingVertical: 8,
            paddingHorizontal: 18,
            borderRadius: 20,
            marginBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            marginTop: 20,
          }}
          onPress={() => setShowStats(true)}
        >
          <Ionicons
            name="stats-chart-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            View Statistics
          </Text>
        </TouchableOpacity>

        {/* Stats Modal */}
        <Modal visible={showStats} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "95%",
                backgroundColor: "#fff",
                borderRadius: 15,
                padding: 15,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                📊 Last 10 Days Statistics
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg width={900} height={300}>
                  {/* Fake data for demo */}
                  {(() => {
                    const days = ["10/22", "10/23", "10/24", "10/25", "Today"];
                    const values = [3200, 0, 400, 1341, 181];
                    const goal = 2000;
                    const maxVal = Math.max(...values, goal) + 400; // 3600–3800 range
                    const chartHeight = 220;
                    const baseY = 260;
                    const barWidth = 40;
                    const gap = 40; // closer columns

                    const startX = 80; // leave space for Y-axis numbers

                    // Calculate goal line position
                    const goalY = baseY - (goal / maxVal) * chartHeight;

                    // Y-axis labels
                    const yLabels = [0, 960, 1920, 2880, 3840];

                    return (
                      <>
                        {/* Y-Axis numbers */}
                        {yLabels.map((val) => {
                          const y = baseY - (val / maxVal) * chartHeight;
                          return (
                            <React.Fragment key={val}>
                              <TextSVG
                                x={20}
                                y={y + 4}
                                fontSize="11"
                                fill="#4b5563"
                                textAnchor="start"
                              >
                                {val}
                              </TextSVG>
                              {/* dashed grid line */}
                              <Line
                                x1={50}
                                y1={y}
                                x2={860}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeDasharray="4,4"
                                strokeWidth={1}
                              />
                            </React.Fragment>
                          );
                        })}

                        {/* Goal line */}
                        <Line
                          x1={50}
                          y1={goalY}
                          x2={860}
                          y2={goalY}
                          stroke="#94a3b8"
                          strokeDasharray="6,4"
                          strokeWidth={2}
                        />
                        <TextSVG
                          x={-5}
                          y={goalY + 5}
                          fontSize="20"
                          fill="#2563eb"
                        >
                          🏅
                        </TextSVG>

                        {/* Bars */}
                        {values.map((val, i) => {
                          const x = startX + i * (barWidth + gap);
                          const h = (val / maxVal) * chartHeight;
                          const y = baseY - h;
                          const reachedGoal = val >= goal;

                          return (
                            <React.Fragment key={i}>
                              {/* Bar */}
                              <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={h}
                                rx={barWidth / 2}
                                fill={reachedGoal ? "#059669" : "#6ee7b7"}
                              />

                              {/* Value label */}
                              <TextSVG
                                x={x + barWidth / 2}
                                y={y - 8}
                                fontSize="12"
                                fontWeight="bold"
                                fill="#000"
                                textAnchor="middle"
                              >
                                {val}
                              </TextSVG>

                              {/* Day label */}
                              <TextSVG
                                x={x + barWidth / 2}
                                y={baseY + 18}
                                fontSize="11"
                                fill="#000"
                                textAnchor="middle"
                              >
                                {days[i]}
                              </TextSVG>

                              {/* Medal / skull icon */}
                              <TextSVG
                                x={x + barWidth / 2}
                                y={baseY + 35}
                                fontSize="16"
                                textAnchor="middle"
                              >
                                {reachedGoal ? "🏅" : "❌"}
                              </TextSVG>
                            </React.Fragment>
                          );
                        })}
                      </>
                    );
                  })()}
                </Svg>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setShowStats(false)}
                style={{
                  alignSelf: "center",
                  marginTop: 10,
                  backgroundColor: "#2563eb",
                  paddingHorizontal: 25,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
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
              <AnimatedPath
                animatedProps={animatedProps}
                fill="url(#waveGradient)"
              />
            </Svg>
          </View>

          {/* Overlay % và Goal */}
          <View style={styles.overlayCenter}>
            <Text style={styles.percentText}>{percent}%</Text>
            <TouchableOpacity
              style={styles.goalButton}
              onPress={() => openModal("goal", goal)}
            >
              <Ionicons name="trophy-outline" size={22} color="#fff" />
              <Text style={styles.goalText}> Goal: {goal} ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message dưới bình */}
        <View style={styles.messageContainer}>
          {percent === 0 && (
            <Text style={styles.messageText}>
              💧 Keep going! Drink more water!
            </Text>
          )}
          {percent > 0 && percent <= 30 && (
            <Text style={styles.messageText}>
              💧 Keep going! Drink more water!
            </Text>
          )}
          {percent > 30 && percent <= 70 && (
            <Text style={styles.messageText}>
              🌟 Almost there, keep sipping!
            </Text>
          )}
          {percent > 70 && percent < 100 && (
            <Text style={styles.messageText}>👏 Great job, nearly done!</Text>
          )}
          {percent === 100 && (
            <Text style={styles.messageText}>
              🏆 Congratulations! {"\n"} You reached your goal!
            </Text>
          )}
        </View>

        {/* Nút điều khiển */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={handleRemoveWater}
          >
            <Ionicons name="remove" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.waterButton}
            onPress={handleAddWater}
            activeOpacity={0.8}
          >
            <Svg width={80} height={90}>
              <Defs>
                <SvgGradient id="cupGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4FC3F7" />
                  <Stop offset="100%" stopColor="#0288D1" />
                </SvgGradient>
              </Defs>
              <Path
                d="M10 0 L70 0 L65 80 Q40 95 15 80 Z"
                fill="url(#cupGradient)"
                stroke="#0277BD"
                strokeWidth={2}
              />
            </Svg>
            <Ionicons
              name="add"
              size={32}
              color="white"
              style={styles.dropIcon}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => openModal("water", waterPerDrink)}
          >
            <Ionicons name="water-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal nhập số */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 300,
              backgroundColor: "#fff",
              borderRadius: 15,
              overflow: "hidden",
            }}
          >
            {/* Header màu xanh dương */}
            <View
              style={{
                backgroundColor: "#3b82f6",
                paddingVertical: 12,
                borderTopLeftRadius: 15,
                borderTopRightRadius: 15,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                {modalType === "goal"
                  ? "Set Goal (ml)"
                  : "Set Water Per Drink (ml)"}
              </Text>
            </View>

            {/* Nội dung modal */}
            <View style={{ padding: 20 }}>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="number-pad"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 16,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 15,
                }}
              >
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    marginRight: 10,
                    backgroundColor: "#ef4444", // đỏ
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveInput}
                  style={{
                    backgroundColor: "#22c55e", // xanh lá
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    Save
                  </Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  content: { flex: 1, alignItems: "center", paddingTop: 20 },
  todayText: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  waveContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center", // đặt vào giữa theo chiều dọc
    flex: 1,
  },
  waterTank: {
    width: "80%",
    height: 300,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#E0F2F7",
  },
  overlayCenter: {
    position: "absolute",
    top: "45%", // đặt lên trên bình khoảng 1/3 màn hình
    alignItems: "center",
  },
  percentText: { fontSize: 36, fontWeight: "800", color: "#01579B" },
  goalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0288D1",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  goalText: { color: "#fff", fontWeight: "600" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: "100%",
    marginBottom: 40,
    marginTop: 20,
  },
  smallButton: { backgroundColor: "#039BE5", padding: 14, borderRadius: 30 },
  waterButton: {
    width: 80,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  dropIcon: { position: "absolute", top: 28 },
  messageContainer: {
    marginTop: 15,
    alignItems: "center",
  },
  messageText: {
    fontSize: 18,
    fontWeight: "600",
    // color: "#0288D1",
    textAlign: "center",
    marginBottom: 20,
  },
});
