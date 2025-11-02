// routes/reports.js
import express from "express";
import axios from "axios";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Route: Generate report via Hugging Face AI
router.post("/generate", async (req, res) => {
    try {
        const { studentName, term, performance, remarks } = req.body;

        // Step 1: Build AI prompt
        const prompt = `
      Generate a concise, motivational academic report for the student:
      Name: ${studentName}
      Term: ${term}
      Performance Summary: ${performance}
      Teacher's Remarks: ${remarks}
      The report should be formal, encouraging, and under 200 words.
    `;

        // Step 2: Call Hugging Face Inference API
        const hfResponse = await axios.post(
            "https://api-inference.huggingface.co/models/gpt2",
            { inputs: prompt },
            { headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` } }
        );

        const reportText = hfResponse.data?.[0]?.generated_text || "Report generation failed.";

        // Step 3: Save to a temporary text file
        const filePath = `./temp/${studentName.replace(/\s+/g, "_")}_Report.txt`;
        fs.writeFileSync(filePath, reportText);

        // Step 4: Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: "raw",
            folder: "term_reports"
        });

        // Step 5: Cleanup local file
        fs.unlinkSync(filePath);

        // Step 6: Send response back with download link
        res.status(200).json({
            success: true,
            message: "Report generated successfully",
            reportText,
            downloadUrl: uploadResult.secure_url
        });

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report",
            error: error.message
        });
    }
});

export default router;
