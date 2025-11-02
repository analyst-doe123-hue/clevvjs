// lib/csvStore.js
import { createObjectCsvWriter } from 'csv-writer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

export function readCSV(filename) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path.join(process.cwd(), 'data', filename))
            .pipe(csv())
            .on('data', (data) => {
                // Fix image paths - remove 'static/' prefix if present
                if (data.Photo && data.Photo.startsWith('static/')) {
                    data.Photo = data.Photo.replace('static/', '/');
                }
                results.push(data);
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

export function writeCSV(filename, header, data) {
    const csvWriter = createObjectCsvWriter({
        path: path.join(process.cwd(), 'data', filename),
        header: header.map(h => ({ id: h, title: h }))
    });
    return csvWriter.writeRecords(data);
}

// Helper function to get proper image URL
export function getStudentPhoto(student) {
    if (!student.Photo || student.Photo === 'static/images/') {
        return '/images/placeholder.jpg';
    }

    // Handle different path formats
    let photoPath = student.Photo;

    if (photoPath.startsWith('static/')) {
        photoPath = photoPath.replace('static/', '/');
    }

    if (photoPath.startsWith('/images/')) {
        return photoPath;
    }

    if (!photoPath.startsWith('/') && !photoPath.startsWith('http')) {
        photoPath = '/images/' + photoPath;
    }

    return photoPath;
}