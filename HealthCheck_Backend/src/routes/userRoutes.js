// src/routes/userRoutes.js
import express from "express";
import { createUser,signUp,login, updateStepsGoal, updateSleepGoal, getUserById , updateWorkoutGoal, updateWaterGoal, getCurrentBMI, updateBMIUser} from "../controllers/userController.js";

const router = express.Router();

router.post("/", createUser);  // createuser
router.post("/signup", signUp); //login
router.post("/login", login); //signup
router.patch("/update-goal/:userId", updateStepsGoal);
router.put("/update-sleep-goal/:userId", updateSleepGoal);
router.put("/update-workout-goal/:userId", updateWorkoutGoal); 
router.put("/update-water-goal/:userId", updateWaterGoal);
router.get("/:id", getUserById);
router.get("/bmi/:userId", getCurrentBMI);
router.put("/update-bmi/:userId", updateBMIUser);
export default router;
