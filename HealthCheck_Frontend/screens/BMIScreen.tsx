import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Svg, { Rect, Line, Text as TextSVG } from "react-native-svg";

const screenWidth = Dimensions.get("window").width;

export default function BMIScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade-in effect cho toàn màn hình
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const latestBMI = 23.6;

  // 🧮 Giả sử có 10 bản ghi gần nhất
  const [bmiRecords, setBmiRecords] = useState<number[]>([
     19.7, 21.0, 22.8, 23.6, 24.1, 25.3, 26.0, 28.2, 30.0,
  ]);

  const [labels, setLabels] = useState<string[]>([
    "10/18",
    "10/19",
    "10/20",
    "10/21",
    "10/22",
    "10/23",
    "10/24",
    "10/25",
    "10/26",
  ]);

  const maxBMI = Math.max(...bmiRecords);
  const minBMI = Math.min(...bmiRecords);
  const avgBMI = (bmiRecords.reduce((a, b) => a + b, 0) / bmiRecords.length).toFixed(1);

  // 🟩 Màu cột dựa theo mức độ BMI
  const getBMIColor = (bmi: number) => {
    if (bmi < 18.5) return "#60a5fa"; // xanh dương nhạt (gầy)
    if (bmi < 25) return "#22c55e"; // xanh lá (bình thường)
    if (bmi < 30) return "#facc15"; // vàng (thừa cân)
    return "#ef4444"; // đỏ (béo phì)
  };

  // ===========================
  // 🧩 FORM ADD NEW BMI RECORD
  // ===========================
  const [modalType, setModalType] = useState<"weight" | "height" | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState<string>("");

  // Modal xác nhận lưu record
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Tính BMI và trạng thái dựa vào weight và height
  useEffect(() => {
    if (weight && height) {
      const value = weight / (height / 100) ** 2;
      setBmi(value);

      if (value < 18.5) setBmiStatus("Underweight");
      else if (value < 25) setBmiStatus("Normal");
      else if (value < 30) setBmiStatus("Overweight");
      else setBmiStatus("Obese");
    } else {
      setBmi(null);
      setBmiStatus("");
    }
  }, [weight, height]);

  const bmiRanges = [
    { min: 0, max: 18.5, color: "#60a5fa", label: "Underweight", range: "<18.5" },
    { min: 18.5, max: 25, color: "#22c55e", label: "Normal", range: "18.5–24.9" },
    { min: 25, max: 30, color: "#facc15", label: "Overweight", range: "25–29.9" },
    { min: 30, max: 999, color: "#ef4444", label: "Obese", range: "≥30" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Underweight":
        return "#60a5fa";
      case "Normal":
        return "#22c55e";
      case "Overweight":
        return "#facc15";
      case "Obese":
        return "#ef4444";
      default:
        return "#374151";
    }
  };

  const values = Array.from(
    { length: modalType === "weight" ? 121 : 81 },
    (_, i) => (modalType === "weight" ? i + 30 : i + 130)
  );

  // 🔹 Hàm làm đậm màu cho viền highlight
  const darkenColor = (hex: string, amount: number) => {
    let col = hex.replace("#", "");
    if (col.length === 3)
      col = col.split("").map((c) => c + c).join("");
    const num = parseInt(col, 16);
    let r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
    let g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
    let b = Math.max(0, (num & 0xff) * (1 - amount));
    return (
      "#" +
      ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
        .toString(16)
        .slice(1)
    );
  };

  // 🔹 Xử lý lưu record BMI
  const handleSaveRecord = () => {
    if (!weight || !height) {
      Alert.alert(
        "Incomplete Data",
        "Please select both weight and height before saving."
      );
      return;
    }
    setConfirmModalVisible(true);
  };

  // 🔹 Xác nhận lưu BMI mới và cập nhật biểu đồ
  const confirmSave = () => {
    setConfirmModalVisible(false);

    if (bmi !== null) {
      // Thêm bản ghi BMI mới vào cuối danh sách
      setBmiRecords((prev) => [...prev, bmi]);
      // Tạo nhãn mới, ví dụ tự động lấy ngày hôm nay
      const today = new Date();
      const newLabel = `${today.getMonth() + 1}/${today.getDate()}`;
      setLabels((prev) => [...prev, newLabel]);

      Alert.alert("Success", "BMI record has been saved!");
      // Reset weight & height sau khi lưu
      setWeight(null);
      setHeight(null);
    }
  };

  // ===========================

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient
        colors={["#fde68a", "#facc15", "#eab308"]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BMI</Text>
          <View style={{ width: 26 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.infoText}>
            Your latest BMI record is{" "}
            <Text style={styles.highlightText}>{latestBMI}</Text>
          </Text>

          {/* 📊 Biểu đồ BMI */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Last 10 BMI Records</Text>

            <Text style={styles.statText}>
              Max: <Text style={{ color: "#ef4444" }}>{maxBMI}</Text> | Min:{" "}
              <Text style={{ color: "#60a5fa" }}>{minBMI}</Text> | Avg:{" "}
              <Text style={{ color: "#22c55e" }}>{avgBMI}</Text>
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg width={900} height={300}>
                {(() => {
                  const chartHeight = 200;
                  const baseY = 250;
                  const barWidth = 40;
                  const gap = 40;
                  const startX = 80;

                  const maxVal = Math.max(...bmiRecords, 35);
                  const yLabels = [0, 10, 20, 30, 40];

                  return (
                    <>
                      {/* Vẽ các đường ngang và nhãn Y */}
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
                              x2={900}
                              y2={y}
                              stroke="#e5e7eb"
                              strokeDasharray="4,4"
                              strokeWidth={1}
                            />
                          </React.Fragment>
                        );
                      })}

                      {/* Vẽ cột BMI */}
                      {bmiRecords.map((val, i) => {
                        const x = startX + i * (barWidth + gap);
                        const h = (val / maxVal) * chartHeight;
                        const y = baseY - h;
                        return (
                          <React.Fragment key={i}>
                            <Rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={h}
                              rx={barWidth / 2}
                              fill={getBMIColor(val)}
                            />
                            <TextSVG
                              x={x + barWidth / 2}
                              y={y - 6}
                              fontSize="12"
                              fontWeight="bold"
                              fill="#000"
                              textAnchor="middle"
                            >
                              {val.toFixed(1)}
                            </TextSVG>
                            <TextSVG
                              x={x + barWidth / 2}
                              y={baseY + 18}
                              fontSize="11"
                              fill="#000"
                              textAnchor="middle"
                            >
                              {labels[i]}
                            </TextSVG>
                          </React.Fragment>
                        );
                      })}
                    </>
                  );
                })()}
              </Svg>
            </ScrollView>
          </View>

          {/* 🧩 Add BMI Record Section */}
          <View style={styles.addSection}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Text style={styles.sectionTitle}>Add New BMI Record</Text>
            </View>

            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorButton, styles.grayButton]}
                onPress={() => setModalType("weight")}
              >
                <Text style={styles.grayText}>
                  {weight ? `${weight} kg` : "Select Weight"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectorButton, styles.grayButton]}
                onPress={() => setModalType("height")}
              >
                <Text style={styles.grayText}>
                  {height ? `${height} cm` : "Select Height"}
                </Text>
              </TouchableOpacity>
            </View>

            {bmi && (
              <View style={{ alignItems: "center", marginTop: 15 }}>
                <Text
                  style={[
                    styles.resultTitle,
                    { color: getStatusColor(bmiStatus) },
                  ]}
                >
                  {bmiStatus}
                </Text>
                <Text style={styles.resultValue}>BMI: {bmi.toFixed(1)}</Text>
              </View>
            )}

            <View style={styles.bmiTable}>
              {bmiRanges.map((r, i) => {
                const active = bmi && bmi >= r.min && bmi < r.max;
                return (
                  <View
                    key={i}
                    style={[
                      styles.bmiCell,
                      { backgroundColor: r.color },
                      active
                        ? {
                            borderWidth: 2,
                            borderColor: darkenColor(r.color, 0.4),
                            transform: [{ scale: 1.1 }],
                          }
                        : {},
                    ]}
                  >
                    <Text style={styles.bmiRangeText}>{r.range}</Text>
                    <Text style={styles.bmiLabelText}>{r.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Nút Save Record */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveRecord}
            >
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal chọn cân nặng / chiều cao */}
      <Modal visible={!!modalType} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Select {modalType === "weight" ? "Weight (kg)" : "Height (cm)"}
            </Text>
            <FlatList
              data={values}
              keyExtractor={(item) => item.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    modalType === "weight" ? setWeight(item) : setHeight(item);
                    setModalType(null);
                  }}
                >
                  <Text style={styles.modalText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận lưu record */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmTitle}>Confirm Save</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to save this BMI record?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: "#ef4444" }]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: "#22c55e" }]}
                onPress={confirmSave}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  highlightText: {
    color: "#eab308",
    fontWeight: "800",
    fontSize: 22,
  },
  statText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
    color: "#374151",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#111827",
  },
  chartContainer: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    height: 380,
  },
  addSection: {
    marginTop: 25,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    color: "#111827",
  },
  selectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectorButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  grayButton: {
    backgroundColor: "#e5e7eb",
    borderColor: "#9ca3af",
  },
  grayText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16a34a",
  },
  resultValue: {
    fontSize: 16,
    marginTop: 4,
    color: "#374151",
  },
  bmiTable: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 14,
  },
  bmiCell: {
    width: "48%",
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  bmiRangeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  bmiLabelText: {
    fontSize: 14,
    color: "#111827",
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#111827",
  },
  closeButton: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  closeText: {
    textAlign: "center",
    color: "#15803d",
    fontWeight: "600",
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  confirmContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  confirmMessage: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },
});
