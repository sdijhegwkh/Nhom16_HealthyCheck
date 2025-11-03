import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useNavigation, useRoute } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.4:5000";

interface Blog {
  _id: { $oid: string };
  title: string;
  content: string;
  votes: number;
  imageUrl: string;
  authorName: string;
  createdAt: string;
  category: string;
}

export default function BlogDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const blog: Blog = route.params?.blog;

  const [isReady, setIsReady] = useState(false);
  const [votes, setVotes] = useState(blog?.votes || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Delay 300ms
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Format ngày
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Gọi API like
  const handleLike = async () => {
    if (isLiking || !blog?._id) return;
    setIsLiking(true);

    try {
      const res = await fetch(`${API_URL}/blogs/${blog._id.$oid}/like`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setVotes(data.votes);
      } else {
        Alert.alert("Lỗi", "Không thể thích bài viết");
      }
    } catch (err) {
      Alert.alert("Lỗi", "Kết nối thất bại");
    } finally {
      setIsLiking(false);
    }
  };

  if (!isReady || !blog) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={require("../assets/logoxoanen1.png")} style={styles.logo} />
          <Text style={styles.appName}>KayTi</Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ảnh bài viết */}
        <Image source={{ uri: blog.imageUrl }} style={styles.mainImage} resizeMode="cover" />

        {/* Tiêu đề */}
        <Text style={styles.title}>{blog.title}</Text>

        {/* Tác giả & Ngày */}
        <View style={styles.meta}>
          <Text style={styles.author}>✍️ {blog.authorName}</Text>
          <Text style={styles.date}>📅 {formatDate(blog.createdAt)}</Text>
        </View>

        {/* Nội dung */}
        <Text style={styles.content}>{blog.content}</Text>

        {/* Nút Like */}
        <TouchableOpacity
          style={[styles.likeBtn, isLiking && styles.likeBtnDisabled]}
          onPress={handleLike}
          disabled={isLiking}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#fff" />
              <Text style={styles.likeText}>Thích • {votes}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav />
    </View>
  );
}

// === STYLES ĐẸP, HỢP LÝ ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // HEADER
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  logo: { width: 35, height: 35, marginRight: 8 },
  appName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  backBtn: {
    position: "absolute",
    left: 20,
    bottom: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 20,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Ảnh chính
  mainImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },

  // Tiêu đề
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
    lineHeight: 30,
  },

  // Meta
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  author: { fontSize: 15, color: "#2563eb", fontWeight: "600" },
  date: { fontSize: 14, color: "#666" },

  // Nội dung
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: "#333",
    textAlign: "justify",
    marginBottom: 30,
  },

  // Nút Like
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  likeBtnDisabled: { opacity: 0.7 },
  likeText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
  },
});