// src/routes/userRoutes.js
import express from "express";
import { getUsers, createUser, getUsersTallerThan } from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);     // GET /api/users
router.post("/", createUser);  // POST /api/users
router.get("/tall", getUsersTallerThan);

export default router;
