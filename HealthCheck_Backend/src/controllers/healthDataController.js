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
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or range" });

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
      const todayData = data.find((d) => {
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
        const record = data.find(
          (r) => new Date(r.date).toDateString() === d.toDateString()
        );
        result.push(record?.steps?.stepCount || 0);
      }
      return res.json({ success: true, range: "week", data: result });
    }

    if (range === "month") {
      const result = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const record = data.find(
          (r) => new Date(r.date).toDateString() === d.toDateString()
        );
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
    const { userId, stepCount, distanceKm, durationMin, burnedCalories } =
      req.body;
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
        sleep: { totalSleepHr: 0,  sleepDuration: 0 },
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

    // DÙNG NGÀY VIỆT NAM (UTC+7) → ĐÚNG VỚI LOGIN
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();

    const startOfDayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));

    console.log("Fetching health data for user:", userId, "on VN date:", startOfDayUTC.toISOString());

    const record = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: startOfDayUTC,
    });

    if (!record) {
      console.log("No record found for today");
      return res.json({ 
        success: true, 
        exists: false,
        data: { waterConsumed: 0 } // ← ĐẢM BẢO CÓ TRƯỜNG NÀY
      });
    }

    console.log("Found today's data - waterConsumed:", record.waterConsumed);
    res.json({ 
      success: true, 
      exists: true, 
      data: {
        ...record,
        waterConsumed: record.waterConsumed || 0
      }
    });
  } catch (err) {
    console.error("Error fetching today's health data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// 💤 Cập nhật tổng thời gian ngủ
export const updateSleepSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessions } = req.body;

    if (!sessions?.length) {
      return res.status(400).json({ message: "No sessions" });
    }

    const db = getDB();

    // NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const year = nowVN.getUTCFullYear();
    const month = nowVN.getUTCMonth();
    const day = nowVN.getUTCDate();

    const recordStart = new Date(Date.UTC(year, month, day));
    const recordEnd = new Date(Date.UTC(year, month, day + 1));

    let healthRecord = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: recordStart, $lt: recordEnd },
    });

    if (!healthRecord) {
      return res.status(404).json({ message: "Health record not found" });
    }

    // === HÀM PARSE GIỜ VIỆT NAM ===
    const parseVNTime = (str) => {
      const [datePart, timePart] = str.split(" ");
      const [y, m, d] = datePart.split("-").map(Number);
      const [h, min] = timePart.split(":").map(Number);
      return new Date(y, m - 1, d, h, min);
    };

    // VALIDATE MỖI SESSION
    const validSessions = sessions
      .map((s) => {
        const sleepDate = parseVNTime(s.sleepTime);
        const wakeDate = parseVNTime(s.wakeTime);

        if (isNaN(sleepDate) || isNaN(wakeDate)) return null;

        const durationMin = Math.round((wakeDate - sleepDate) / 60000);
        if (durationMin <= 0 || durationMin > 24 * 60) return null;

        const wakeVN = new Date(wakeDate.getTime() + 7 * 60 * 60 * 1000);
        const wakeYear = wakeVN.getUTCFullYear();
        const wakeMonth = wakeVN.getUTCMonth();
        const wakeDay = wakeVN.getUTCDate();

        if (wakeYear !== year || wakeMonth !== month || wakeDay !== day) {
          return null;
        }

        return {
          sleepTime: s.sleepTime,
          wakeTime: s.wakeTime,
          durationMin,
        };
      })
      .filter(Boolean);

    if (validSessions.length === 0) {
      return res.json({ message: "No valid sessions" });
    }

    const newDuration = validSessions.reduce((sum, s) => sum + s.durationMin, 0);
    
    // LẤY sleepDuration HIỆN TẠI TỪ DB
    const currentSleepDuration = healthRecord.sleep?.sleepDuration || 0;

    // CỘNG DỒN
    const totalDuration = currentSleepDuration + newDuration;
    const totalSleepHr = Math.round(totalDuration / 60);

    // CẬP NHẬT DB: push session mới + cộng dồn thời gian
    await db.collection("healthdata").updateOne(
      { _id: healthRecord._id },
      {
        $push: { "sleep.sessions": { $each: validSessions } },
        $set: {
          "sleep.sleepDuration": totalDuration,
          "sleep.totalSleepHr": totalSleepHr,
        },
      }
    );

    res.json({
      message: "Sleep saved!",
      totalSleepHr,
      addedSessions: validSessions.length,
      totalDurationMin: totalDuration,
    });
  } catch (err) {
    console.error("updateSleepSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTodaySleepSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const year = nowVN.getUTCFullYear();
    const month = nowVN.getUTCMonth();
    const day = nowVN.getUTCDate();

    const start = new Date(Date.UTC(year, month, day));
    const end = new Date(Date.UTC(year, month, day + 1));

    const record = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: start, $lt: end },
    });

    const sessions = (record?.sleep?.sessions || []).map(s => ({
      sleepTime: s.sleepTime,
      wakeTime: s.wakeTime,
      durationMin: s.durationMin,
    }));

    res.json({
      sessions,
      totalSleepHr: record?.sleep?.totalSleepHr || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};
//thong ke bieu do sleep
export async function getSleepStats(req, res) {
  try {
    const { userId, range } = req.query;
    const db = getDB();

    if (!userId || !range || !["week", "month"].includes(range)) {
      return res.status(400).json({ success: false, message: "Invalid params" });
    }

    // === TÍNH NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM (CHÍNH XÁC) ===
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();

    const todayKey = `${vnYear}-${String(vnMonth + 1).padStart(2, '0')}-${String(vnDate).padStart(2, '0')}`;

    // === TÍNH KHOẢNG NGÀY ===
    let startDateUTC, endDateUTC;

    if (range === "week") {
      const todayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
      startDateUTC = new Date(todayUTC);
      startDateUTC.setUTCDate(startDateUTC.getUTCDate() - 6);
      endDateUTC = new Date(todayUTC);
      endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 1);
    } else {
      const todayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
      startDateUTC = new Date(todayUTC);
      startDateUTC.setUTCDate(startDateUTC.getUTCDate() - 29);
      endDateUTC = new Date(todayUTC);
      endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 1);
    }

    // === LẤY DỮ LIỆU ===
    const data = await db
      .collection("healthdata")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: startDateUTC, $lt: endDateUTC },
      })
      .sort({ date: 1 })
      .toArray();

    // === NHÓM THEO NGÀY THỨC DẬY ===
    const recordsByVNDate = {};

    data.forEach(record => {
      if (!record.sleep?.sessions?.length) return;

      const lastSession = record.sleep.sessions[record.sleep.sessions.length - 1];
      const wakeStr = lastSession.wakeTime;
      const wakeDate = new Date(`${wakeStr} GMT+0700`);

      const key = `${wakeDate.getFullYear()}-${String(wakeDate.getMonth() + 1).padStart(2, '0')}-${String(wakeDate.getDate()).padStart(2, '0')}`;
      recordsByVNDate[key] = (recordsByVNDate[key] || 0) + (record.sleep.totalSleepHr || 0);
    });

    // === TUẦN ===
    if (range === "week") {
      const weekData = [];
      const weekLabels = [];

      for (let i = 6; i >= 0; i--) {
        const targetUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
        targetUTC.setUTCDate(targetUTC.getUTCDate() - i);

        const key = `${targetUTC.getUTCFullYear()}-${String(targetUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(targetUTC.getUTCDate()).padStart(2, '0')}`;
        const sleepHr = recordsByVNDate[key] || 0;

        weekData.push(sleepHr);

        const dayStr = targetUTC.getUTCDate().toString();
        const label = key === todayKey ? `${dayStr} (hôm nay)` : dayStr;
        weekLabels.push(label);
      }

      return res.json({
        success: true,
        range: "week",
        data: weekData,
        labels: weekLabels,
      });
    }

    // === THÁNG ===
    if (range === "month") {
      const ranges = [
        { start: 1, end: 5 },
        { start: 6, end: 10 },
        { start: 11, end: 15 },
        { start: 16, end: 20 },
        { start: 21, end: 25 },
        { start: 26, end: 31 },
      ];

      const totalSleep = [0, 0, 0, 0, 0, 0];
      const countDays = [0, 0, 0, 0, 0, 0];

      Object.keys(recordsByVNDate).forEach(key => {
        const day = parseInt(key.split("-")[2]);
        const sleepHr = recordsByVNDate[key];

        for (let i = 0; i < ranges.length; i++) {
          if (day >= ranges[i].start && day <= ranges[i].end) {
            totalSleep[i] += sleepHr;
            countDays[i]++;
            break;
          }
        }
      });

      const avgData = totalSleep.map((total, i) =>
        countDays[i] > 0 ? Math.round((total / countDays[i]) * 10) / 10 : 0
      );

      return res.json({
        success: true,
        range: "month",
        data: avgData,
        labels: ["1-5", "6-10", "11-15", "16-20", "21-25", "26-End"],
      });
    }

  } catch (err) {
    console.error("getSleepStats error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
// POST /healthdata/workout/schedule/:userId
export const updateWorkoutSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessions } = req.body;

    if (!sessions?.length) {
      return res.status(400).json({ message: "No sessions" });
    }

    const db = getDB();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;

    // TÍNH NGÀY VIỆT NAM MỘT LẦN
    const nowUTC = new Date();
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);
    const yearVN = nowVN.getUTCFullYear();
    const monthVN = nowVN.getUTCMonth();
    const dayVN = nowVN.getUTCDate();

    const recordStart = new Date(Date.UTC(yearVN, monthVN, dayVN));
    const recordEnd = new Date(Date.UTC(yearVN, monthVN, dayVN + 1));

    // TÌM HOẶC TẠO MỚI RECORD
    let record = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: recordStart, $lt: recordEnd },
    });

    if (!record) {
      const newRecord = {
        userId: new ObjectId(userId),
        date: recordStart,
        healthScore: 0,
        steps: { stepCount: 0, distanceKm: 0, durationMin: 0, burnedCalories: 0 },
        sleep: { totalSleepHr: 0, sessions: [], sleepDuration: 0 },
        nutrition: {
          caloriesConsumed: 0, totalFatGrams: 0, totalFatPercent: 0,
          totalProteinGrams: 0, totalProteinPercent: 0,
          totalCarbsGrams: 0, totalCarbsPercent: 0,
        },
        water: { waterConsumed: 0 },
        workout: { workDuration: 0, sessions: [] },
      };
      const insertResult = await db.collection("healthdata").insertOne(newRecord);
      record = { ...newRecord, _id: insertResult.insertedId };
    }

    // CẬP NHẬT TỪNG SESSION
    for (const s of sessions) {
      const durationMin = Math.round(s.durationMin);
      if (durationMin <= 0) continue;

      await db.collection("healthdata").updateOne(
        { _id: record._id },
        {
          $push: {
            "workout.sessions": {
              note: s.note || "No note",
              durationMin,
            },
          },
          $inc: { "workout.workDuration": durationMin },
        }
      );
    }

    res.json({ message: "Workout saved!" });
  } catch (err) {
    console.error("updateWorkoutSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /healthdata/workout/today/:userId
export const getTodayWorkoutSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;
    const db = getDB();

    let startOfDay;

    if (date && typeof date === "string") {
      startOfDay = new Date(date);
    } else {
      const nowUTC = new Date();
      const nowVN = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
      startOfDay = new Date(Date.UTC(
        nowVN.getUTCFullYear(),
        nowVN.getUTCMonth(),
        nowVN.getUTCDate()
      ));
    }

    if (isNaN(startOfDay.getTime())) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const record = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: startOfDay, $lt: endOfDay },
    });

    res.json({ sessions: record?.workout?.sessions || [] });
  } catch (err) {
    console.error("getTodayWorkoutSessions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getWorkoutStats = async (req, res) => {
  try {
    const { userId, range } = req.query;
    const db = getDB();

    if (!userId || !range || !["week", "month"].includes(range)) {
      return res.status(400).json({ success: false, message: "Invalid params" });
    }

    // === TÍNH NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM ===
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();

    const todayKey = `${vnYear}-${String(vnMonth + 1).padStart(2, '0')}-${String(vnDate).padStart(2, '0')}`;

    // === TÍNH KHOẢNG NGÀY ===
    let startDateUTC, endDateUTC;

    if (range === "week") {
      const todayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
      startDateUTC = new Date(todayUTC);
      startDateUTC.setUTCDate(startDateUTC.getUTCDate() - 6);
      endDateUTC = new Date(todayUTC);
      endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 1);
    } else {
      const todayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
      startDateUTC = new Date(todayUTC);
      startDateUTC.setUTCDate(startDateUTC.getUTCDate() - 29);
      endDateUTC = new Date(todayUTC);
      endDateUTC.setUTCDate(endDateUTC.getUTCDate() + 1);
    }

    // === LẤY DỮ LIỆU ===
    const data = await db
      .collection("healthdata")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: startDateUTC, $lt: endDateUTC },
      })
      .sort({ date: 1 })
      .toArray();

    // === NHÓM THEO NGÀY VIỆT NAM ===
    const recordsByVNDate = {};

    data.forEach(record => {
      if (!record.workout?.workDuration) return;

      const recordDate = new Date(record.date);
      const key = `${recordDate.getUTCFullYear()}-${String(recordDate.getUTCMonth() + 1).padStart(2, '0')}-${String(recordDate.getUTCDate()).padStart(2, '0')}`;
      recordsByVNDate[key] = record.workout.workDuration;
    });

    // === TUẦN ===
    if (range === "week") {
      const weekData = [];
      const weekLabels = [];

      for (let i = 6; i >= 0; i--) {
        const targetUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));
        targetUTC.setUTCDate(targetUTC.getUTCDate() - i);

        const key = `${targetUTC.getUTCFullYear()}-${String(targetUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(targetUTC.getUTCDate()).padStart(2, '0')}`;
        const duration = recordsByVNDate[key] || 0;

        weekData.push(duration);
        const dayStr = targetUTC.getUTCDate().toString();
        weekLabels.push(key === todayKey ? `${dayStr} (hôm nay)` : dayStr);
      }

      return res.json({
        success: true,
        range: "week",
        data: weekData,
        labels: weekLabels,
      });
    }

    // === THÁNG ===
    if (range === "month") {
      const ranges = [
        { start: 1, end: 5 },
        { start: 6, end: 10 },
        { start: 11, end: 15 },
        { start: 16, end: 20 },
        { start: 21, end: 25 },
        { start: 26, end: 31 },
      ];

      const totalDuration = [0, 0, 0, 0, 0, 0];
      const countDays = [0, 0, 0, 0, 0, 0];

      Object.keys(recordsByVNDate).forEach(key => {
        const day = parseInt(key.split("-")[2]);
        const duration = recordsByVNDate[key];

        for (let i = 0; i < ranges.length; i++) {
          if (day >= ranges[i].start && day <= ranges[i].end) {
            totalDuration[i] += duration;
            countDays[i]++;
            break;
          }
        }
      });

      const avgData = totalDuration.map((total, i) =>
        countDays[i] > 0 ? Math.round(total / countDays[i]) : 0
      );

      return res.json({
        success: true,
        range: "month",
        data: avgData,
        labels: ["1-5", "6-10", "11-15", "16-20", "21-25", "26-End"],
      });
    }

  } catch (err) {
    console.error("getWorkoutStats error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
export const updateWaterConsumed = async (req, res) => {
  try {
    const { userId } = req.params;
    const { waterConsumed } = req.body;

    if (!userId || waterConsumed === undefined) {
      return res.status(400).json({ error: "Missing userId or waterConsumed" });
    }

    const db = getDB();

    // TÌM BẢN GHI HÔM NAY (đã được tạo khi login)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 00:00:00 local → nhưng Mongo lưu UTC

    // Vì login đã tạo theo ngày VN → dùng cùng logic
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);
    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();
    const startOfDayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));

    const result = await db.collection("healthdata").updateOne(
      {
        userId: new ObjectId(userId),
        date: startOfDayUTC,
      },
      {
        $set: { waterConsumed: Number(waterConsumed) },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Health data not found for today" });
    }

    console.log(`Water updated: ${waterConsumed}ml for user ${userId}`);
    res.json({ message: "Water consumption updated" });
  } catch (err) {
    console.error("updateWaterConsumed error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getWaterStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const db = getDB();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;

    // LẤY NGÀY HIỆN TẠI THEO VIỆT NAM
    const nowUTC = new Date();
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);
    const todayVN = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate()));

    const sevenDaysAgo = new Date(todayVN);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 ngày

    const records = await db.collection("healthdata")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: sevenDaysAgo, $lte: todayVN }
      })
      .sort({ date: 1 })
      .toArray();

    // TẠO MẢNG 7 NGÀY: 29 → 28 → ... → 23
    const stats = [];
    const labels = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(todayVN);
      date.setDate(date.getDate() - i);
      const dayNum = date.getUTCDate(); // 29, 28, ...
      const dateStr = date.toISOString().split("T")[0];

      const record = records.find(r => 
        new Date(r.date).toISOString().split("T")[0] === dateStr
      );

      stats.push(record?.waterConsumed || 0);
      labels.push(dayNum.toString()); // "29", "28", ...
    }

    res.json({
      success: true,
      labels, // ["29", "28", ..., "23"]
      data: stats
    });
  } catch (err) {
    console.error("getWaterStats error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
export const updateNutrition = async (req, res) => {
  try {
    const { userId } = req.params;
    const { session } = req.body;

    if (!userId || !Array.isArray(session) || session.length === 0) {
      return res.status(400).json({ error: "Missing userId or session data" });
    }

    const db = getDB();

    // 🕐 Xác định ngày hiện tại theo múi giờ Việt Nam
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);
    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();
    const startOfDayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));

    // 🧩 Lấy dữ liệu hiện tại trong DB
    const todayData = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: startOfDayUTC,
    });

    if (!todayData) {
      return res.status(404).json({ error: "Health data not found for today" });
    }

    // 🧮 Gộp session cũ và mới
    const existingSessions = todayData.nutrition?.session || [];
    const mergedSessions = [...existingSessions, ...session];

    // 🔢 Tính lại tổng nutrition từ toàn bộ session
    const totalCalories = mergedSessions.reduce((sum, m) => sum + (m.kcal || 0), 0);
    const totalFat = mergedSessions.reduce((sum, m) => sum + (m.fat || 0), 0);
    const totalProtein = mergedSessions.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = mergedSessions.reduce((sum, m) => sum + (m.carbs || 0), 0);

    // 📝 Cập nhật lại DB
    const result = await db.collection("healthdata").updateOne(
      { userId: new ObjectId(userId), date: startOfDayUTC },
      {
        $set: {
          "nutrition.caloriesConsumed": totalCalories,
          "nutrition.totalFatGrams": totalFat,
          "nutrition.totalProteinGrams": totalProtein,
          "nutrition.totalCarbsGrams": totalCarbs,
          "nutrition.session": mergedSessions,
        },
      }
    );

    console.log(`🍱 Nutrition updated for user ${userId} with ${session.length} new meals`);
    res.json({
      success: true,
      message: "Nutrition updated successfully",
      totals: { totalCalories, totalFat, totalProtein, totalCarbs },
    });
  } catch (err) {
    console.error("updateNutrition error:", err);
    res.status(500).json({ error: "Server error" });
  }
};



