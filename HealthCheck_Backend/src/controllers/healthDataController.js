import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ✅ Hàm chuyển id an toàn sang ObjectId
const toObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
};

/* =======================================================================
 🟢 LẤY DỮ LIỆU SỨC KHỎE (BIỂU ĐỒ NGÀY / TUẦN / THÁNG)
======================================================================= */
export async function getHealthStats(req, res) {
  try {
    const { userId, range } = req.query;
    const db = getDB();

    if (!userId || !range)
      return res.status(400).json({ success: false, message: "Missing userId or range" });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);

    if (range === "week") startDate.setDate(startDate.getDate() - 6); // 7 ngày
    else if (range === "month") startDate.setDate(startDate.getDate() - 29); // 30 ngày

    // Lấy dữ liệu từ db
    const data = await db
      .collection("healthdata")
      .find({
        userId: toObjectId(userId),
        date: { $gte: startDate, $lte: new Date() },
      })
      .sort({ date: 1 })
      .toArray();

    if (range === "day") {
      // chỉ 2 cột: [actualSteps, goal]
      const todayData = data.find(d => {
        const dDate = new Date(d.date);
        return dDate.toDateString() === now.toDateString();
      });
      const actual = todayData?.steps?.stepCount || 0;
      const goal = todayData?.steps?.goal || 10000; // nếu bạn lưu goal ở đâu đó, thay 10000 bằng giá trị thật
      return res.json({ success: true, range: "day", data: [actual, goal] });
    }

    if (range === "week") {
      const result = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const record = data.find(r => new Date(r.date).toDateString() === d.toDateString());
        result.push(record?.steps?.stepCount || 0);
      }
      return res.json({ success: true, range: "week", data: result });
    }

    if (range === "month") {
      const result = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const record = data.find(r => new Date(r.date).toDateString() === d.toDateString());
        result.push(record?.steps?.stepCount || 0);
      }
      return res.json({ success: true, range: "month", data: result });
    }

  } catch (err) {
    console.error("❌ Get Health Stats Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}



/* =======================================================================
 🟢 LẤY TẤT CẢ HEALTHDATA THEO USER (dùng khi load StepScreen)
======================================================================= */
export async function getHealthDataByUser(req, res) {
  try {
    const { userId } = req.params;
    const db = getDB();

    const data = await db
      .collection("healthdata")
      .find({ userId: toObjectId(userId) })
      .sort({ date: -1 })
      .toArray();

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Get HealthData Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/* =======================================================================
 🟢 CẬP NHẬT SỐ BƯỚC (khi thoát khỏi StepScreen)
======================================================================= */
export async function updateStepData(req, res) {
  try {
    const { userId, stepCount, distanceKm, durationMin, burnedCalories } = req.body;
    const db = getDB();

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // ✅ Xác định mốc thời gian trong ngày
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingData = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingData) {
      console.log(`🟢 Found existing data for ${userId}, adding new values...`);
      await db.collection("healthdata").updateOne(
        { _id: existingData._id },
        {
          $inc: {
            "steps.stepCount": stepCount,
            "steps.distanceKm": distanceKm,
            "steps.durationMin": durationMin,
            "steps.burnedCalories": burnedCalories,
          },
        }
      );
    } else {
      console.log(`🆕 No data for ${userId} today — creating new record.`);
      await db.collection("healthdata").insertOne({
        userId: new ObjectId(userId),
        date: new Date(),
        steps: {
          stepCount,
          distanceKm,
          durationMin,
          burnedCalories,
        },
        healthScore: 0,
        sleep: { totalSleepHr: 0, sleepRate: 0, sleepDuration: 0 },
        nutrition: {
          caloriesConsumed: 0,
          totalFatGrams: 0,
          totalFatPercent: 0,
          totalProteinGrams: 0,
          totalProteinPercent: 0,
          totalCarbsGrams: 0,
          totalCarbsPercent: 0,
        },
        water: { waterConsumed: 0 },
        workout: { workDuration: 0, burnedCalories: 0 },
      });
    }

    res.json({ success: true, message: "✅ Steps data updated successfully" });
  } catch (err) {
    console.error("❌ Update Steps Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/* =======================================================================
 🟢 LẤY DỮ LIỆU HÔM NAY (để load vào StepScreen)
======================================================================= */
export async function getTodayHealthData(req, res) {
  try {
    const { userId } = req.params;
    const db = getDB();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    console.log("📅 Fetching health data for:", userId);

    const record = await db.collection("healthdata").findOne({
      userId: toObjectId(userId),
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!record) {
      console.log("📭 No record found for today");
      return res.json({ success: true, exists: false });
    }

    console.log("✅ Found today's data:", record.steps);
    res.json({ success: true, exists: true, data: record });
  } catch (err) {
    console.error("❌ Error fetching today's health data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
