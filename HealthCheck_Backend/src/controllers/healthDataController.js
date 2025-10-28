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

// 💤 Cập nhật tổng thời gian ngủ
export const updateSleepSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessions } = req.body;

    if (!sessions?.length) {
      return res.status(400).json({ message: "No sessions" });
    }

    const db = getDB();

    for (const s of sessions) {
      const sleepStr = s.sleepTime; // "2025-10-28 21:00"
      const wakeStr  = s.wakeTime;  // "2025-10-29 03:00"

      const sleepDate = new Date(`${sleepStr} GMT+0700`);
      const wakeDate  = new Date(`${wakeStr} GMT+0700`);

      if (isNaN(sleepDate) || isNaN(wakeDate)) continue;

      const durationMin = Math.round((wakeDate - sleepDate) / 60000);
      if (durationMin <= 0) continue;

      // XÁC ĐỊNH NGÀY DỰA VÀO WAKE TIME (người dùng thức dậy vào ngày nào → ngày đó)
      const yearVN = wakeDate.getFullYear();
      const monthVN = wakeDate.getMonth();
      const dayVN = wakeDate.getDate();

      const recordStart = new Date(Date.UTC(yearVN, monthVN, dayVN));
      const recordEnd   = new Date(Date.UTC(yearVN, monthVN, dayVN + 1));

      let healthRecord = await db.collection("healthdata").findOne({
        userId: new ObjectId(userId),
        date: { $gte: recordStart, $lt: recordEnd },
      });

      if (!healthRecord) {
        healthRecord = {
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
        await db.collection("healthdata").insertOne(healthRecord);
      }

      await db.collection("healthdata").updateOne(
        {
          userId: new ObjectId(userId),
          date: { $gte: recordStart, $lt: recordEnd },
        },
        {
          $push: {
            "sleep.sessions": {
              sleepTime: sleepStr,
              wakeTime: wakeStr,
              durationMin,
            },
          },
          $inc: {
            "sleep.sleepDuration": durationMin,
            "sleep.totalSleepHr": durationMin / 60,
          },
        }
      );
    }

    res.json({ message: "Saved!" });
  } catch (err) {
    console.error("updateSleepSchedule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTodaySleepSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const db = getDB();

    let start, end;
    if (date) {
      const d = new Date(date);
      start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
    } else {
      const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
      start = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate()));
      end = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate() + 1));
    }

    const record = await db.collection("healthdata").findOne({
      userId: new ObjectId(userId),
      date: { $gte: start, $lt: end },
    });

    const sessions = (record?.sleep?.sessions || []).map(s => ({
      sleepTime: s.sleepTime, // "2025-10-28 21:00"
      wakeTime:  s.wakeTime,  // "2025-10-28 22:00"
    }));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};
//thong ke bieu do sleep
// getSleepStats.js
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
    if (!sessions?.length) return res.status(400).json({ message: "No sessions" });

    const db = getDB();
    const vietnamOffset = 7 * 60 * 60 * 1000;

    for (const s of sessions) {
      const durationMin = Math.round(s.durationMin);
      if (durationMin <= 0) continue;

      const now = new Date();
      const nowVN = new Date(now.getTime() + vietnamOffset);
      const yearVN = nowVN.getUTCFullYear();
      const monthVN = nowVN.getUTCMonth();
      const dayVN = nowVN.getUTCDate();

      const recordStart = new Date(Date.UTC(yearVN, monthVN, dayVN));
      const recordEnd = new Date(Date.UTC(yearVN, monthVN, dayVN + 1));

      let record = await db.collection("healthdata").findOne({
        userId: new ObjectId(userId),
        date: { $gte: recordStart, $lt: recordEnd },
      });

      if (!record) {
        record = { userId: new ObjectId(userId), date: recordStart, workout: { workDuration: 0, sessions: [] }, /* other fields */ };
        await db.collection("healthdata").insertOne(record);
      }

      await db.collection("healthdata").updateOne(
        { _id: record._id },
        {
          $push: { "workout.sessions": { note: s.note, durationMin } },
          $inc: { "workout.workDuration": durationMin },
        }
      );
    }

    res.json({ message: "Workout saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error" });
  }
};
// GET /healthdata/workout/today/:userId
export const getTodayWorkoutSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // date là string hoặc undefined
    const db = getDB();

    let startOfDay;

    if (date && typeof date === "string") {
      startOfDay = new Date(date); // Dùng trực tiếp
    } else {
      // Nếu không có date → dùng ngày VN hiện tại
      const now = new Date();
      const nowVN = new Date(now.getTime() + 7 * 60 * 60 * 1000);
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
    const nowUTC = new Date(); nowUTC.setHours(0,0,0,0);

    let startDate;
    let data = [];

    if (range === "week") {
      startDate = new Date(nowUTC);
      startDate.setDate(nowUTC.getDate() - 6);

      data = await db.collection("healthdata").find({
        userId: new ObjectId(userId),
        date: { $gte: startDate, $lte: nowUTC },
      }).sort({ date: 1 }).toArray();

      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const target = new Date(startDate);
        target.setDate(startDate.getDate() + i);
        const record = data.find(r => new Date(r.date).toDateString() === target.toDateString());
        weekData.push(record?.workout?.workDuration || 0);
      }

      return res.json({ success: true, data: weekData });
    }

    // month logic tương tự sleep...
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};