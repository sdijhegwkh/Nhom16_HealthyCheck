// src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";

dotenv.config();

const app = express();

// Cấu hình CORS
const allowedOrigins = [
  "http://localhost:19006", // Expo dev client
  "http://localhost:8081",  // React Native Web
  "https://nhom16detaihealthycheckapp.loca.lt", // LocalTunnel
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile app / Postman không có origin
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));

// Middleware
app.use(express.json());

// Kết nối MongoDB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("✅ HealthCheck API is running");
});

// User routes
app.use("/users", userRoutes);

// Error handler (CORS hoặc khác)
app.use((err, req, res, next) => {
  if (err) {
    console.error("Error middleware:", err.message);
    res.status(500).json({ error: err.message });
  } else {
    next();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
