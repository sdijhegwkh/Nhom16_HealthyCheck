// src/controllers/userController.js
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
// Sign Up
// Sign Up
export async function signUp(req, res) {
  try {
    const { name, gender, email, age, password, height, weight, bmi } = req.body;
    const db = getDB();

    // Kiểm tra user đã tồn tại
    const existingUser = await db.collection("user").findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Thiết lập mục tiêu sức khỏe mặc định
    let health_goal;
    if (gender.toLowerCase() === "male") {
      health_goal = {
        stepsGoal: 7500,
        caloriesGoal: 2500,
        workoutGoal: 120,
        waterGoal: 2000,
      };
    } else {
      // Mặc định là nữ nếu không phải male
      health_goal = {
        stepsGoal: 7500,
        caloriesGoal: 2000,
        workoutGoal: 120,
        waterGoal: 2000,
      };
    }

    // ✅ Lưu vào MongoDB
    const result = await db.collection("user").insertOne({
      name,
      gender,
      email,
      age,
      password: hashedPassword,
      height,
      weight,
      bmi,
      health_goal,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "User created successfully",
      id: result.insertedId,
      health_goal,
    });
  } catch (err) {
    console.error("SignUp Error:", err);
    res.status(500).json({ error: err.message });
  }
}



export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDB();

    // Tìm user theo email
    const user = await db.collection("user").findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // So sánh password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Tạo JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        health_goal: user.health_goal,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
