// src/controllers/userController.js
import { getDB } from "../config/db.js";

// 🟢 Lấy tất cả user
export async function getUsers(req, res) {
  try {
    const db = getDB(); // lấy kết nối DB
    const users = await db.collection("user").find().toArray();
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// 🟢 Thêm user mới
export async function createUser(req, res) {
  try {
    const db = getDB();
    const userData = req.body;

    // Nếu bạn muốn kiểm tra dữ liệu đầu vào
    if (!userData.name || !userData.email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const result = await db.collection("user").insertOne(userData);
    res.status(201).json({
      message: "User added successfully",
      id: result.insertedId,
    });
  } catch (err) {
    console.error("❌ Error adding user:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUsersTallerThan(req, res) {
  try {
    const db = getDB();
    const users = await db
      .collection("user")
      .find({ height_cm: { $gt: 160 } })   // 👉 điều kiện: height_cm > 160
      .toArray();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
