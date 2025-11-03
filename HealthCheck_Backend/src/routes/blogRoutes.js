import express from "express";
import { getTopBlogs, getAllBlogs, getBlogById } from "../controllers/blogController.js";
const router = express.Router();
router.get("/top", getTopBlogs);      
router.get("/", getAllBlogs);          
router.get("/:id", getBlogById);      

export default router;