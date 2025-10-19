// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
connectDB();

// Test API
app.get("/", (req, res) => {
  res.send("✅ HealthCheck API is running");
});

// Routes
app.use("/users", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
