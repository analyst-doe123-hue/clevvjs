// lib/studentDataStore.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Initialize CSV files with headers if they don't exist - UPDATED with new fields
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

// Helper function to read CSV
const readCSV = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');

        if (lines.length <= 1) return [];

        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
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
            const row = headers.map(header => entry[header] || '').join(',');
            content += row + '\n';
        });

        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing to CSV file ${filePath}:`, error);
        return false;
    }
};

// Append to CSV file
const appendToCSV = (filePath, data, headers) => {
    try {
        const row = headers.map(header => data[header] || '').join(',');
        fs.appendFileSync(filePath, row + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error(`Error appending to CSV file ${filePath}:`, error);
        return false;
    }
};

// Student Terms Functions - UPDATED for COMPREHENSIVE form structure
export const getStudentTerms = (adm_no) => {
    const terms = readCSV(TERMS_FILE);
    const studentTerms = terms.filter(term => term.AdmissionNumber === adm_no)
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    return studentTerms;
};

// NEW: Add comprehensive student term with all fields
export const addStudentTerm = (adm_no, termData) => {
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
        NextTermDate: nextTermDate,
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

    return appendToCSV(TERMS_FILE, newTerm, [
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
};

// Helper function to get latest term
export const getLatestStudentTerm = (adm_no) => {
    const terms = getStudentTerms(adm_no);
    return terms.length > 0 ? terms[0] : null;
};

// Student Reports Functions
export const getStudentReports = (adm_no) => {
    const reports = readCSV(REPORTS_FILE);
    return reports.filter(report => report.AdmissionNumber === adm_no)
        .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
};

export const addStudentReport = (adm_no, filename, public_id) => {
    const newReport = {
        AdmissionNumber: adm_no,
        Filename: filename,
        PublicId: public_id,
        CreatedAt: new Date().toISOString()
    };

    return appendToCSV(REPORTS_FILE, newReport, ['AdmissionNumber', 'Filename', 'PublicId', 'CreatedAt']);
};

// Student Biography Functions
export const getStudentBiography = (adm_no) => {
    const biographies = readCSV(BIOGRAPHIES_FILE);
    const bio = biographies.find(b => b.AdmissionNumber === adm_no);
    return bio ? bio.Biography : '';
};

export const updateStudentBiography = (adm_no, biography) => {
    const biographies = readCSV(BIOGRAPHIES_FILE);

    // Remove existing biography for this student
    const filteredBios = biographies.filter(b => b.AdmissionNumber !== adm_no);

    // Add new biography
    const newBio = {
        AdmissionNumber: adm_no,
        Biography: biography,
        LastUpdated: new Date().toISOString()
    };

    filteredBios.push(newBio);

    return writeCSV(BIOGRAPHIES_FILE, filteredBios, ['AdmissionNumber', 'Biography', 'LastUpdated']);
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

export default {
    getStudentTerms,
    addStudentTerm,
    getLatestStudentTerm,
    getStudentReports,
    addStudentReport,
    getStudentBiography,
    updateStudentBiography,
    getStudentGallery
};