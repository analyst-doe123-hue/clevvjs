// routes/search.js
import express from "express";
import { readCSV } from "../lib/csvStore.js";

const router = express.Router();

// GET: Search page
router.get("/", async (req, res) => {
    const adm_no = req.query.adm_no ? req.query.adm_no.trim() : "";

    if (!adm_no) {
        // Render search form without search yet
        return res.render("search", {
            title: "Search - Daisy Sponsored Students Portal",
            searched: false
        });
    }

    try {
        const students = await readCSV("students.csv");
        const resultsData = await readCSV("results.csv");
        const galleryData = await readCSV("gallery.csv");

        // Find student by admission number (case insensitive)
        const student = students.find(
            (s) => s["Admission Number"].toLowerCase() === adm_no.toLowerCase()
        );

        if (!student) {
            return res.render("search", {
                title: "Search - Daisy Sponsored Students Portal",
                adm_no,
                searched: true,
                error: `No student found with admission number ${adm_no}`,
            });
        }

        // Find related results and gallery for this student
        const results = resultsData
            .filter((r) => r["Admission Number"] === student["Admission Number"])
            .map((r) => ({
                subject: r.Subject,
                marks: r.Marks,
                grade: r.Grade,
                semester: r.Semester,
            }));

        const gallery = galleryData
            .filter((g) => g["Admission Number"] === student["Admission Number"])
            .map((g) => ({
                url: g.URL,
                caption: g.Caption,
            }));

        // Map to EJS variable names
        const studentData = {
            adm_no: student["Admission Number"],
            name: student["Full Name"],
            email: student["Email"] || "N/A",
            department: student["Department"] || "Not Specified",
            year_of_study: student["Class"] || "N/A",
            phone: student["Contact"] || "N/A",
            address: student["Place of Residence"] || "N/A",
            photo: student["Photo"] || "/images/placeholder.jpg",
        };

        res.render("search", {
            title: "Search Results - Daisy Sponsored Students Portal",
            student: studentData,
            results,
            gallery,
            searched: true,
        });
    } catch (error) {
        console.error("Error fetching search data:", error);
        res.status(500).render("search", {
            title: "Search - Daisy Sponsored Students Portal",
            error: "An error occurred while processing your search. Please try again later.",
        });
    }
});

export default router;
