// src/routes/userRoutes.js
import express from "express";
import { createUser,signUp,login, updateStepsGoal} from "../controllers/userController.js";

const router = express.Router();

router.post("/", createUser);  // createuser
router.post("/signup", signUp); //login
router.post("/login", login); //signup
router.patch("/update-goal/:userId", updateStepsGoal);
export default router;
