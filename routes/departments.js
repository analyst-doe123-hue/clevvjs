// routes/departments.js
import express from "express";
import { readCSV } from "../lib/csvStore.js";

const router = express.Router();

// Department mapping with proper case sensitivity
const departmentMapping = {
    'germans': 'Germans',
    'italians': 'Italians',
    'education': 'Education for Generations',
    'education for generation': 'Education for Generations',
    'education-for-generation': 'Education for Generations',
    'warmhearted': 'Warmhearted Group',
    'warmhearted group': 'Warmhearted Group',
    'warmhearted-group': 'Warmhearted Group',
    'assisted': 'Assisted Group',
    'assisted group': 'Assisted Group',
    'assisted-group': 'Assisted Group'
};

// GET /departments — Show all departments
router.get("/", async (req, res) => {
    try {
        const students = await readCSV("students.csv");
        const departments = [...new Set(students.map(s => s.Department).filter(Boolean))];

        res.render("department", {
            title: "Departments | Daisy Portal",
            departments,
            q: ""
        });
    } catch (error) {
        console.error("Error loading departments:", error);
        res.status(500).render("error", {
            title: "Server Error",
            error: "Server Error",
            message: "Unable to load departments page"
        });
    }
});

// GET /departments/:dept_name — Show students in a specific department
router.get("/:dept_name", async (req, res) => {
    try {
        const deptName = req.params.dept_name.toLowerCase();
        console.log("Requested department:", deptName);

        // Map URL parameter to actual department name
        const mappedDept = departmentMapping[deptName] || deptName;
        console.log("Mapped department:", mappedDept);

        const students = await readCSV("students.csv");

        // Debug: log all unique departments in CSV
        const allDepartments = [...new Set(students.map(s => s.Department).filter(Boolean))];
        console.log("All departments in CSV:", allDepartments);

        // Case-insensitive search for department
        const deptStudents = students.filter(s => {
            if (!s.Department) return false;

            const studentDept = s.Department.toLowerCase().trim();
            const searchDept = mappedDept.toLowerCase().trim();

            return studentDept === searchDept;
        });

        console.log("Found students:", deptStudents.length);

        if (deptStudents.length === 0) {
            return res.status(404).render("error", {
                title: "Department Not Found",
                error: "Department Not Found",
                message: `No students found in department: ${mappedDept}. Available departments: ${allDepartments.join(', ')}`
            });
        }

        // Group by academic level with better classification
        const levels = {
            'Primary': deptStudents.filter(s => s.Class && (
                s.Class.includes('Pri.') || s.Class.includes('PP.') || s.Class.includes('Pre-Pri.') ||
                s.Class.includes('Grade') || s.Class.match(/Class\s*[1-8]/i) ||
                s.Class.includes('Primary') || s.Class.includes('Std')
            )),
            'Highschool': deptStudents.filter(s => s.Class && (
                s.Class.includes('JSS') || s.Class.includes('Form') || s.Class.includes('SS') ||
                s.Class.match(/Form\s*[1-4]/i) || s.Class.includes('Secondary') ||
                s.Class.includes('High School') || s.Class.includes('Highschool')
            )),
            'University': deptStudents.filter(s => s.Class && (
                s.Class.includes('Yr') || s.Class.includes('University') || s.Class.includes('College') ||
                s.Class.includes('Year') || s.Class.includes('Campus') || s.Class.includes('Degree') ||
                s.Class.includes('Bachelor') || s.Class.includes('Diploma')
            )),
            'Other': deptStudents.filter(s => !s.Class || (
                !s.Class.includes('Pri.') && !s.Class.includes('Form') && !s.Class.includes('Yr') &&
                !s.Class.includes('Grade') && !s.Class.includes('University')
            ))
        };

        res.render("department_search", {
            title: `${mappedDept} Department | Daisy Portal`,
            dept: mappedDept,
            students: deptStudents,
            levels: levels,
            totalStudents: deptStudents.length,
            q: ""
        });
    } catch (error) {
        console.error("Error loading department:", error);
        res.status(500).render("error", {
            title: "Server Error",
            error: "Server Error",
            message: "Unable to load department page"
        });
    }
});

