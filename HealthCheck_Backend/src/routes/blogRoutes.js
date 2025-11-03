import express from "express";
import { getTopBlogs, getAllBlogs , getBlogsByCategory, likeBlog} from "../controllers/blogController.js";
const router = express.Router();
router.get("/top", getTopBlogs);      
router.get("/", getAllBlogs);          
router.get("/category/:category", getBlogsByCategory)     
router.post("/:id/like", likeBlog);

export default router;