// app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Route imports
import indexRoutes from "./routes/index.js";
import studentsRoutes from "./routes/students.js";
import galleryRoutes from "./routes/gallery.js";
import resultsRoutes from "./routes/results.js";
import letterRoutes from "./routes/letter.js";
import departmentRoutes from "./routes/departments.js";
import searchRoutes from "./routes/search.js";
import reportsRoutes from "./routes/reports.js";

// Database imports
import { initializeDatabase, testConnection } from "./lib/databaseManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------
//  Initialize Database
// -------------------------------
async function initializeApp() {
    try {
        console.log('🔄 Initializing database connection...');
        const dbSuccess = await initializeDatabase();

        if (dbSuccess) {
            console.log('✅ Database initialized successfully with MongoDB');
        } else {
            console.log('✅ Database initialized successfully with CSV fallback');
        }
    } catch (error) {
        console.log('⚠️ Using CSV fallback mode:', error.message);
    }
}

// -------------------------------
//  View Engine Setup
// -------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// -------------------------------
//  Core Middleware
// -------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Global variables (to prevent 'q' undefined errors)
app.use((req, res, next) => {
    res.locals.q = "";
    res.locals.currentPath = req.path;
    next();
});

// -------------------------------
//  Routes
// -------------------------------
app.use("/", indexRoutes);
app.use("/students", studentsRoutes);
app.use("/gallery", galleryRoutes);
app.use("/results", resultsRoutes);
app.use("/letters", letterRoutes);
app.use("/departments", departmentRoutes);
app.use("/search", searchRoutes);
app.use("/reports", reportsRoutes);

// -------------------------------
//  Database Status Route
// -------------------------------
app.get("/db-status", async (req, res) => {
    try {
        const status = await testConnection();
        res.json(status);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message
        });
    }
});

// -------------------------------
//  Static Files (after routes to prevent route conflicts)
// -------------------------------
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------
//  404 Fallback
// -------------------------------
app.use((req, res) => {
    res.status(404).render("404", {
        title: "404 - Not Found",
        message: "Sorry, the page you're looking for doesn't exist.",
        q: "",
    });
});

// -------------------------------
//  Start Server
// -------------------------------
initializeApp().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});