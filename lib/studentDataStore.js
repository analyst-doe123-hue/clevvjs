// lib/studentDataStore.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isMongoDBAvailable, getDB, COLLECTIONS } from './databaseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const TERMS_FILE = path.join(DATA_DIR, 'terms.csv');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.csv');
const BIOGRAPHIES_FILE = path.join(DATA_DIR, 'biographies.csv');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize CSV files with headers if they don't exist
const initializeFile = (filePath, headers) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, headers.join(',') + '\n');
    }
};

// Initialize all data files with COMPREHENSIVE term structure
initializeFile(TERMS_FILE, [
    'AdmissionNumber',
    'TermName',
    'ExecutiveSummary',
    'AcademicOverview',
    'AcademicGrade',
    'AcademicRank',
    'AcademicStrengths',
    'AcademicChallenges',
    'PersonalSchool',
    'PersonalExtra',
    'HomeEnvironment',
    'HomeUpdateMethod',
    'NextTermDate',
    'GoalsAcademic',
    'GoalsPersonal',
    'FeesAmount',
    'FeesDueDate',
    'UniformNotes',
    'BookList',
    'TransportNotes',
    'OtherNeeds',
    'RecommendAcademic',
    'RecommendMaterial',
    'ConcludingRemark',
    'Timestamp'
]);
initializeFile(REPORTS_FILE, ['AdmissionNumber', 'Filename', 'PublicId', 'CreatedAt']);
initializeFile(BIOGRAPHIES_FILE, ['AdmissionNumber', 'Biography', 'LastUpdated']);

// IMPROVED CSV PARSING: Handle quoted fields with commas
const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last field
    result.push(current);
    return result;
};

// Helper function to read CSV - FIXED: Proper CSV parsing
const readCSV = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');

        if (lines.length <= 1) return [];

        const headers = parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const entry = {};

            headers.forEach((header, index) => {
                entry[header] = values[index] || '';
            });

            data.push(entry);
        }

        return data;
    } catch (error) {
        console.error(`Error reading CSV file ${filePath}:`, error);
        return [];
    }
};

