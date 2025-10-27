import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Progress from "react-native-progress";
import { Svg, Rect, Line, Text as TextSVG } from "react-native-svg";

const screenWidth = Dimensions.get("window").width;

export default function NutritionScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Định nghĩa kiểu dữ liệu cho một món ăn
  interface Meal {
    name: string;
    fat: number;
    protein: number;
    carbs: number;
    kcal: number;
    quantity?: number; // số lượng món ăn được chọn
  }

  // --- State chính ---
  const [goalCalories, setGoalCalories] = useState(2000); // mục tiêu kcal trong ngày
  const [consumedCalories, setConsumedCalories] = useState(0); // tổng kcal đã ăn
  const [fat, setFat] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);

  const [modalVisible, setModalVisible] = useState(false); // mở/đóng modal chọn món ăn
  const [selectedMeals, setSelectedMeals] = useState<Meal[]>([]); // danh sách món đang chọn
  const [addedMeals, setAddedMeals] = useState<Meal[]>([]); // danh sách món đã thêm xong

  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  // Hiệu ứng mờ dần khi vào màn hình
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // --- Tính toán mục tiêu theo macro ---
  const fatGoal = Math.round((goalCalories * 0.3) / 9); // 30% năng lượng từ fat
  const proteinGoal = Math.round((goalCalories * 0.3) / 4); // 30% từ protein
  const carbGoal = Math.round((goalCalories * 0.4) / 4); // 40% từ carbs

  // Tính phần trăm đã đạt so với mục tiêu
  const fatPercent = fatGoal > 0 ? fat / fatGoal : 0;
  const proteinPercent = proteinGoal > 0 ? protein / proteinGoal : 0;
  const carbPercent = carbGoal > 0 ? carbs / carbGoal : 0;
  const progress = goalCalories > 0 ? consumedCalories / goalCalories : 0;

  /**
   * 📊 Hàm getStatus(percent)
   * → Trả về trạng thái “Lack / Enough / Surplus” theo phần trăm dinh dưỡng
   */
  const getStatus = (percent) => {
    if (percent < 0.9) return { text: "Lack", color: "#facc15" }; // thiếu
    if (percent <= 1.1) return { text: "Enough", color: "#22c55e" }; // đủ
    return { text: "Surplus", color: "#ef4444" }; // dư
  };

  // --- Danh sách dinh dưỡng để hiển thị ---
  const nutrients = [
    {
      name: "Fat",
      grams: fat,
      goal: fatGoal,
      percent: fatPercent,
      color: "#60a5fa",
    },
    {
      name: "Protein",
      grams: protein,
      goal: proteinGoal,
      percent: proteinPercent,
      color: "#c084fc",
    },
    {
      name: "Carbs",
      grams: carbs,
      goal: carbGoal,
      percent: carbPercent,
      color: "#f87171",
    },
  ];

  // --- Danh sách món ăn mẫu ---
  const foodList = [
    { name: "Cơm tấm sườn bì chả", fat: 20, protein: 25, carbs: 55, kcal: 520 },
    { name: "Phở bò", fat: 8, protein: 28, carbs: 45, kcal: 380 },
    { name: "Bún chả", fat: 15, protein: 24, carbs: 40, kcal: 420 },
    { name: "Bánh mì trứng", fat: 10, protein: 13, carbs: 35, kcal: 300 },
    { name: "Bánh cuốn", fat: 6, protein: 10, carbs: 40, kcal: 260 },
    { name: "Xôi gà", fat: 14, protein: 20, carbs: 50, kcal: 430 },
    {
      name: "Cơm chiên dương châu",
      fat: 18,
      protein: 22,
      carbs: 60,
      kcal: 500,
    },
    { name: "Mì xào bò", fat: 16, protein: 26, carbs: 55, kcal: 480 },
    { name: "Cháo gà", fat: 5, protein: 18, carbs: 30, kcal: 250 },
    { name: "Bánh xèo", fat: 18, protein: 14, carbs: 35, kcal: 410 },
  ];

  /**
   * ✅ toggleSelectMeal(meal)
   * → Khi nhấn chọn hoặc bỏ chọn một món ăn trong danh sách
   * - Nếu món đã có trong selectedMeals → bỏ chọn
   * - Nếu chưa có → thêm vào danh sách selectedMeals (với quantity = 1)
   */
  const toggleSelectMeal = (meal) => {
    const exists = selectedMeals.find((m) => m.name === meal.name);
    if (exists) {
      // Bỏ chọn món
      setSelectedMeals(selectedMeals.filter((m) => m.name !== meal.name));
    } else {
      // Thêm món mới
      setSelectedMeals([...selectedMeals, { ...meal, quantity: 1 }]);
    }
  };

  /**
   * 🔢 updateQuantity(mealName, qty)
   * → Cập nhật lại số lượng cho món ăn trong selectedMeals
   * @param mealName - tên món cần cập nhật
   * @param qty - số lượng mới (tối thiểu 1)
   */
  const updateQuantity = (mealName, qty) => {
    setSelectedMeals((prev) =>
      prev.map((m) =>
        m.name === mealName ? { ...m, quantity: Number(qty) || 1 } : m
      )
    );
  };

  /**
   * 🍽️ addSelectedMeals()
   * → Khi nhấn nút "Add Selected Meals"
   * - Cộng tổng các macro và kcal của tất cả món đã chọn
   * - Thêm các món này vào danh sách `addedMeals`
   * - Reset selectedMeals và đóng modal
   */
  const addSelectedMeals = () => {
    let totalFat = 0,
      totalProtein = 0,
      totalCarbs = 0,
      totalKcal = 0;

    selectedMeals.forEach((m) => {
      totalFat += m.fat * m.quantity;
      totalProtein += m.protein * m.quantity;
      totalCarbs += m.carbs * m.quantity;
      totalKcal += m.kcal * m.quantity;
    });

    // Cộng dồn vào tổng hiện tại
    setFat(fat + totalFat);
    setProtein(protein + totalProtein);
    setCarbs(carbs + totalCarbs);
    setConsumedCalories(consumedCalories + totalKcal);

    // Lưu vào danh sách món đã thêm
    setAddedMeals([...addedMeals, ...selectedMeals]);
    setSelectedMeals([]); // reset
    setModalVisible(false);
  };

  /**
   * 🗑️ removeMeal(index)
   * → Xóa 1 món khỏi danh sách Added Meals
   * - Tự động trừ ngược lại lượng macro và kcal tương ứng
   */
  const removeMeal = (index) => {
    const mealToRemove = addedMeals[index];
    if (!mealToRemove) return;

    const totalFat = mealToRemove.fat * mealToRemove.quantity;
    const totalProtein = mealToRemove.protein * mealToRemove.quantity;
    const totalCarbs = mealToRemove.carbs * mealToRemove.quantity;
    const totalKcal = mealToRemove.kcal * mealToRemove.quantity;

    // Trừ lại dinh dưỡng
    setFat((prev) => prev - totalFat);
    setProtein((prev) => prev - totalProtein);
    setCarbs((prev) => prev - totalCarbs);
    setConsumedCalories((prev) => prev - totalKcal);

    // Cập nhật danh sách
    const updated = [...addedMeals];
    updated.splice(index, 1);
    setAddedMeals(updated);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header với nút Back */}
        <LinearGradient
          colors={["#86efac", "#4ade80", "#22c55e"]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nutrition</Text>
            <View style={{ width: 26 }} />
          </View>
        </LinearGradient>

        {/* Nội dung chính */}
        <View style={styles.content}>
          <Text style={styles.infoText}>
            You have consumed{"\n"}
            <Text style={styles.highlightText}>
              {consumedCalories} kcal
            </Text>{" "}
            today
          </Text>

          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => setShowStats(true)}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#fff" />
            <Text style={styles.viewStatsText}> View Stats</Text>
          </TouchableOpacity>

          {/* Biểu đồ vòng tròn hiển thị % kcal */}
          <View style={styles.progressContainer}>
            {/* Chọn màu dựa vào progress */}
            {(() => {
              let circleColor = "#22c55e"; // mặc định xanh lá
              let textColor = "#22c55e";

              if (progress >= 0.9 && progress <= 1.1) {
                circleColor = "#22c55e"; // xanh
                textColor = "#22c55e";
              } else if (progress > 1.1) {
                circleColor = "#ef4444"; // đỏ
                textColor = "#ef4444";
              } else if (progress < 0.9) {
                circleColor = "#22c55e"; // vẫn xanh nhưng bạn có thể đổi màu khác
                textColor = "#374151"; // màu tối cho % khi chưa đạt 90%
              }

              return (
                <>
                  <Progress.Circle
                    size={200}
                    progress={progress}
                    thickness={14}
                    color={circleColor}
                    unfilledColor="#e5e7eb"
                    borderWidth={0}
                  />
                  <View style={styles.centerTextContainer}>
                    <Text style={[styles.percentText, { color: textColor }]}>
                      {Math.round(progress * 100)}%
                    </Text>
                    <Text style={styles.goalText}>of {goalCalories} kcal</Text>
                  </View>
                </>
              );
            })()}
          </View>

          {/* Ô nhập mục tiêu kcal */}
          <View style={styles.goalInputContainer}>
            <Text style={styles.goalLabel}>Set your goal:</Text>
            <TextInput
              style={styles.goalInput}
              keyboardType="numeric"
              value={String(goalCalories)}
              onChangeText={(text) => setGoalCalories(Number(text) || 0)}
            />
            <Text style={styles.goalUnit}>kcal</Text>
          </View>

          {/* Thông tin dinh dưỡng */}
          <View style={styles.statsContainer}>
            {nutrients.map((item, index) => {
              const status = getStatus(item.percent);
              return (
                <View key={index} style={styles.statBlock}>
                  <View style={styles.statHeader}>
                    <View
                      style={[styles.dot, { backgroundColor: item.color }]}
                    />
                    <Text style={styles.statText}>{item.name}</Text>
                    <Text style={styles.statValue}>
                      {item.grams}/{item.goal}g
                    </Text>
                    <Text style={[styles.statPercent, { color: status.color }]}>
                      {Math.round(item.percent * 100)}% ({status.text})
                    </Text>
                  </View>
                  <Progress.Bar
                    progress={item.percent}
                    color={item.color}
                    unfilledColor="#e5e7eb"
                    borderWidth={0}
                    width={null}
                    height={8}
                    borderRadius={5}
                  />
                </View>
              );
            })}
          </View>

          {/* Danh sách món đã thêm */}
          {addedMeals.length > 0 && (
            <View style={styles.addedMealsContainer}>
              <Text style={styles.addedTitle}>Added Meals</Text>
              {addedMeals.map((m, i) => (
                <View key={i} style={styles.addedMealCard}>
                  <View style={styles.addedMealLeft}>
                    <Ionicons
                      name="restaurant-outline"
                      size={22}
                      color="#16a34a"
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.addedMealName}>{m.name}</Text>
                      <Text style={styles.addedMealSub}>
                        {m.kcal * m.quantity} kcal • Fat {m.fat * m.quantity}g •
                        Protein {m.protein * m.quantity}g
                      </Text>
                    </View>
                  </View>

                  {/* Hiển thị số lượng + nút xóa */}
                  <View style={styles.addedMealRight}>
                    <Text style={styles.addedMealQtyText}>×{m.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => removeMeal(i)}
                      style={styles.deleteButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Nút mở modal thêm món */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="restaurant-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}> Add meals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal chọn món */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>Select Meals</Text>
            </View>

            {/* Danh sách món */}
            <FlatList
              data={foodList}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => {
                const selected = selectedMeals.find(
                  (m) => m.name === item.name
                );
                return (
                  <View
                    style={[
                      styles.mealItem,
                      selected && { backgroundColor: "#f0fdf4" },
                    ]}
                  >
                    {/* Nhấn chọn món */}
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => toggleSelectMeal(item)}
                    >
                      <Text style={styles.mealName}>{item.name}</Text>
                      <Text style={styles.mealDetail}>
                        Fat: {item.fat}g | Protein: {item.protein}g | Carbs:{" "}
                        {item.carbs}g | {item.kcal} kcal
                      </Text>
                    </TouchableOpacity>

                    {/* Nút tăng/giảm số lượng */}
                    {selected && (
                      <View style={styles.qtyContainer}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() =>
                            updateQuantity(
                              item.name,
                              Math.max((selected.quantity || 1) - 1, 1)
                            )
                          }
                        >
                          <Ionicons
                            name="remove-circle-outline"
                            size={22}
                            color="#ef4444"
                          />
                        </TouchableOpacity>

                        <Text style={styles.qtyText}>{selected.quantity}</Text>

                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() =>
                            updateQuantity(
                              item.name,
                              (selected.quantity || 1) + 1
                            )
                          }
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={22}
                            color="#22c55e"
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />

            {/* Nút xác nhận */}
            {selectedMeals.length > 0 && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={addSelectedMeals}
              >
                <Text style={styles.confirmButtonText}>Add Selected Meals</Text>
              </TouchableOpacity>
            )}

            {/* Nút đóng modal */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 📊 Modal thống kê */}
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
            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("daily")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginHorizontal: 5,
                  backgroundColor:
                    activeTab === "daily" ? "#22c55e" : "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: activeTab === "daily" ? "#fff" : "#374151",
                    fontWeight: "600",
                  }}
                >
                  Last 10 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("monthly")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginHorizontal: 5,
                  backgroundColor:
                    activeTab === "monthly" ? "#22c55e" : "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: activeTab === "monthly" ? "#fff" : "#374151",
                    fontWeight: "600",
                  }}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg width={activeTab === "daily" ? 900 : 1200} height={300}>
                {(() => {
                  const goal = 2000;
                  const chartHeight = 220;
                  const baseY = 260;
                  const barWidth = 40;
                  const gap = 40;
                  const startX = 80;

                  let days: string[] = [];
                  let values: number[] = [];

                  if (activeTab === "daily") {
                    // Dữ liệu 10 ngày gần nhất
                    days = [
                      "10/17",
                      "10/18",
                      "10/19",
                      "10/20",
                      "10/21",
                      "10/22",
                      "10/23",
                      "10/24",
                      "10/25",
                      "10/26",
                    ];
                    values = [
                      1800, 2100, 1500, 2200, 2000, 1700, 2500, 1900, 2300,
                      1850,
                    ];
                  } else {
                    // 🧮 Dữ liệu theo tháng (sửa thành kcal trung bình/ngày)
                    const monthlyData = [
                      { month: "Jan", total: 48000, days: 31 },
                      { month: "Feb", total: 52000, days: 29 },
                      { month: "Mar", total: 47000, days: 31 },
                      { month: "Apr", total: 56000, days: 30 },
                      { month: "May", total: 53000, days: 31 },
                      { month: "Jun", total: 59000, days: 30 },
                      { month: "Jul", total: 61000, days: 31 },
                      { month: "Aug", total: 58000, days: 31 },
                      { month: "Sep", total: 60000, days: 30 },
                      { month: "Oct", total: 55000, days: 31 },
                    ];
                    days = monthlyData.map((m) => m.month);
                    values = monthlyData.map((m) =>
                      Math.round(m.total / m.days)
                    ); // ✅ kcal trung bình/ngày
                  }

                  const maxVal = Math.max(...values, goal) * 1.1;
                  const goalY = baseY - (goal / maxVal) * chartHeight;
                  const yLabels = [
                    0,
                    Math.round(maxVal / 4),
                    Math.round((maxVal / 4) * 2),
                    Math.round((maxVal / 4) * 3),
                    Math.round(maxVal),
                  ];

                  return (
                    <>
                      {/* Trục Y */}
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
                            <Line
                              x1={50}
                              y1={y}
                              x2={1200}
                              y2={y}
                              stroke="#e5e7eb"
                              strokeDasharray="4,4"
                              strokeWidth={1}
                            />
                          </React.Fragment>
                        );
                      })}

                      {/* Mức mục tiêu */}
                      <Line
                        x1={50}
                        y1={goalY}
                        x2={1200}
                        y2={goalY}
                        stroke="#94a3b8"
                        strokeDasharray="6,4"
                        strokeWidth={2}
                      />
                      <TextSVG
                        x={-5}
                        y={goalY + 5}
                        fontSize="20"
                        fill="#22c55e"
                      >
                        🏅
                      </TextSVG>

                      {/* Cột dữ liệu */}
                      {values.map((val, i) => {
                        const x = startX + i * (barWidth + gap);
                        const h = (val / maxVal) * chartHeight;
                        const y = baseY - h;
                        const reachedGoal = val >= goal;
                        return (
                          <React.Fragment key={i}>
                            <Rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx={barWidth / 2}
                              fill={reachedGoal ? "#16a34a" : "#86efac"}
                            />
                            <TextSVG
                              x={x + barWidth / 2}
                              y={y - 6}
                              fontSize="12"
                              fontWeight="bold"
                              fill="#000"
                              textAnchor="middle"
                            >
                              {val}
                            </TextSVG>
                            <TextSVG
                              x={x + barWidth / 2}
                              y={baseY + 18}
                              fontSize="11"
                              fill="#000"
                              textAnchor="middle"
                            >
                              {days[i]}
                            </TextSVG>
                          </React.Fragment>
                        );
                      })}
                    </>
                  );
                })()}
              </Svg>
            </ScrollView>

            {/* Nút Close */}
            <TouchableOpacity
              onPress={() => setShowStats(false)}
              style={{
                alignSelf: "center",
                marginTop: 10,
                backgroundColor: "#22c55e",
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
    </Animated.View>
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
  content: { alignItems: "center", paddingHorizontal: 20, paddingTop: 20 },
  infoText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },
  highlightText: { color: "#22c55e", fontWeight: "800", fontSize: 22 },
  progressContainer: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTextContainer: { position: "absolute", alignItems: "center" },
  percentText: { fontSize: 28, fontWeight: "700", color: "#111827" },
  goalText: { color: "#6b7280", fontSize: 14 },
  goalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
  },
  goalLabel: {
    fontSize: 16,
    color: "#374151",
    marginRight: 8,
    fontWeight: "600",
  },
  goalInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 80,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  goalUnit: { fontSize: 16, marginLeft: 6, color: "#6b7280" },
  statsContainer: {
    width: "100%",
    marginTop: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    elevation: 2,
  },
  statBlock: { marginBottom: 12 },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statText: { flex: 1, fontSize: 16, color: "#374151", fontWeight: "500" },
  statValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginRight: 10,
  },
  statPercent: {
    fontSize: 15,
    fontWeight: "600",
    width: 120,
    textAlign: "right",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    // backgroundColor: "#6366f1",
    backgroundColor: "#22c55e",

    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  addButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  mealName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  mealDetail: { fontSize: 14, color: "#6b7280" },
  qtyInput: {
    width: 45,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    textAlign: "center",
    paddingVertical: 3,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#ef4444",
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  addedMealsContainer: {
    marginTop: 25,
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    elevation: 2,
  },
  addedTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  addedMealItem: { fontSize: 15, color: "#374151", marginBottom: 4 },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyButton: {
    paddingHorizontal: 2,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    minWidth: 20,
    textAlign: "center",
  },

  // phần Added Meals được làm đẹp
  addedMealCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  addedMealLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  addedMealName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
  addedMealSub: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 2,
  },
  addedMealQty: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addedMealQtyText: {
    color: "#15803d",
    fontWeight: "700",
    fontSize: 15,
  },
  addedMealRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  deleteButton: {
    padding: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  viewStatsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  viewStatsText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 5,
  },
  tabButtonActive: { backgroundColor: "#22c55e" },
  tabText: { color: "#374151", fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
});
