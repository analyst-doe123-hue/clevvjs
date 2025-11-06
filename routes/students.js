// routes/students.js
import express from "express";
import cloudinary from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from 'pdfkit';
import { readCSV } from "../lib/csvStore.js";
import {
    getStudentTerms,
    addStudentTerm,
    getStudentReports,
    addStudentReport,
    getStudentBiography,
    updateStudentBiography,
    getStudentGallery
} from "../lib/studentDataStore.js";

const router = express.Router();

// Cloudinary config
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /students — List, search, or filter
router.get("/", async (req, res) => {
    try {
        const q = req.query.q ? req.query.q.toLowerCase() : "";
        const dept = req.query.department ? req.query.department.toLowerCase() : "";

        const students = await readCSV("students.csv");

        const filtered = students.filter((s) => {
            const name = s["Full Name"]?.toLowerCase() || "";
            const adm = s["Admission Number"]?.toLowerCase() || "";
            const department = s["Department"]?.toLowerCase() || "";
            return (!q || name.includes(q) || adm.includes(q)) && (!dept || department.includes(dept));
        });

        res.render("students", {
            title: "Students",
            students: filtered,
            q,
            dept,
            totalStudents: filtered.length,
            activePage: "students"
        });
    } catch (error) {
        console.error("Error loading students:", error);
        res.status(500).send("Server Error");
    }
});

// GET /students/:adm_no — Individual profile
router.get("/:adm_no", async (req, res) => {
    try {
        const adm_no = req.params.adm_no;
        const students = await readCSV("students.csv");
        const student = students.find((s) => s["Admission Number"] === adm_no);

        if (!student) {
            return res.status(404).render("error", {
                title: "Student Not Found",
                error: "Student Not Found",
                message: `No student found with admission number: ${adm_no}`
            });
        }

        const terms = getStudentTerms(adm_no);
        const reports = getStudentReports(adm_no);
        const biography = getStudentBiography(adm_no);

        // DEBUG: Log biography data
        console.log('Student Admission No:', adm_no);
        console.log('CSV Biography:', student["Small Biography"]);
        console.log('Stored Biography:', biography);
        console.log('Final Biography:', biography || student["Small Biography"] || "No biography available.");

        // Use stored biography if available, otherwise fall back to CSV biography
        const studentBiography = biography || student["Small Biography"] || "No biography available.";

        res.render("profile", {
            title: `${student["Full Name"]} - Profile | Daisy Portal`,
            student: {
                ...student,
                "Small Biography": studentBiography
            },
            terms,
            reports
        });
    } catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).render("error", {
            title: "Server Error",
            error: "Server Error",
            message: "Unable to load student profile."
        });
    }
});

// POST /students/:adm_no/update-bio
router.post("/:adm_no/update-bio", async (req, res) => {
    try {
        const adm_no = req.params.adm_no;
        const { biography } = req.body;
        const success = updateStudentBiography(adm_no, biography);

        res.json({
            success,
            message: success ? "Biography updated successfully" : "Failed to update biography",
            biography
        });
    } catch (error) {
        console.error("Error updating biography:", error);
        res.status(500).json({ success: false, message: "Failed to update biography" });
    }
});

