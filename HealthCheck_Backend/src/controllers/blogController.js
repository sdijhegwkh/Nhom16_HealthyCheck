import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ✅ Hàm chuyển id an toàn sang ObjectId (phòng lỗi)
const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

// 🧠 Lấy top 3 blog có nhiều votes nhất
export const getTopBlogs = async (req, res) => {
  try {
    const db = getDB();
    const blogs = await db
      .collection("blog")
      .find({})
      .sort({ votes: -1 })
      .limit(3)
      .toArray();

    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    console.error("Error fetching top blogs:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err.message });
  }
};

// 🧩 (Tuỳ chọn) Lấy tất cả blogs nếu bạn cần cho trang Blog.jsx
export const getAllBlogs = async (req, res) => {
  try {
    const db = getDB();
    const blogs = await db.collection("blog").find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 (Tuỳ chọn) Lấy 1 blog chi tiết
export const getBlogById = async (req, res) => {
  try {
    const db = getDB();
    const id = toObjectId(req.params.id);
    const blog = await db.collection("blog").findOne({ _id: id });

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.error("Error fetching blog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
