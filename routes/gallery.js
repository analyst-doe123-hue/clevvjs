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
    const students = await readCSV("students.csv");
    const student = students.find((s) => s["Admission Number"] === adm_no);
    if (!student) return res.status(404).send("Student not found");

    let gallery = [];
    try { gallery = student.Gallery ? JSON.parse(student.Gallery) : []; } catch (e) { gallery = []; }
    res.render("gallery", { title: `Gallery - ${student["Full Name"]}`, student, gallery });
});

// Upload image - FIXED: Changed from single to array and updated field name
router.post("/upload/:adm_no", upload.array("images"), async (req, res) => {
    const adm_no = req.params.adm_no;
    const files = req.files; // Changed from req.file to req.files
    const note = req.body.image_note; // Get the note from form data

    if (!files || files.length === 0) return res.status(400).send("No files uploaded");

    const students = await readCSV("students.csv");
    const studentIndex = students.findIndex((s) => s["Admission Number"] === adm_no);
    if (studentIndex === -1) return res.status(404).send("Student not found");

    const student = students[studentIndex];
    let gallery = [];
    try { gallery = student.Gallery ? JSON.parse(student.Gallery) : []; } catch (e) { gallery = []; }

    // Process all uploaded files
    const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: `students/${adm_no}`
            }, (error, result) => {
                if (error) {
                    console.error(error);
                    reject(error);
                } else {
                    resolve({
                        public_id: result.public_id,
                        url: result.secure_url,
                        filename: file.originalname,
                        note: note || '', // Store the note with each image
                        created_at: result.created_at
                    });
                }
            });

            const readable = new Readable();
            readable._read = () => { };
            readable.push(file.buffer);
            readable.push(null);
            readable.pipe(stream);
        });
    });

    try {
        const uploadResults = await Promise.all(uploadPromises);

        // Add all uploaded images to gallery
        uploadResults.forEach(result => {
            gallery.push(result);
        });

        student.Gallery = JSON.stringify(gallery);
        const header = Object.keys(students[0] || student);
        await writeCSV("students.csv", header, students);

        res.redirect(`/gallery/${adm_no}`);
    } catch (error) {
        console.error("Upload failed:", error);
        res.status(500).send("Upload failed");
    }
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