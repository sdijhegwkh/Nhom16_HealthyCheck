// src/routes/userRoutes.js
import express from "express";
import { getUsers, createUser, getUsersTallerThan,signUp,login} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);     // GET /api/users
router.post("/", createUser);  // POST /api/users
router.get("/tall", getUsersTallerThan);
router.post("/signup", signUp); //login
router.post("/login", login); //signup
export default router;
