// routes/gallery.js
import express from "express";
import multer from "multer";
import cloudinary from "../lib/cloudinary.js";
import { Readable } from "stream";
import { readCSV, writeCSV } from "../lib/csvStore.js";

const router = express.Router();
const upload = multer(); // we'll upload buffer to cloudinary

// List images for a student (we'll assume CSV has a Gallery column with JSON array)
router.get("/:adm_no", async (req, res) => {
    const adm_no = req.params.adm_no;
    const students = await readCSV("edited_students.csv");
    const student = students.find((s) => s["Admission Number"] === adm_no);
    if (!student) return res.status(404).send("Student not found");

    let gallery = [];
    try { gallery = student.Gallery ? JSON.parse(student.Gallery) : []; } catch (e) { gallery = []; }
    res.render("gallery", { title: `Gallery - ${student["Full Name"]}`, student, gallery });
});

// Upload image
router.post("/upload/:adm_no", upload.single("image"), async (req, res) => {
    const adm_no = req.params.adm_no;
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");

    // upload buffer to cloudinary
    const stream = cloudinary.uploader.upload_stream({ folder: `students/${adm_no}` }, async (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Upload failed");
        }
        // save public_id and url to student's Gallery column (JSON array)
        const students = await readCSV("edited_students.csv");
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let gallery = [];
        try { gallery = student.Gallery ? JSON.parse(student.Gallery) : []; } catch (e) { gallery = []; }
        gallery.push({ public_id: result.public_id, url: result.secure_url, created_at: result.created_at });
        student.Gallery = JSON.stringify(gallery);
        // rewrite CSV
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/gallery/${adm_no}`);
    });

    // pipe buffer to stream
    const readable = new Readable();
    readable._read = () => { }; // _read is required but you can noop it
    readable.push(file.buffer);
    readable.push(null);
    readable.pipe(stream);
});

// Delete image by public_id
router.post("/delete/:adm_no", express.urlencoded({ extended: true }), async (req, res) => {
    const { public_id } = req.body;
    const adm_no = req.params.adm_no;
    if (!public_id) return res.status(400).send("Missing public_id");

    try {
        await cloudinary.uploader.destroy(public_id);
        // Update CSV: remove from Gallery
        const students = await readCSV("students.csv");
        const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
        if (studentIndex === -1) return res.status(404).send("Student not found");
        const student = students[studentIndex];
        let gallery = [];
        try { gallery = student.Gallery ? JSON.parse(student.Gallery) : []; } catch (e) { gallery = []; }
        gallery = gallery.filter((g) => g.public_id !== public_id);
        student.Gallery = JSON.stringify(gallery);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);
        res.redirect(`/gallery/${adm_no}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Deletion failed");
    }
});

export default router;
