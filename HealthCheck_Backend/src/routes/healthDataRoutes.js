import express from "express";
import {updateStepData, getTodayHealthData, getHealthStats, getHealthDataByUser, updateSleepSchedule, getTodaySleepSessions, getSleepStats, updateWorkoutSchedule, getTodayWorkoutSessions, getWorkoutStats } from "../controllers/healthDataController.js";
const router = express.Router();

router.post("/update-steps", updateStepData); // cap nhat khi thoat screen
router.get("/get-today/:userId", getTodayHealthData);
router.get("/stats", getHealthStats);
router.get("/user/:userId", getHealthDataByUser);
router.post("/sleep/schedule/:userId", updateSleepSchedule);
router.get("/sleep/today/:userId", getTodaySleepSessions);
router.get('/sleep/stats', getSleepStats);
router.post("/workout/schedule/:userId", updateWorkoutSchedule);
router.get("/workout/today/:userId", getTodayWorkoutSessions);
router.get("/workout/stats", getWorkoutStats);
export default router;