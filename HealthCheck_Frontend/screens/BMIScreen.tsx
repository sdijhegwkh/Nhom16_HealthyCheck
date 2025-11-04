import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Svg, { Rect, Line, Text as TextSVG } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://nhom16-healthycheck.onrender.com";

export default function BMIScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [latestBMI, setLatestBMI] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [bmiRecords, setBmiRecords] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);

  const [modalType, setModalType] = useState<"weight" | "height" | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState<string>("");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Fade-in
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

 useFocusEffect(
  useCallback(() => {
    const loadUser = async () => {
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

        console.log("✅ Resolved UID:", uid);
        setUserId(uid);

        // Gọi API lấy BMI hiện tại
        const bmiRes = await axios.get(`${API_URL}/users/bmi/${uid}`);
        console.log("BMI response:", bmiRes.data);
        setLatestBMI(bmiRes.data.bmi ?? null);
        setHeight(bmiRes.data.height ?? null);
        setWeight(bmiRes.data.weight ?? null);

        // Gọi API lấy lịch sử BMI
        const historyRes = await axios.get(`${API_URL}/users/bmi-history/${uid}`);
        console.log("BMI history:", historyRes.data);
        if (historyRes.data.success && historyRes.data.data.length > 0) {
          const records = historyRes.data.data;
          setBmiRecords(records.map((d: any) => d.bmi));
          setLabels(records.map((d: any) => {
            const date = new Date(d.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }));
        }
      } catch (err: any) {
        console.error("Load BMI error:", err.response?.data || err.message);
      }
    };

    loadUser();
  }, [])
);


  // Tính BMI khi thay đổi weight/height
  useEffect(() => {
    if (weight && height) {
      const value = weight / ((height / 100) ** 2);
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

  const getBMIColor = (bmi: number) => {
    if (bmi < 18.5) return "#60a5fa";
    if (bmi < 25) return "#22c55e";
    if (bmi < 30) return "#facc15";
    return "#ef4444";
  };

  const getStatusColor = (status: string) => {
    const map: any = { Underweight: "#60a5fa", Normal: "#22c55e", Overweight: "#facc15", Obese: "#ef4444" };
    return map[status] || "#374151";
  };

  // Lưu BMI mới
  const confirmSave = async () => {
  if (!bmi || !userId || !height || !weight) return;
  setConfirmModalVisible(false);

  try {
    // 1. CẬP NHẬT USERS
    await axios.put(`${API_URL}/users/update-bmi/${userId}`, {
      height,
      weight,
      bmi
    });
    // 3. CẬP NHẬT LOCAL
    const storedUser = await AsyncStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.height = height;
      user.weight = weight;
      user.bmi = bmi;
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }

    // 4. CẬP NHẬT GIAO DIỆN
    setLatestBMI(bmi);
    setBmiRecords(prev => [...prev.slice(-9), bmi]);
    const today = new Date();
    setLabels(prev => [...prev.slice(-9), `${today.getMonth() + 1}/${today.getDate()}`]);

    Alert.alert("Success", "BMI saved!");
    setWeight(null);
    setHeight(null);
  } catch (err: any) {
    Alert.alert("Error", err.response?.data?.error || "Save failed");
  }
};

  const values = Array.from(
    { length: modalType === "weight" ? 121 : 81 },
    (_, i) => (modalType === "weight" ? i + 30 : i + 130)
  );

  // Biểu đồ
  const maxVal = Math.max(...(bmiRecords.length > 0 ? bmiRecords : [35]), 35);
  const chartHeight = 200;
  const baseY = 250;
  const barWidth = 40;
  const gap = 40;
  const startX = 80;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={["#fde68a", "#facc15", "#eab308"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BMI</Text>
          <View style={{ width: 26 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.content}>
          <Text style={styles.infoText}>
            Your latest BMI is{" "}
            <Text style={styles.highlightText}>
              {latestBMI !== null ? latestBMI.toFixed(1) : "N/A"}
            </Text>
          </Text>

          {/* Biểu đồ */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>BMI History</Text>
            {bmiRecords.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg width={Math.max(900, bmiRecords.length * 80)} height={300}>
                  {[0, 10, 20, 30, 40].map(val => {
                    const y = baseY - (val / maxVal) * chartHeight;
                    return (
                      <React.Fragment key={val}>
                        <TextSVG x={20} y={y + 4} fontSize="11" fill="#4b5563">{val}</TextSVG>
                        <Line x1={50} y1={y} x2={900} y2={y} stroke="#e5e7eb" strokeDasharray="4,4" />
                      </React.Fragment>
                    );
                  })}
                  {bmiRecords.map((val, i) => {
                    const x = startX + i * (barWidth + gap);
                    const h = (val / maxVal) * chartHeight;
                    const y = baseY - h;
                    return (
                      <React.Fragment key={i}>
                        <Rect x={x} y={y} width={barWidth} height={h} rx={barWidth / 2} fill={getBMIColor(val)} />
                        <TextSVG x={x + barWidth / 2} y={y - 6} fontSize="12" fontWeight="bold" fill="#000" textAnchor="middle">
                          {val.toFixed(1)}
                        </TextSVG>
                        <TextSVG x={x + barWidth / 2} y={baseY + 18} fontSize="11" fill="#000" textAnchor="middle">
                          {labels[i]}
                        </TextSVG>
                      </React.Fragment>
                    );
                  })}
                </Svg>
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No BMI history yet</Text>
            )}
          </View>

          {/* Add Record */}
          <View style={styles.addSection}>
            <Text style={styles.sectionTitle}>Add New Record</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity style={[styles.selectorButton, styles.grayButton]} onPress={() => setModalType("weight")}>
                <Text style={styles.grayText}>{weight ? `${weight} kg` : "Weight"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selectorButton, styles.grayButton]} onPress={() => setModalType("height")}>
                <Text style={styles.grayText}>{height ? `${height} cm` : "Height"}</Text>
              </TouchableOpacity>
            </View>

            {bmi && (
              <View style={{ alignItems: "center", marginTop: 15 }}>
                <Text style={[styles.resultTitle, { color: getStatusColor(bmiStatus) }]}>{bmiStatus}</Text>
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
                      active ? { borderWidth: 2, borderColor: r.color, transform: [{ scale: 1.05 }] } : {},
                    ]}
                  >
                    <Text style={styles.bmiRangeText}>{r.range}</Text>
                    <Text style={styles.bmiLabelText}>{r.label}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => setConfirmModalVisible(true)} disabled={!bmi}>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save BMI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal chọn */}
      <Modal visible={!!modalType} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select {modalType === "weight" ? "Weight (kg)" : "Height (cm)"}</Text>
            <FlatList
              data={values}
              keyExtractor={item => item.toString()}
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
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalType(null)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmTitle}>Confirm</Text>
            <Text style={styles.confirmMessage}>Save BMI: {bmi?.toFixed(1)}?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: "#ef4444" }]} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: "#22c55e" }]} onPress={confirmSave}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

