// routes/index.js
import express from "express";
import { sendMail } from "../lib/mailer.js";
import { readCSV } from "../lib/csvStore.js";

const router = express.Router();

// Homepage route
router.get("/", async (req, res) => {
    const q = req.query.q || "";

    // Get some featured students for the homepage
    const students = await readCSV("students.csv");
    const featuredStudents = students.slice(0, 6); // Show first 6 students

    res.render("index", {
        title: "Daisy - Student Portfolio",
        q,
        featuredStudents,
        success: false,
        error: false
    });
});

// About page
router.get("/about", (req, res) => {
    const q = req.query.q || "";
    res.render("about", {
        title: "About Us -Daisy",
        q
    });
});

// Team page
router.get("/team", (req, res) => {
    const q = req.query.q || "";
    res.render("team", {
        title: "Our Team - Daisy",
        q
    });
});

// Success stories page
router.get("/success", async (req, res) => {
    const q = req.query.q || "";

    // Get students for success stories (you can filter by criteria)
    const students = await readCSV("students.csv");

    res.render("success", {
        title: "Success Stories - Daisy",
        q,
        students: students.slice(0, 12) // Show some students
    });
});

// Departments page
router.get("/departments", async (req, res) => {
    const q = req.query.q || "";
    const dept = req.query.department || "";

    const students = await readCSV("students.csv");

    // Get unique departments
    const departments = [...new Set(students.map(s => s.Department).filter(Boolean))];

    // Filter students by department if specified
    let filteredStudents = students;
    if (dept) {
        filteredStudents = students.filter(s =>
            s.Department && s.Department.toLowerCase() === dept.toLowerCase()
        );
    }

    res.render("department", {
        title: "Departments - Daisy",
        q,
        dept,
        departments,
        students: filteredStudents
    });
});

// Contact form submission
router.post("/contact", async (req, res) => {
    const { name, email, message } = req.body;
    const q = req.query.q || "";

    try {
        await sendMail({
            to: process.env.EMAIL_USER,
            subject: `Contact form: ${name}`,
            text: `From ${name} <${email}>:\n\n${message}`,
            html: `<p>From ${name} &lt;${email}&gt;</p><p>${message}</p>`
        });

        res.render("index", {
            title: "Contact sent - Daisy",
            success: true,
            error: false,
            q,
            featuredStudents: [] // You might want to fetch this again
        });
    } catch (err) {
        console.error(err);
        res.render("index", {
            title: "Contact failed - Daisy",
            success: false,
            error: true,
            q,
            featuredStudents: [] // You might want to fetch this again
        });
    }
});

export default router;