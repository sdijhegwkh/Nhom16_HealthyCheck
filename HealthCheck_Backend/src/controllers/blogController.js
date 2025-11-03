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

export const getBlogsByCategory = async (req, res) => {
  try {
    const db = await getDB();
    const rawCategory = req.params.category;
    console.log("👉 Received category param:", rawCategory);

    if (!rawCategory) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const category = rawCategory.toLowerCase();
    console.log("🔍 Querying with regex:", new RegExp(category, "i"));

    const blogs = await db
      .collection("blog")
      .find({ category: { $regex: category, $options: "i" } })
      .toArray();

    console.log("✅ Found blogs count:", blogs.length);

    res.json({ success: true, data: blogs });
  } catch (err) {
    console.error("❌ Error searching blogs by category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const result = await db.collection("blog").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { votes: 1 } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.json({ success: true, votes: result.value.votes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

