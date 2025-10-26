import express from "express";
import {updateStepData, getTodayHealthData, getHealthStats, getHealthDataByUser } from "../controllers/healthDataController.js";
const router = express.Router();

router.post("/update-steps", updateStepData); // cap nhat khi thoat screen
router.get("/get-today/:userId", getTodayHealthData);
router.get("/stats", getHealthStats);
router.get("/user/:userId", getHealthDataByUser);
export default router;