// GET /departments/:dept_name/:level — Filter by academic level
router.get("/:dept_name/:level", async (req, res) => {
    try {
        const { dept_name, level } = req.params;
        const mappedDept = departmentMapping[dept_name.toLowerCase()] || dept_name;

        const students = await readCSV("students.csv");
        let deptStudents = students.filter(s =>
            s.Department && s.Department.toLowerCase() === mappedDept.toLowerCase()
        );

        if (deptStudents.length === 0) {
            return res.status(404).render("error", {
                title: "Department Not Found",
                error: "Department Not Found",
                message: `No students found in department: ${mappedDept}`
            });
        }

        // Filter by level with better classification
        if (level === 'primary') {
            deptStudents = deptStudents.filter(s => s.Class && (
                s.Class.includes('Pri.') || s.Class.includes('PP.') || s.Class.includes('Pre-Pri.') ||
                s.Class.includes('Grade') || s.Class.match(/Class\s*[1-8]/i) ||
                s.Class.includes('Primary') || s.Class.includes('Std')
            ));
        } else if (level === 'highschool') {
            deptStudents = deptStudents.filter(s => s.Class && (
                s.Class.includes('JSS') || s.Class.includes('Form') || s.Class.includes('SS') ||
                s.Class.match(/Form\s*[1-4]/i) || s.Class.includes('Secondary') ||
                s.Class.includes('High School') || s.Class.includes('Highschool')
            ));
        } else if (level === 'university') {
            deptStudents = deptStudents.filter(s => s.Class && (
                s.Class.includes('Yr') || s.Class.includes('University') || s.Class.includes('College') ||
                s.Class.includes('Year') || s.Class.includes('Campus') || s.Class.includes('Degree') ||
                s.Class.includes('Bachelor') || s.Class.includes('Diploma')
            ));
        } else if (level === 'other') {
            deptStudents = deptStudents.filter(s => !s.Class || (
                !s.Class.includes('Pri.') && !s.Class.includes('Form') && !s.Class.includes('Yr') &&
                !s.Class.includes('Grade') && !s.Class.includes('University')
            ));
        }

        // Get all levels for sidebar
        const allDeptStudents = students.filter(s =>
            s.Department && s.Department.toLowerCase() === mappedDept.toLowerCase()
        );

        const levels = {
            'Primary': allDeptStudents.filter(s => s.Class && (
                s.Class.includes('Pri.') || s.Class.includes('PP.') || s.Class.includes('Pre-Pri.') ||
                s.Class.includes('Grade') || s.Class.match(/Class\s*[1-8]/i) ||
                s.Class.includes('Primary') || s.Class.includes('Std')
            )),
            'Highschool': allDeptStudents.filter(s => s.Class && (
                s.Class.includes('JSS') || s.Class.includes('Form') || s.Class.includes('SS') ||
                s.Class.match(/Form\s*[1-4]/i) || s.Class.includes('Secondary') ||
                s.Class.includes('High School') || s.Class.includes('Highschool')
            )),
            'University': allDeptStudents.filter(s => s.Class && (
                s.Class.includes('Yr') || s.Class.includes('University') || s.Class.includes('College') ||
                s.Class.includes('Year') || s.Class.includes('Campus') || s.Class.includes('Degree') ||
                s.Class.includes('Bachelor') || s.Class.includes('Diploma')
            )),
            'Other': allDeptStudents.filter(s => !s.Class || (
                !s.Class.includes('Pri.') && !s.Class.includes('Form') && !s.Class.includes('Yr') &&
                !s.Class.includes('Grade') && !s.Class.includes('University')
            ))
        };

        res.render("department_search", {
            title: `${mappedDept} ${level.charAt(0).toUpperCase() + level.slice(1)} | Daisy Portal`,
            dept: mappedDept,
            students: deptStudents,
            levels: levels,
            totalStudents: deptStudents.length,
            currentLevel: level,
            q: ""
        });
    } catch (error) {
        console.error("Error loading department level:", error);
        res.status(500).render("error", {
            title: "Server Error",
            error: "Server Error",
            message: "Unable to load department level page"
        });
    }
});

