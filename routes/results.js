// routes/results.js
import express from "express";
import multer from "multer";
import cloudinary from "../lib/cloudinary.js";
import { Readable } from "stream";
import { readCSV, writeCSV } from "../lib/csvStore.js";

const router = express.Router();
const upload = multer();

router.get("/:adm_no", async (req, res) => {
    const adm_no = req.params.adm_no;
    const students = await readCSV("students.csv");
    const student = students.find((s) => s["Admission Number"] === adm_no);
    if (!student) return res.status(404).send("Student not found");

    let results = [];
    try { results = student.Results ? JSON.parse(student.Results) : []; } catch (e) { results = []; }
    res.render("results", { title: `Results - ${student["Full Name"]}`, student, results });
});

router.post("/upload/:adm_no", upload.single("result_pdf"), async (req, res) => {
    const adm_no = req.params.adm_no;
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");

    const stream = cloudinary.uploader.upload_stream({ folder: `results/${adm_no}`, resource_type: "raw" }, async (error, result) => {
        if (error) return res.status(500).send("Upload failed");
        const students = await readCSV("students.csv");
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let resultsArr = [];
        try { resultsArr = student.Results ? JSON.parse(student.Results) : []; } catch (e) { resultsArr = []; }
        resultsArr.push({ public_id: result.public_id, url: result.secure_url, filename: req.file.originalname, created_at: result.created_at });
        student.Results = JSON.stringify(resultsArr);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/results/${adm_no}`);
    });

    const readable = new Readable();
    readable._read = () => { };
    readable.push(file.buffer);
    readable.push(null);
    readable.pipe(stream);
});

// routes/results.js - Fix the typo in line 56
router.post("/delete/:adm_no", express.urlencoded({ extended: true }), async (req, res) => {
    const { public_id } = req.body;
    const adm_no = req.params.adm_no;
    try {
        await cloudinary.uploader.destroy(public_id, { resource_type: "raw" });
        const students = await readCSV("students.csv"); // FIXED: was "tudents.csv"
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let resultsArr = [];
        try { resultsArr = student.Results ? JSON.parse(student.Results) : []; } catch (e) { resultsArr = []; }
        resultsArr = resultsArr.filter((r) => r.public_id !== public_id);
        student.Results = JSON.stringify(resultsArr);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/results/${adm_no}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Deletion failed");
    }
});

export default router;
