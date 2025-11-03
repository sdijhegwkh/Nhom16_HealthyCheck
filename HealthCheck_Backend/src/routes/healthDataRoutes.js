    import express from "express";
    import {updateStepData, getTodayHealthData, getHealthStats, getHealthDataByUser, updateSleepSchedule, getTodaySleepSessions, getSleepStats, updateWorkoutSchedule, getTodayWorkoutSessions, getWorkoutStats, updateWaterConsumed , getWaterStats,updateNutrition , getTodayNutrition, getLast10DaysNutrition, getMonthlyNutrition, getTotalHealthData, getWeeklyReport} from "../controllers/healthDataController.js";
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
    router.put("/water/:userId", updateWaterConsumed);
    router.get("/water-stats/:userId", getWaterStats);
    router.put("/update-nutrition/:userId", updateNutrition);
    router.get("/nutrition/:userId", getTodayNutrition);
    router.get("/last-10-days/:userId", getLast10DaysNutrition);
    router.get("/monthly/:userId", getMonthlyNutrition);
    router.get("/totalhealthdata/:userId", getTotalHealthData);
    router.get("/weekly-report/:userId", getWeeklyReport);
    export default router; 