export const getTodayNutrition = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const db = getDB();

    // 🕐 Lấy ngày hôm nay (theo giờ VN)
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);
    const vnYear = nowVN.getUTCFullYear();
    const vnMonth = nowVN.getUTCMonth();
    const vnDate = nowVN.getUTCDate();
    const startOfDayUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate));

    // 🔹 Lấy dữ liệu dinh dưỡng hôm nay
    const todayData = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: startOfDayUTC,
    });

    // 🔹 Lấy thông tin user (để biết caloriesGoal)
    const userData = await db.collection("user").findOne({
      _id: new ObjectId(userId),
    });

    if (!todayData || !userData) {
      return res.status(404).json({ error: "No data found for today" });
    }

    // 🧩 Dữ liệu nutrition
    const nutrition = todayData.nutrition || {
      caloriesConsumed: 0,
      totalFatGrams: 0,
      totalProteinGrams: 0,
      totalCarbsGrams: 0,
      session: [],
    };

    // 🎯 Tính mục tiêu dinh dưỡng dựa theo kcal goal
    const goalCalories = userData.health_goal?.caloriesGoal || 2000;

    const fatGoal = Math.round((goalCalories * 0.3) / 9); // 30% từ fat
    const proteinGoal = Math.round((goalCalories * 0.2) / 4); // 20% từ protein
    const carbGoal = Math.round((goalCalories * 0.5) / 4); // 50% từ carbs

    const nutritionGoal = {
      calorieGoal: goalCalories,
      fatGoal,
      proteinGoal,
      carbGoal,
    };

    res.json({
      success: true,
      nutrition,
      nutritionGoal,
    });
  } catch (err) {
    console.error("getTodayNutrition error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
export const getLast10DaysNutrition = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }

    const db = getDB();

    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    const todayVN = new Date(Date.UTC(
      nowVN.getUTCFullYear(),
      nowVN.getUTCMonth(),
      nowVN.getUTCDate()
    ));

    const startDate = new Date(todayVN);
    startDate.setUTCDate(todayVN.getUTCDate() - 9);

    const data = await db.collection("healthdata")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: startDate, $lte: todayVN }
      })
      .sort({ date: 1 })
      .toArray();

    const result = data.map(doc => ({
      date: doc.date.toISOString().split("T")[0],
      caloriesConsumed: doc.nutrition?.caloriesConsumed || 0
    }));

    // ĐẢM BẢO TRẢ VỀ { success: true, data: [...] }
    res.json({ success: true, data: result });

  } catch (err) {
    console.error("getLast10DaysNutrition error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
export const getMonthlyNutrition = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }

    const db = getDB();

    // Lấy tháng hiện tại (theo giờ VN)
    const nowUTC = new Date();
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const nowVN = new Date(nowUTC.getTime() + vietnamOffsetMs);

    const year = nowVN.getUTCFullYear();
    const month = nowVN.getUTCMonth();

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Query: Lấy toàn bộ dữ liệu trong tháng
    const data = await db.collection("healthdata")
      .find({
        userId: new ObjectId(userId),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      })
      .sort({ date: 1 })
      .toArray();

    // Format
    const result = data.map(doc => ({
      date: doc.date.toISOString().split("T")[0],
      caloriesConsumed: doc.nutrition?.caloriesConsumed || 0
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("getMonthlyNutrition error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getTotalHealthData = async (req, res) => {
  try {
    const { userId } = req.params;

    // Kiểm tra userId hợp lệ
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId" });
    }

    const db = getDB();

    // Lấy phạm vi thời gian của ngày hôm nay (theo UTC)
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const data = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: start, $lte: end },
    });

    res.json({ success: true, data: data || null });
  } catch (err) {
    console.error("getTotalHealthData error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
// routes/healthdata.js hoặc controller
export const getWeeklyReport = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const db = getDB();
    const objectId = new ObjectId(userId);

    // === GIỜ VIỆT NAM HIỆN TẠI (AN TOÀN 100%) ===
    const nowVN = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    console.log("VN Time (forced):", nowVN.toLocaleString('vi-VN'));

    // === NGÀY HIỆN TẠI 00:00 (GIỜ VN) ===
    const todayVN = new Date(
      nowVN.getFullYear(),
      nowVN.getMonth(),
      nowVN.getDate(),
      0, 0, 0, 0
    );

    // === NGÀY MAI 00:00 (GIỜ VN) ===
    const tomorrowVN = new Date(todayVN);
    tomorrowVN.setDate(tomorrowVN.getDate() + 1);

    // === 7 NGÀY TRƯỚC 00:00 (GIỜ VN) ===
    const sevenDaysAgoVN = new Date(todayVN);
    sevenDaysAgoVN.setDate(todayVN.getDate() - 6);

    // === CHUYỂN SANG UTC ===
    const startDateUTC = new Date(Date.UTC(
      sevenDaysAgoVN.getFullYear(),
      sevenDaysAgoVN.getMonth(),
      sevenDaysAgoVN.getDate()
    ));

    const endDateUTC = new Date(Date.UTC(
      tomorrowVN.getFullYear(),
      tomorrowVN.getMonth(),
      tomorrowVN.getDate()
    ));

    console.log("VN Today (00:00):", todayVN.toLocaleString('vi-VN'));
    console.log("Query range (VN):", sevenDaysAgoVN.toLocaleString('vi-VN'), "→", tomorrowVN.toLocaleString('vi-VN'));
    console.log("Query range (UTC):", startDateUTC.toISOString(), "→", endDateUTC.toISOString());

    const records = await db.collection("healthdata").find({
      userId: objectId,
      date: { $gte: startDateUTC, $lt: endDateUTC }
    }).toArray();

    console.log("Records found:", records.length);
    records.forEach(r => {
      const vnDate = new Date(r.date.getTime() + 7 * 60 * 60 * 1000);
      const sessionMin = (r.sleep?.sessions || []).reduce((s, ses) => s + (ses.durationMin || 0), 0);
      console.log(`Date (VN): ${vnDate.toLocaleDateString('vi-VN')} | Sleep: ${sessionMin} min`);
    });

    if (!records.length) {
      return res.json({
        success: true,
        data: { steps: 0, sleepHours: 0, sleepMinutes: 0, waterMl: 0, workoutMin: 0, calories: 0 }
      });
    }

    const total = records.reduce((acc, record) => {
      acc.steps += record.steps?.stepCount || 0;
      const sessionSleepMin = (record.sleep?.sessions || []).reduce((s, ses) => s + (ses.durationMin || 0), 0);
      acc.sleepMin += sessionSleepMin;
      acc.waterMl += record.waterConsumed || 0;
      acc.workoutMin += record.workout?.workDuration || 0;
      acc.calories += record.nutrition?.caloriesConsumed || 0;
      return acc;
    }, { steps: 0, sleepMin: 0, waterMl: 0, workoutMin: 0, calories: 0 });

    const sleepHours = Math.floor(total.sleepMin / 60);
    const sleepMinutes = total.sleepMin % 60;

    res.json({
      success: true,
      data: {
        steps: total.steps,
        sleepHours,
        sleepMinutes,
        waterMl: total.waterMl,
        workoutMin: total.workoutMin,
        calories: total.calories
      }
    });

  } catch (err) {
    console.error("getWeeklyReport error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



