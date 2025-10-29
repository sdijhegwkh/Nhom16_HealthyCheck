// src/controllers/userController.js
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";


function toObjectId(id) {
  try {
    // Nếu id là object có $oid
    if (typeof id === "object" && id.$oid) return new ObjectId(id.$oid);
    return new ObjectId(id);
  } catch {
    return null;
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
        sleepGoal:460,
      };
    } else {
      // Mặc định là nữ nếu không phải male
      health_goal = {
        stepsGoal: 7500,
        caloriesGoal: 2000,
        workoutGoal: 120,
        waterGoal: 2000,
        sleepGoal:460,
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

    const user = await db.collection("user").findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // TÍNH NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM (UTC+7) — ĐÚNG 100%
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    // DÙNG getUTC* ĐỂ LẤY NGÀY VIỆT NAM
    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();

    // TẠO NGÀY 00:00:00 UTC CỦA NGÀY VIỆT NAM
    const vietnamStartOfDay = new Date(Date.UTC(vnYear, vnMonth, vnDate));

    console.log("UTC Now:", nowUTC.toISOString());
    console.log("VN Time:", nowVN.toISOString());
    console.log("VN Start of Day (UTC):", vietnamStartOfDay.toISOString());

    // KIỂM TRA healthdata CHO NGÀY VIỆT NAM
    const existing = await db.collection("healthdata").findOne({
      userId: new ObjectId(user._id),
      date: vietnamStartOfDay,
    });

    if (!existing) {
      await db.collection("healthdata").insertOne({
        userId: new ObjectId(user._id),
        date: vietnamStartOfDay, // ĐÚNG NGÀY VN
        healthScore: 0,
        steps: { stepCount: 0, distanceKm: 0, durationMin: 0, burnedCalories: 0 },
        sleep: { totalSleepHr: 0, sessions: [] },
        nutrition: {
          caloriesConsumed: 0, totalFatGrams: 0, totalFatPercent: 0,
          totalProteinGrams: 0, totalProteinPercent: 0,
          totalCarbsGrams: 0, totalCarbsPercent: 0,
        },
        waterConsumed: 0,
        workout: { workDuration: 0, sessions: [] },
      });

      console.log(`Created healthdata for ${email} - VN Date: ${vietnamStartOfDay.toISOString()}`);
    } else {
      console.log(`Healthdata exists for ${email} - VN Date: ${vietnamStartOfDay.toISOString()}`);
    }

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
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
}



export async function updateStepsGoal(req, res) {
  try {
    const { userId } = req.params;
    const { stepsGoal } = req.body;
    const db = getDB();

    if (!stepsGoal || stepsGoal < 1000)
      return res.status(400).json({ error: "Invalid goal" });

    const objectId = toObjectId(userId);
    if (!objectId)
      return res.status(400).json({ error: "Invalid userId format" });

    const result = await db.collection("user").updateOne(
      { _id: objectId },
      { $set: { "health_goal.stepsGoal": stepsGoal } }
    );

    if (result.modifiedCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "Steps goal updated successfully", stepsGoal });
  } catch (err) {
    console.error("Update Steps Goal Error:", err);
    res.status(500).json({ error: err.message });
  }
}
// 🟢 Cập nhật Sleep Goal (phút)
export async function updateSleepGoal(req, res) {
  try {
    const { userId } = req.params;
    const { sleepGoal } = req.body; // đơn vị: phút
    const db = getDB();

    // Kiểm tra hợp lệ
    if (!sleepGoal || sleepGoal < 60)
      return res.status(400).json({ error: "Invalid sleep goal" });

    const objectId = toObjectId(userId);
    if (!objectId)
      return res.status(400).json({ error: "Invalid userId format" });

    const result = await db.collection("user").updateOne(
      { _id: objectId },
      { $set: { "health_goal.sleepGoal": sleepGoal } }
    );

    if (result.modifiedCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "Sleep goal updated successfully", sleepGoal });
  } catch (err) {
    console.error("Update Sleep Goal Error:", err);
    res.status(500).json({ error: err.message });
  }
}
// 🟢 Lấy thông tin user theo ID
export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();

    const objectId = toObjectId(id);
    if (!objectId) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await db.collection("user").findOne({ _id: objectId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Get User By ID Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
export const updateWorkoutGoal = async (req, res) => {
  try {
    const { userId } = req.params;
    const { workoutGoal } = req.body; // ĐƠN VỊ: PHÚT

    if (!userId || workoutGoal === undefined) {
      return res.status(400).json({ message: "Missing userId or workoutGoal" });
    }

    const db = getDB();

    const result = await db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { "health_goal.workoutGoal": workoutGoal } } // LƯU PHÚT
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`Updated workout goal for user ${userId}: ${workoutGoal} minutes`);
    res.json({ message: "Workout goal updated!" });
  } catch (err) {
    console.error("updateWorkoutGoal error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateWaterGoal = async (req, res) => {
  try {
    const { userId } = req.params;
    const { waterGoal } = req.body; // ĐƠN VỊ: ml

    if (!userId || waterGoal === undefined) {
      return res.status(400).json({ message: "Missing userId or waterGoal" });
    }

    const db = getDB();
    const result = await db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { "health_goal.waterGoal": waterGoal } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`Updated water goal for user ${userId}: ${waterGoal} ml`);
    res.json({ message: "Water goal updated!" });
  } catch (err) {
    console.error("updateWaterGoal error:", err);
    res.status(500).json({ message: "Server error" });
  }
};