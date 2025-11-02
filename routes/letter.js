// routes/letter.js
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

    let letters = [];
    try { letters = student.Letters ? JSON.parse(student.Letters) : []; } catch (e) { letters = []; }
    res.render("letter", { title: `Letters - ${student["Full Name"]}`, student, letters });
});

router.post("/upload/:adm_no", upload.single("letter_file"), async (req, res) => {
    const adm_no = req.params.adm_no;
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");

    const stream = cloudinary.uploader.upload_stream({ folder: `letters/${adm_no}`, resource_type: "raw" }, async (error, result) => {
        if (error) return res.status(500).send("Upload failed");
        const students = await readCSV("students.csv");
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let lettersArr = [];
        try { lettersArr = student.Letters ? JSON.parse(student.Letters) : []; } catch (e) { lettersArr = []; }
        lettersArr.push({ public_id: result.public_id, url: result.secure_url, filename: req.file.originalname, created_at: result.created_at });
        student.Letters = JSON.stringify(lettersArr);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/letters/${adm_no}`);
    });

    const readable = new Readable();
    readable._read = () => { };
    readable.push(file.buffer);
    readable.push(null);
    readable.pipe(stream);
});

router.post("/delete/:adm_no", express.urlencoded({ extended: true }), async (req, res) => {
    const { public_id } = req.body;
    const adm_no = req.params.adm_no;
    try {
        await cloudinary.uploader.destroy(public_id, { resource_type: "raw" });
        const students = await readCSV("students.csv");
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let lettersArr = [];
        try { lettersArr = student.Letters ? JSON.parse(student.Letters) : []; } catch (e) { lettersArr = []; }
        lettersArr = lettersArr.filter((l) => l.public_id !== public_id);
        student.Letters = JSON.stringify(lettersArr);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/letters/${adm_no}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Deletion failed");
    }
});

export default router;