// POST /students/:adm_no/update-terms - UPDATED for comprehensive form structure
router.post("/:adm_no/update-terms", async (req, res) => {
    try {
        const adm_no = req.params.adm_no;
        const {
            termName,
            executiveSummary,
            academicOverview,
            academicGrade,
            academicRank,
            academicStrengths,
            academicChallenges,
            personalSchool,
            personalExtra,
            homeEnvironment,
            homeUpdateMethod,
            nextTermDate,
            goalsAcademic,
            goalsPersonal,
            feesAmount,
            feesDueDate,
            uniformNotes,
            bookList,
            transportNotes,
            otherNeeds,
            recommendAcademic,
            recommendMaterial,
            concludingRemark
        } = req.body;

        if (!termName || !executiveSummary || !academicOverview || !nextTermDate || !concludingRemark) {
            return res.status(400).json({
                success: false,
                message: "Report period, executive summary, academic overview, next term date, and concluding remark are required"
            });
        }

        // Use the comprehensive function with all fields
        const success = addStudentTerm(adm_no, {
            termName,
            executiveSummary,
            academicOverview,
            academicGrade: academicGrade || '',
            academicRank: academicRank || '',
            academicStrengths: academicStrengths || '',
            academicChallenges: academicChallenges || '',
            personalSchool: personalSchool || '',
            personalExtra: personalExtra || '',
            homeEnvironment: homeEnvironment || '',
            homeUpdateMethod: homeUpdateMethod || '',
            nextTermDate,
            goalsAcademic: goalsAcademic || '',
            goalsPersonal: goalsPersonal || '',
            feesAmount: feesAmount || '',
            feesDueDate: feesDueDate || '',
            uniformNotes: uniformNotes || '',
            bookList: bookList || '',
            transportNotes: transportNotes || '',
            otherNeeds: otherNeeds || '',
            recommendAcademic: recommendAcademic || '',
            recommendMaterial: recommendMaterial || '',
            concludingRemark
        });

        if (success) {
            // Get the newly added term
            const terms = getStudentTerms(adm_no);
            const latestTerm = terms.length > 0 ? terms[0] : null;

            res.json({
                success: true,
                message: "Comprehensive term update submitted successfully!",
                term: {
                    termName,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Failed to save term update to database"
            });
        }
    } catch (error) {
        console.error("Error adding term:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add term update"
        });
    }
});

// ✅ Universal Mini India Report Generation
router.get("/:adm_no/generate-report", async (req, res) => {
    try {
        const adm_no = req.params.adm_no;
        const students = await readCSV("students.csv");
        const student = students.find((s) => s["Admission Number"] === adm_no);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        // Get latest term data
        const terms = getStudentTerms(adm_no);
        const latestTerm = terms.length > 0 ? terms[0] : null;

        if (!latestTerm) {
            return res.status(400).json({
                success: false,
                message: "No academic terms found. Please add at least one term before generating a report."
            });
        }

        // Generate universal PDF matching comprehensive format
        const pdfBuffer = await generateUniversalReport(student, latestTerm);

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
                {
                    resource_type: "raw",
                    folder: "student_reports",
                    format: "pdf",
                    public_id: `report_${adm_no}_${Date.now()}`
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(pdfBuffer);
        });

        // Save report to database
        const filename = `Mini_India_Report_${student['Full Name'].replace(/\s+/g, '_')}_${latestTerm["TermName"].replace(/\s+/g, '_')}.pdf`;
        const success = addStudentReport(adm_no, filename, uploadResult.public_id);

        if (success) {
            res.json({
                success: true,
                message: "Mini India report generated successfully!",
                report: {
                    filename: filename,
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id,
                    created_at: new Date().toISOString(),
                    term: latestTerm["TermName"]
                },
                downloadUrl: uploadResult.secure_url
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Report generated but failed to save to database"
            });
        }

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report",
            error: error.message
        });
    }
});

// ✅ NEW: Biography PDF Generation
router.post("/:adm_no/generate-biography-pdf", async (req, res) => {
    try {
        const adm_no = req.params.adm_no;
        const students = await readCSV("students.csv");
        const student = students.find((s) => s["Admission Number"] === adm_no);
        
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const { biography } = req.body;
        const studentBiography = biography || student["Small Biography"] || "No biography available.";

        // Generate biography PDF
        const pdfBuffer = await generateBiographyPDF(student, studentBiography);

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
                {
                    resource_type: "raw",
                    folder: "student_biographies",
                    format: "pdf",
                    public_id: `biography_${adm_no}_${Date.now()}`
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(pdfBuffer);
        });

        res.json({
            success: true,
            message: "Biography PDF generated successfully!",
            downloadUrl: uploadResult.secure_url,
            filename: `Biography_${student['Full Name'].replace(/\s+/g, '_')}.pdf`
        });

    } catch (error) {
        console.error("Error generating biography PDF:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate biography PDF",
            error: error.message
        });
    }
});

