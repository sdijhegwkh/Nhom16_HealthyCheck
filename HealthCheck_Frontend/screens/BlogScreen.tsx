import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useNavigation } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.4:5000";

export default function BlogScreen() {
  const navigation = useNavigation<any>(); // Để navigate sang BlogDetail

  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalVisible, setModalVisible] = useState(false);
  const [isReady, setIsReady] = useState(false); // DELAY STATE

  // DELAY 300ms khi vào trang
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch blogs
  useEffect(() => {
    if (isReady) {
      fetchBlogs(selectedCategory);
    }
  }, [selectedCategory, isReady]);

  const fetchBlogs = async (category = "all") => {
    try {
      setLoading(true);
      let url = `${API_URL}/blogs`;
      if (category !== "all") url += `/category/${category}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setBlogs(data.data);
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // Hiển thị loading nếu chưa ready
  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require("../assets/logoxoanen1.png")} style={styles.logo} />
          <Text style={styles.appName}>KayTi</Text>
        </View>
        <Text style={styles.date}>{today}</Text>
      </LinearGradient>

      {/* Category Select */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Category:</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.selectText}>
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#111" />
        </TouchableOpacity>

        {/* Modal */}
        <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {["all", "sport", "makeup", "health"].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.optionButton, selectedCategory === item && styles.optionSelected]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[styles.optionText, selectedCategory === item && styles.optionTextSelected]}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>

      {/* Blog List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
      ) : blogs.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 30, color: "#666" }}>
          No blogs found.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {blogs.map((blog) => (
            <View key={blog._id.$oid || blog._id} style={styles.blogCard}>
              <Image
                source={{
                  uri: blog.imageUrl || "https://via.placeholder.com/300x200?text=No+Image",
                }}
                style={styles.blogImage}
                resizeMode="cover"
              />
              <View style={styles.blogContent}>
                <Text style={styles.blogTitle}>{blog.title}</Text>
                <Text style={styles.blogSubtitle}>
                  {blog.authorName || "Unknown"} • ❤️ {blog.votes}
                </Text>

                {/* NÚT XEM THÊM */}
                <TouchableOpacity
                  style={styles.readMoreBtn}
                  onPress={() => navigation.navigate("BlogDetail", { blog })}
                >
                  <Text style={styles.readMoreText}>Xem thêm</Text>
                  <Ionicons name="arrow-forward" size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* BottomNav */}
      <BottomNav />
    </View>
  );
}

// === THÊM STYLE MỚI ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  logo: { width: 35, height: 35, marginRight: 8 },
  appName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  date: { color: "#e0f2fe", marginTop: 10, fontSize: 15 },

  filterContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 10,
  },
  filterLabel: { fontWeight: "600", marginBottom: 5, color: "#111" },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectText: { fontSize: 15, color: "#111", fontWeight: "500" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    paddingVertical: 8,
    elevation: 5,
  },
  optionButton: { paddingVertical: 12, alignItems: "center" },
  optionSelected: { backgroundColor: "#e0f2fe" },
  optionText: { fontSize: 16, color: "#333" },
  optionTextSelected: { color: "#2563eb", fontWeight: "600" },

  blogCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  blogImage: { width: "100%", height: 160 },
  
  // THÊM: Nội dung blog
  blogContent: { padding: 12 },
  blogTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  blogSubtitle: { fontSize: 14, color: "#666", marginBottom: 10 },

  // NÚT XEM THÊM
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  readMoreText: { color: "#2563eb", fontWeight: "600", marginRight: 4 },
});