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

    // 🔹 Tìm user theo email
    const user = await db.collection("user").findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 🔹 Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 🔹 Tạo JWT token (hết hạn sau 1h)
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Tính ngày hôm nay theo múi giờ Việt Nam (UTC+7)
    const now = new Date();
    const vietnamOffset = 7 * 60 * 60 * 1000; // 7 tiếng
    const vietnamDate = new Date(now.getTime() + vietnamOffset);
    vietnamDate.setHours(0, 0, 0, 0);
    console.log("Now:", now.toISOString());
console.log("VietnamDate:", vietnamDate.toISOString());

    // 🔹 Kiểm tra xem healthdata hôm nay đã tồn tại chưa
    const existing = await db.collection("healthdata").findOne({
      userId: new ObjectId(user._id),
      date: vietnamDate,
    });

    // 🔹 Nếu chưa có thì tạo mới healthdata mặc định
    if (!existing) {
      await db.collection("healthdata").insertOne({
        userId: new ObjectId(user._id),
        date: vietnamDate,
        healthScore: 0,
        steps: {
          stepCount: 0,
          distanceKm: 0,
          durationMin: 0,
          burnedCalories: 0,
        },
        sleep: {
          totalSleepHr: 0,
          sessions: [],
        },
        nutrition: {
          caloriesConsumed: 0,
          totalFatGrams: 0,
          totalFatPercent: 0,
          totalProteinGrams: 0,
          totalProteinPercent: 0,
          totalCarbsGrams: 0,
          totalCarbsPercent: 0,
        },
        water: {
          waterConsumed: 0,
        },
        workout: {
          workDuration: 0,
          sessions: [],
        },
      });

      console.log(
        `✅ Created new healthdata for user ${user._id} (${email}) - Date: ${vietnamDate.toISOString()}`
      );
    } else {
      console.log(
        `ℹ️ Healthdata already exists for user ${user._id} (${email}) - Date: ${vietnamDate.toISOString()}`
      );
    }

    // ✅ Trả về thông tin user và token
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