// ✅ NEW: Download Report Route
router.get("/:adm_no/download-report/:public_id", async (req, res) => {
    try {
        const { adm_no, public_id } = req.params;
        
        // Get report information
        const reports = getStudentReports(adm_no);
        const report = reports.find(r => r.PublicId === public_id || r.public_id === public_id);
        
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Redirect to Cloudinary download URL
        const downloadUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/fl_attachment:${report.Filename || report.filename}/${public_id}`;
        
        res.redirect(downloadUrl);

    } catch (error) {
        console.error("Error downloading report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to download report",
            error: error.message
        });
    }
});

// ===== UNIVERSAL PDF GENERATION SYSTEM =====

// Font & Color Constants
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const FONT_ITALIC = 'Helvetica-Oblique';
const COLOR_TITLE = '#2c3e50';
const COLOR_TEXT = '#34495e';
const COLOR_MUTED = '#7f8c8d';
const COLOR_BG = '#f8f9fa';
const COLOR_STROKE = '#bdc3c7';

// Helper function to check if data is empty
const isEmpty = (data) => !data || data.trim() === '';

// Helper function to format text with fallback
const C = (text, fallback = "No update was provided for this section.") => {
    return isEmpty(text) ? fallback : text;
};

// Helper function to get pronouns based on gender
const getPronouns = (student) => {
    const gender = student["Gender"] ? student["Gender"].toLowerCase() : '';
    
    if (gender.includes('female') || gender === 'f') {
        return {
            subject: 'she',
            object: 'her',
            possessive: 'her',
            reflexive: 'herself',
            isFemale: true
        };
    } else if (gender.includes('male') || gender === 'm') {
        return {
            subject: 'he',
            object: 'him',
            possessive: 'his',
            reflexive: 'himself',
            isFemale: false
        };
    } else {
        // Default to neutral/unknown
        return {
            subject: 'they',
            object: 'them',
            possessive: 'their',
            reflexive: 'themselves',
            isFemale: false
        };
    }
};

// Draw page footer
function drawPageFooter(doc, pageNum, student) {
    const pageBottom = doc.page.height - 40;
    doc.fillColor(COLOR_MUTED)
        .font(FONT_REGULAR)
        .fontSize(8)
        .text(
            `Page ${pageNum} of 3 | Confidential Report for ${student["Full Name"]} | Daisy Education Portal`,
            doc.page.margins.left,
            pageBottom,
            { align: 'center', width: doc.page.width - doc.page.margins.left * 2 }
        );
}

// Draw main header for Page 1
function drawMainHeader(doc) {
    doc.fillColor(COLOR_TITLE)
        .font(FONT_BOLD)
        .fontSize(20)
        .text('LEARNER PROGRESS REPORT', 50, 50, { align: 'center' });

    doc.fillColor(COLOR_MUTED)
        .font(FONT_REGULAR)
        .fontSize(9)
        .text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`, 50, 75, { align: 'center' });
}

// Draw continuation header for Pages 2 & 3
function drawContinuationHeader(doc, student) {
    doc.fillColor(COLOR_MUTED)
        .font(FONT_REGULAR)
        .fontSize(9)
        .text('LEARNER PROGRESS REPORT (Cont.)', 50, 30)
        .text(
            `Learner: ${student["Full Name"]} | Admission No: ${student["Admission Number"]}`,
            50, 40
        );
}

// Draw profile box with student information
function drawProfileBox(doc, student, term) {
    const boxY = 110;
    const boxHeight = 125;
    
    // Background box
    doc.rect(50, boxY, 500, boxHeight)
       .fill(COLOR_BG)
       .stroke(COLOR_STROKE);
    
    const x = 65;
    const y = boxY + 15;
    const col1 = x;
    const col2 = x + 100;
    const col3 = x + 260;
    const col4 = x + 340;

    // Title
    doc.fillColor(COLOR_TITLE)
       .font(FONT_BOLD)
       .fontSize(12)
       .text('LEARNER PROFILE', col1, y);

    // Left Column Labels
    doc.fillColor(COLOR_TEXT)
       .font(FONT_REGULAR)
       .fontSize(10)
       .text('Full Name:', col1, y + 25)
       .text('Admission No:', col1, y + 40)
       .text('Gender:', col1, y + 55)
       .text('Sponsor Group:', col1, y + 70)
       .text('Academic Level:', col1, y + 85);
    
    // Left Column Data
    doc.font(FONT_BOLD)
       .text(C(student["Full Name"], "N/A"), col2, y + 25)
       .text(C(student["Admission Number"], "N/A"), col2, y + 40)
       .text(C(student["Gender"], "N/A"), col2, y + 55)
       .text(C(student["Sponsorship Group"], "N/A"), col2, y + 70)
       .text(C(student["Educational Level"], "N/A"), col2, y + 85);
    
    // Right Column Labels
    doc.font(FONT_REGULAR)
       .text('Report Period:', col3, y + 25)
       .text('Program:', col3, y + 40);

    // Right Column Data
    doc.font(FONT_BOLD)
       .text(C(term["TermName"], "N/A"), col4, y + 25)
       .text(C(student["Department"], "N/A"), col4, y + 40);

    // Profile Picture Placeholder (Right side)
    const profilePicX = 420;
    const profilePicY = y;
    const profilePicSize = 70;

    doc.rect(profilePicX, profilePicY, profilePicSize, profilePicSize)
       .fill('#e9ecef')
       .stroke(COLOR_STROKE);

    doc.fillColor(COLOR_MUTED)
       .font(FONT_ITALIC)
       .fontSize(8)
       .text('PROFILE\nIMAGE', profilePicX + 5, profilePicY + 25, { 
           width: profilePicSize - 10, 
           align: 'center' 
       });

    doc.y = boxY + boxHeight + 30;
}

// Draw section with title and content
function drawSection(doc, title, content, options = {}) {
    const { bullet = false } = options;

    // Section Title
    doc.fillColor(COLOR_TITLE)
       .font(FONT_BOLD)
       .fontSize(12)
       .text(title, 50, doc.y, { underline: true });
    
    doc.y += 20;

    // Content
    doc.fillColor(COLOR_TEXT)
       .font(FONT_REGULAR)
       .fontSize(10);

    if (bullet) {
        // Handle bullet points
        const lines = content.split('\n');
        const bulletRadius = 2;
        
        lines.forEach((line, index) => {
            if (line.trim()) {
                const bulletX = 50;
                const textX = 65;
                
                // Draw bullet point
                doc.circle(bulletX, doc.y + 4, bulletRadius)
                   .fill(COLOR_TITLE);
                
                // Draw text
                doc.text(line.trim(), textX, doc.y, {
                    width: 485,
                    align: 'justify',
                    lineGap: 1.2
                });
                
                doc.y += doc.currentLineHeight() + 2;
            }
        });
    } else {
        // Regular paragraph
        doc.text(content, 50, doc.y, {
            width: 500,
            align: 'justify',
            lineGap: 1.2
        });
        
        doc.y += doc.currentLineHeight();
    }
    
    doc.y += 15;
}

// NEW: Biography PDF Generation Function
const generateBiographyPDF = (student, biography) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                info: {
                    Title: `Student Biography - ${student["Full Name"]}`,
                    Author: 'Daisy Education Portal',
                    Subject: `Student Biography - ${student["Full Name"]}`,
                    Keywords: 'student, biography, education, profile'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            doc.fillColor(COLOR_TITLE)
               .font(FONT_BOLD)
               .fontSize(20)
               .text('STUDENT BIOGRAPHY', 50, 50, { align: 'center' });

            doc.fillColor(COLOR_MUTED)
               .font(FONT_REGULAR)
               .fontSize(10)
               .text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
                   weekday: 'long', 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric' 
               })}`, 50, 75, { align: 'center' });

            // Student Profile Box
            const boxY = 110;
            const boxHeight = 100;
            
            doc.rect(50, boxY, 500, boxHeight)
               .fill(COLOR_BG)
               .stroke(COLOR_STROKE);

            const x = 65;
            const y = boxY + 15;

            // Profile Title
            doc.fillColor(COLOR_TITLE)
               .font(FONT_BOLD)
               .fontSize(12)
               .text('STUDENT PROFILE', x, y);

            // Student Information
            doc.fillColor(COLOR_TEXT)
               .font(FONT_REGULAR)
               .fontSize(10)
               .text('Full Name:', x, y + 25)
               .text('Admission No:', x, y + 40)
               .text('Department:', x, y + 55)
               .text('Educational Level:', x, y + 70);

            doc.font(FONT_BOLD)
               .text(C(student["Full Name"], "N/A"), x + 80, y + 25)
               .text(C(student["Admission Number"], "N/A"), x + 80, y + 40)
               .text(C(student["Department"], "N/A"), x + 80, y + 55)
               .text(C(student["Educational Level"], "N/A"), x + 80, y + 70);

            // Right side information
            doc.font(FONT_REGULAR)
               .text('Gender:', x + 250, y + 25)
               .text('Sponsor Group:', x + 250, y + 40)
               .text('Age:', x + 250, y + 55);

            doc.font(FONT_BOLD)
               .text(C(student["Gender"], "N/A"), x + 300, y + 25)
               .text(C(student["Sponsorship Group"], "N/A"), x + 300, y + 40)
               .text(C(student["Age"], "N/A"), x + 300, y + 55);

            doc.y = boxY + boxHeight + 30;

            // Biography Section
            doc.fillColor(COLOR_TITLE)
               .font(FONT_BOLD)
               .fontSize(14)
               .text('BIOGRAPHY', 50, doc.y, { underline: true });

            doc.y += 25;

            // Biography Content
            doc.fillColor(COLOR_TEXT)
               .font(FONT_REGULAR)
               .fontSize(11)
               .text(biography, 50, doc.y, {
                   width: 500,
                   align: 'justify',
                   lineGap: 1.5
               });

            // Footer
            const pageBottom = doc.page.height - 40;
            doc.fillColor(COLOR_MUTED)
               .font(FONT_REGULAR)
               .fontSize(8)
               .text(
                   `Biography for ${student["Full Name"]} | Daisy Education Portal | ${new Date().toLocaleDateString()}`,
                   doc.page.margins.left,
                   pageBottom,
                   { align: 'center', width: doc.page.width - doc.page.margins.left * 2 }
               );

            doc.end();

        } catch (error) {
            console.error('Biography PDF Generation Error:', error);
            reject(error);
        }
    });
};

// Main Universal PDF Generation Function
const generateUniversalReport = (student, term) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                info: {
                    Title: `Mini India Progress Report - ${student["Full Name"]}`,
                    Author: 'Daisy Education Portal',
                    Subject: `Academic Progress Report - ${term["TermName"]}`,
                    Keywords: 'education, progress, report, student, sponsor, mini india'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            const pronouns = getPronouns(student);

            // === PAGE 1: OVERVIEW & ACADEMICS ===
            doc.addPage();
            drawMainHeader(doc);
            drawProfileBox(doc, student, term);

            // 1. Executive Summary
            drawSection(
                doc,
                "1. Executive Summary",
                C(term["ExecutiveSummary"])
            );

            // 2. Academic Progress & Achievements
            const academicText = `${C(term["AcademicOverview"])}\n\n` +
                `Overall Grade: ${C(term["AcademicGrade"], "Not specified")}\n` +
                `Class Rank: ${C(term["AcademicRank"], "Not specified")}\n` +
                `Key Strengths: ${C(term["AcademicStrengths"], "None noted")}\n` +
                `Key Challenges: ${C(term["AcademicChallenges"], "None noted")}`;
            
            drawSection(
                doc,
                "2. Academic Progress & Achievements",
                academicText,
                { bullet: true }
            );

            // 3. Personal & Social Development
            const personalText = `At School: ${C(term["PersonalSchool"])}\n` +
                `Extracurricular Involvement: ${C(term["PersonalExtra"], "Not involved in any activities this term")}`;
            
            drawSection(
                doc,
                "3. Personal & Social Development",
                personalText,
                { bullet: true }
            );

            // 4. Home Environment Update
            const homeText = `Update Method: ${C(term["HomeUpdateMethod"], "No specific update method recorded")}\n` +
                `Coordinator's Notes: ${C(term["HomeEnvironment"])}`;

            drawSection(
                doc,
                "4. Home Environment Update",
                homeText,
                { bullet: true }
            );

            drawPageFooter(doc, 1, student);

            // === PAGE 2: PLANNING & NEEDS ===
            doc.addPage();
            drawContinuationHeader(doc, student);
            doc.y = 70;

            // 5. Next Term Planning & Goals
            const nextTermDate = term["NextTermDate"] ? new Date(term["NextTermDate"]).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : "Not specified";

            const planningText = `Expected Return Date: ${nextTermDate}\n` +
                `Academic Goals: ${C(term["GoalsAcademic"])}\n` +
                `Personal Goals: ${C(term["GoalsPersonal"])}`;
            
            drawSection(
                doc,
                "5. Next Term Planning & Goals",
                planningText,
                { bullet: true }
            );

            // 6. Next Term Requirements & Needs
            const feesDueDate = term["FeesDueDate"] ? new Date(term["FeesDueDate"]).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : "Not specified";

            const needsText = `School Fees: ${C(term["FeesAmount"] ? `KES ${term["FeesAmount"]}` : "N/A")}. Due: ${feesDueDate}\n` +
                `School Uniform: ${C(term["UniformNotes"])}\n` +
                `Textbooks & Supplies: ${C(term["BookList"])}\n` +
                `Transport: ${C(term["TransportNotes"])}\n` +
                `Other Needs: ${C(term["OtherNeeds"], "None specified")}`;

            drawSection(
                doc,
                "6. Next Term Requirements & Needs",
                needsText,
                { bullet: true }
            );

            drawPageFooter(doc, 2, student);

            // === PAGE 3: RECOMMENDATIONS & CONCLUSION ===
            doc.addPage();
            drawContinuationHeader(doc, student);
            doc.y = 70;

            // 7. Coordinator's Recommendations
            const recommendationsText = `Academic Support: ${C(term["RecommendAcademic"], `Continue ${pronouns.possessive} current study patterns`)}\n` +
                `Material & Personal Support: ${C(term["RecommendMaterial"], `No specific material needs recommended at this time`)}`;

            drawSection(
                doc,
                `7. Coordinator's Recommendations (To Support ${student["Full Name"]})`,
                recommendationsText,
                { bullet: true }
            );

            // 8. Concluding Remarks
            const concludingText = C(term["ConcludingRemark"], 
                `${student["Full Name"]} continues to show steady progress and maintains good standing in ${pronouns.possessive} academic and social life. ${pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1)} consistent effort and positive engagement are commendable and highly appreciated. We look forward to ${pronouns.possessive} continued development and success in the next term.`
            );

            drawSection(
                doc,
                "8. Concluding Remarks",
                concludingText
            );

            drawPageFooter(doc, 3, student);

            doc.end();

        } catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        }
    });
};

// Export router
export default router;