// Styles giữ nguyên (đã đẹp)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  infoText: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  highlightText: { color: "#eab308", fontWeight: "800", fontSize: 22 },
  chartContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 15, marginTop: 20, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  noDataText: { textAlign: "center", color: "#6b7280", fontStyle: "italic" },
  addSection: { backgroundColor: "#fff", padding: 15, borderRadius: 16, marginTop: 25, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  selectorRow: { flexDirection: "row", justifyContent: "space-between" },
  selectorButton: { flex: 1, marginHorizontal: 5, paddingVertical: 12, borderRadius: 8, backgroundColor: "#e5e7eb", alignItems: "center" },
  grayText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  resultTitle: { fontSize: 18, fontWeight: "700" },
  resultValue: { fontSize: 16, color: "#374151", marginTop: 4 },
  bmiTable: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 14 },
  bmiCell: { width: "48%", paddingVertical: 10, borderRadius: 10, alignItems: "center", marginBottom: 8 },
  bmiRangeText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  bmiLabelText: { fontSize: 14, color: "#111827" },
  saveButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, marginTop: 15 },
  saveButtonText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { backgroundColor: "#fff", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%" },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  modalItem: { paddingVertical: 12, alignItems: "center" },
  modalText: { fontSize: 16, color: "#111827" },
  closeButton: { backgroundColor: "#dcfce7", paddingVertical: 10, borderRadius: 8, marginTop: 10 },
  closeText: { textAlign: "center", color: "#15803d", fontWeight: "600" },
  confirmOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  confirmContainer: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 16 },
  confirmTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  confirmMessage: { fontSize: 16, textAlign: "center", marginBottom: 20, color: "#374151" },
  confirmButtons: { flexDirection: "row", justifyContent: "space-between" },
  confirmButton: { flex: 1, paddingVertical: 10, borderRadius: 10, marginHorizontal: 5 },
  confirmButtonText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  grayButton: {
  backgroundColor: "#e5e7eb",
  borderColor: "#9ca3af",
  borderWidth: 1,
},
});