// Helper function to write to CSV
const writeCSV = (filePath, data, headers) => {
    try {
        let content = headers.join(',') + '\n';

        data.forEach(entry => {
            const row = headers.map(header => {
                let value = entry[header] || '';
                // Always quote values to be safe, or quote if contains comma, quote, or newline
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    // Escape existing quotes
                    value = value.replace(/"/g, '""');
                    value = `"${value}"`;
                }
                return value;
            }).join(',');
            content += row + '\n';
        });

        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing to CSV file ${filePath}:`, error);
        return false;
    }
};

// Append to CSV file - FIXED: Proper CSV formatting
const appendToCSV = (filePath, data, headers) => {
    try {
        // Properly escape and quote all values
        const row = headers.map(header => {
            let value = data[header] || '';
            // Always quote values to handle commas in TermName and other fields
            if (typeof value === 'string') {
                // Escape existing quotes
                value = value.replace(/"/g, '""');
                value = `"${value}"`;
            }
            return value;
        }).join(',');

        fs.appendFileSync(filePath, row + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error(`Error appending to CSV file ${filePath}:`, error);
        return false;
    }
};

// ========== MONGODB FUNCTIONS ==========

// Student Terms Functions - HYBRID: MongoDB with CSV fallback
export const getStudentTerms = async (adm_no) => {
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const terms = await db.collection(COLLECTIONS.TERMS)
                .find({ AdmissionNumber: adm_no })
                .sort({ Timestamp: -1 })
                .toArray();

            console.log(`📊 MongoDB: Found ${terms.length} terms for student ${adm_no}`);
            return terms;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    const terms = readCSV(TERMS_FILE);
    const studentTerms = terms.filter(term => term.AdmissionNumber === adm_no)
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    console.log(`📁 CSV: Found ${studentTerms.length} terms for student ${adm_no}`);
    return studentTerms;
};

export const addStudentTerm = async (adm_no, termData) => {
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
    } = termData;

    const newTerm = {
        AdmissionNumber: adm_no,
        TermName: termName,
        ExecutiveSummary: executiveSummary || '',
        AcademicOverview: academicOverview || '',
        AcademicGrade: academicGrade || '',
        AcademicRank: academicRank || '',
        AcademicStrengths: academicStrengths || '',
        AcademicChallenges: academicChallenges || '',
        PersonalSchool: personalSchool || '',
        PersonalExtra: personalExtra || '',
        HomeEnvironment: homeEnvironment || '',
        HomeUpdateMethod: homeUpdateMethod || '',
        NextTermDate: nextTermDate || '',
        GoalsAcademic: goalsAcademic || '',
        GoalsPersonal: goalsPersonal || '',
        FeesAmount: feesAmount || '',
        FeesDueDate: feesDueDate || '',
        UniformNotes: uniformNotes || '',
        BookList: bookList || '',
        TransportNotes: transportNotes || '',
        OtherNeeds: otherNeeds || '',
        RecommendAcademic: recommendAcademic || '',
        RecommendMaterial: recommendMaterial || '',
        ConcludingRemark: concludingRemark || '',
        Timestamp: new Date().toISOString()
    };

    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.TERMS).insertOne(newTerm);
            success = result.acknowledged;
            if (success) {
                console.log('✅ MongoDB: Term saved successfully for student:', adm_no);
            }
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback if MongoDB failed or not available
    if (!success) {
        success = appendToCSV(TERMS_FILE, newTerm, [
            'AdmissionNumber',
            'TermName',
            'ExecutiveSummary',
            'AcademicOverview',
            'AcademicGrade',
            'AcademicRank',
            'AcademicStrengths',
            'AcademicChallenges',
            'PersonalSchool',
            'PersonalExtra',
            'HomeEnvironment',
            'HomeUpdateMethod',
            'NextTermDate',
            'GoalsAcademic',
            'GoalsPersonal',
            'FeesAmount',
            'FeesDueDate',
            'UniformNotes',
            'BookList',
            'TransportNotes',
            'OtherNeeds',
            'RecommendAcademic',
            'RecommendMaterial',
            'ConcludingRemark',
            'Timestamp'
        ]);
        if (success) {
            console.log('✅ CSV: Term saved successfully for student:', adm_no);
        }
    }

    return success;
};

// DELETE term function
export const deleteStudentTerm = async (adm_no, termId) => {
    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.TERMS).deleteOne({
                AdmissionNumber: adm_no,
                _id: termId
            });
            success = result.deletedCount > 0;
            if (success) {
                console.log('✅ MongoDB: Term deleted successfully');
            }
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback - CSV doesn't have proper IDs, so we'll recreate the file without the term
    if (!success) {
        try {
            const terms = readCSV(TERMS_FILE);
            const filteredTerms = terms.filter(term =>
                !(term.AdmissionNumber === adm_no && term.Timestamp === termId)
            );

            if (filteredTerms.length < terms.length) {
                success = writeCSV(TERMS_FILE, filteredTerms, [
                    'AdmissionNumber', 'TermName', 'ExecutiveSummary', 'AcademicOverview',
                    'AcademicGrade', 'AcademicRank', 'AcademicStrengths', 'AcademicChallenges',
                    'PersonalSchool', 'PersonalExtra', 'HomeEnvironment', 'HomeUpdateMethod',
                    'NextTermDate', 'GoalsAcademic', 'GoalsPersonal', 'FeesAmount', 'FeesDueDate',
                    'UniformNotes', 'BookList', 'TransportNotes', 'OtherNeeds', 'RecommendAcademic',
                    'RecommendMaterial', 'ConcludingRemark', 'Timestamp'
                ]);
                if (success) {
                    console.log('✅ CSV: Term deleted successfully');
                }
            }
        } catch (error) {
            console.error('CSV delete error:', error);
        }
    }

    return success;
};

// UPDATE term function
export const updateStudentTerm = async (adm_no, termId, termData) => {
    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.TERMS).updateOne(
                { AdmissionNumber: adm_no, _id: termId },
                { $set: { ...termData, LastUpdated: new Date().toISOString() } }
            );
            success = result.modifiedCount > 0;
            if (success) {
                console.log('✅ MongoDB: Term updated successfully');
            }
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback - more complex for updates
    if (!success) {
        console.log('⚠️ CSV update not implemented - use delete and recreate');
    }

    return success;
};

// Student Reports Functions - HYBRID
export const getStudentReports = async (adm_no) => {
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const reports = await db.collection(COLLECTIONS.REPORTS)
                .find({ AdmissionNumber: adm_no })
                .sort({ CreatedAt: -1 })
                .toArray();
            return reports;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    const reports = readCSV(REPORTS_FILE);
    return reports.filter(report => report.AdmissionNumber === adm_no)
        .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
};

export const addStudentReport = async (adm_no, filename, public_id) => {
    const newReport = {
        AdmissionNumber: adm_no,
        Filename: filename,
        PublicId: public_id,
        CreatedAt: new Date().toISOString()
    };

    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.REPORTS).insertOne(newReport);
            success = result.acknowledged;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    if (!success) {
        success = appendToCSV(REPORTS_FILE, newReport, ['AdmissionNumber', 'Filename', 'PublicId', 'CreatedAt']);
    }

    return success;
};

// DELETE report function
export const deleteStudentReport = async (adm_no, public_id) => {
    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.REPORTS).deleteOne({
                AdmissionNumber: adm_no,
                PublicId: public_id
            });
            success = result.deletedCount > 0;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    if (!success) {
        try {
            const reports = readCSV(REPORTS_FILE);
            const filteredReports = reports.filter(report =>
                !(report.AdmissionNumber === adm_no && report.PublicId === public_id)
            );

            if (filteredReports.length < reports.length) {
                success = writeCSV(REPORTS_FILE, filteredReports, ['AdmissionNumber', 'Filename', 'PublicId', 'CreatedAt']);
            }
        } catch (error) {
            console.error('CSV delete error:', error);
        }
    }

    return success;
};

// Student Biography Functions - HYBRID
export const getStudentBiography = async (adm_no) => {
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const bio = await db.collection(COLLECTIONS.BIOGRAPHIES)
                .findOne({ AdmissionNumber: adm_no });
            return bio ? bio.Biography : '';
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    const biographies = readCSV(BIOGRAPHIES_FILE);
    const bio = biographies.find(b => b.AdmissionNumber === adm_no);
    return bio ? bio.Biography : '';
};

export const updateStudentBiography = async (adm_no, biography) => {
    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.BIOGRAPHIES)
                .updateOne(
                    { AdmissionNumber: adm_no },
                    {
                        $set: {
                            Biography: biography,
                            LastUpdated: new Date().toISOString()
                        }
                    },
                    { upsert: true }
                );
            success = result.acknowledged;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    if (!success) {
        const biographies = readCSV(BIOGRAPHIES_FILE);
        const filteredBios = biographies.filter(b => b.AdmissionNumber !== adm_no);
        const newBio = {
            AdmissionNumber: adm_no,
            Biography: biography,
            LastUpdated: new Date().toISOString()
        };
        filteredBios.push(newBio);
        success = writeCSV(BIOGRAPHIES_FILE, filteredBios, ['AdmissionNumber', 'Biography', 'LastUpdated']);
    }

    return success;
};

// DELETE biography function
export const deleteStudentBiography = async (adm_no) => {
    let success = false;

    // Try MongoDB first
    if (isMongoDBAvailable()) {
        try {
            const db = await getDB();
            const result = await db.collection(COLLECTIONS.BIOGRAPHIES)
                .deleteOne({ AdmissionNumber: adm_no });
            success = result.deletedCount > 0;
        } catch (error) {
            console.error('MongoDB error, falling back to CSV:', error.message);
        }
    }

    // CSV Fallback
    if (!success) {
        try {
            const biographies = readCSV(BIOGRAPHIES_FILE);
            const filteredBios = biographies.filter(b => b.AdmissionNumber !== adm_no);

            if (filteredBios.length < biographies.length) {
                success = writeCSV(BIOGRAPHIES_FILE, filteredBios, ['AdmissionNumber', 'Biography', 'LastUpdated']);
            }
        } catch (error) {
            console.error('CSV delete error:', error);
        }
    }

    return success;
};

// Helper function to get latest term
export const getLatestStudentTerm = async (adm_no) => {
    const terms = await getStudentTerms(adm_no);
    return terms.length > 0 ? terms[0] : null;
};

// Student Gallery Functions
export const getStudentGallery = (adm_no) => {
    // For now, return mock data
    return [
        {
            url: "/images/placeholder.jpg",
            note: "School event participation",
            public_id: "gallery_1"
        },
        {
            url: "/images/placeholder.jpg",
            note: "Academic award ceremony",
            public_id: "gallery_2"
        }
    ];
};

// FIXED: Remove duplicate exports - Use ONLY default export or named exports, not both
export default {
    getStudentTerms,
    addStudentTerm,
    deleteStudentTerm,
    updateStudentTerm,
    getLatestStudentTerm,
    getStudentReports,
    addStudentReport,
    deleteStudentReport,
    getStudentBiography,
    updateStudentBiography,
    deleteStudentBiography,
    getStudentGallery
};