// POST /departments/search — Search within department
router.post("/search", async (req, res) => {
    try {
        const { adm_no, department } = req.body;

        if (!adm_no) {
            return res.redirect(`/departments/${department.toLowerCase().replace(/\s+/g, '-')}`);
        }

        const students = await readCSV("students.csv");

        // Find student by admission number
        const student = students.find(s =>
            s["Admission Number"].toLowerCase() === adm_no.toLowerCase()
        );

        if (!student) {
            const deptStudents = students.filter(s =>
                s.Department && s.Department.toLowerCase() === department.toLowerCase()
            );

            const levels = {
                'Primary': deptStudents.filter(s => s.Class && (
                    s.Class.includes('Pri.') || s.Class.includes('PP.') || s.Class.includes('Pre-Pri.') ||
                    s.Class.includes('Grade') || s.Class.match(/Class\s*[1-8]/i) ||
                    s.Class.includes('Primary') || s.Class.includes('Std')
                )),
                'Highschool': deptStudents.filter(s => s.Class && (
                    s.Class.includes('JSS') || s.Class.includes('Form') || s.Class.includes('SS') ||
                    s.Class.match(/Form\s*[1-4]/i) || s.Class.includes('Secondary') ||
                    s.Class.includes('High School') || s.Class.includes('Highschool')
                )),
                'University': deptStudents.filter(s => s.Class && (
                    s.Class.includes('Yr') || s.Class.includes('University') || s.Class.includes('College') ||
                    s.Class.includes('Year') || s.Class.includes('Campus') || s.Class.includes('Degree') ||
                    s.Class.includes('Bachelor') || s.Class.includes('Diploma')
                )),
                'Other': deptStudents.filter(s => !s.Class || (
                    !s.Class.includes('Pri.') && !s.Class.includes('Form') && !s.Class.includes('Yr') &&
                    !s.Class.includes('Grade') && !s.Class.includes('University')
                ))
            };

            return res.render("department_search", {
                title: `${department} Department | Daisy Portal`,
                dept: department,
                students: deptStudents,
                levels: levels,
                totalStudents: deptStudents.length,
                error: `No student found with admission number: ${adm_no}`,
                q: ""
            });
        }

        // Check if student belongs to the department
        if (student.Department.toLowerCase() !== department.toLowerCase()) {
            const deptStudents = students.filter(s =>
                s.Department && s.Department.toLowerCase() === department.toLowerCase()
            );

            const levels = {
                'Primary': deptStudents.filter(s => s.Class && (
                    s.Class.includes('Pri.') || s.Class.includes('PP.') || s.Class.includes('Pre-Pri.') ||
                    s.Class.includes('Grade') || s.Class.match(/Class\s*[1-8]/i) ||
                    s.Class.includes('Primary') || s.Class.includes('Std')
                )),
                'Highschool': deptStudents.filter(s => s.Class && (
                    s.Class.includes('JSS') || s.Class.includes('Form') || s.Class.includes('SS') ||
                    s.Class.match(/Form\s*[1-4]/i) || s.Class.includes('Secondary') ||
                    s.Class.includes('High School') || s.Class.includes('Highschool')
                )),
                'University': deptStudents.filter(s => s.Class && (
                    s.Class.includes('Yr') || s.Class.includes('University') || s.Class.includes('College') ||
                    s.Class.includes('Year') || s.Class.includes('Campus') || s.Class.includes('Degree') ||
                    s.Class.includes('Bachelor') || s.Class.includes('Diploma')
                )),
                'Other': deptStudents.filter(s => !s.Class || (
                    !s.Class.includes('Pri.') && !s.Class.includes('Form') && !s.Class.includes('Yr') &&
                    !s.Class.includes('Grade') && !s.Class.includes('University')
                ))
            };

            return res.render("department_search", {
                title: `${department} Department | Daisy Portal`,
                dept: department,
                students: deptStudents,
                levels: levels,
                totalStudents: deptStudents.length,
                error: `Student ${adm_no} does not belong to ${department} department`,
                q: ""
            });
        }

        res.redirect(`/students/${adm_no}`);
    } catch (error) {
        console.error("Error searching department:", error);
        res.status(500).render("error", {
            title: "Server Error",
            error: "Server Error",
            message: "Unable to process search request"
        });
    }
});
router.get("/", (req, res) => {
    res.render("department", {
        title: "Departments",
        department: null,
        message: "Please select a department.",
    });
});

export default router;