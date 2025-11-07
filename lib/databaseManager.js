// lib/databaseManager.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client;
let clientPromise;
let isMongoDBConnected = false;

// Database and Collection Names
const DB_NAME = 'student_portal';
const COLLECTIONS = {
    STUDENTS: 'students',
    TERMS: 'terms',
    REPORTS: 'reports',
    BIOGRAPHIES: 'biographies'
};

// Initialize MongoDB connection
async function initializeMongoDB() {
    if (!process.env.MONGODB_URI) {
        console.log('📝 MONGODB_URI not found in environment variables');
        return false;
    }

    try {
        const uri = process.env.MONGODB_URI;
        console.log('🔗 Attempting MongoDB connection...');

        const options = {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 15000,
        };

        // FIXED: Use a different variable name to avoid conflict
        const mongoClient = new MongoClient(uri, options);
        clientPromise = mongoClient.connect();

        // Test the connection
        const connectedClient = await clientPromise;
        const db = connectedClient.db(DB_NAME);
        await db.command({ ping: 1 });

        isMongoDBConnected = true;
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.log('❌ MongoDB connection failed:', error.message);
        isMongoDBConnected = false;
        return false;
    }
}

// Helper function to get database connection
async function getDB() {
    if (!isMongoDBConnected) {
        throw new Error('MongoDB not connected');
    }
    const connectedClient = await clientPromise;
    return connectedClient.db(DB_NAME);
}

// Initialize database collections and indexes
export async function initializeDatabase() {
    const mongoConnected = await initializeMongoDB();

    if (!mongoConnected) {
        console.log('📁 Using CSV storage (MongoDB not available)');
        return false;
    }

    try {
        const db = await getDB();

        // Create indexes for better performance
        await db.collection(COLLECTIONS.TERMS).createIndex({ AdmissionNumber: 1 });
        await db.collection(COLLECTIONS.REPORTS).createIndex({ AdmissionNumber: 1 });
        await db.collection(COLLECTIONS.BIOGRAPHIES).createIndex({ AdmissionNumber: 1 });
        await db.collection(COLLECTIONS.TERMS).createIndex({ Timestamp: -1 });
        await db.collection(COLLECTIONS.REPORTS).createIndex({ CreatedAt: -1 });

        console.log('✅ MongoDB collections initialized with indexes');
        console.log('📊 Database mode: MongoDB');
        return true;
    } catch (error) {
        console.error('❌ MongoDB initialization failed:', error.message);
        isMongoDBConnected = false;
        console.log('📁 Falling back to CSV storage');
        return false;
    }
}

// Test database connection
export async function testConnection() {
    if (!isMongoDBConnected) {
        return {
            success: false,
            message: "MongoDB not connected - using CSV fallback",
            mode: "CSV"
        };
    }

    try {
        const db = await getDB();
        await db.command({ ping: 1 });
        const collections = await db.listCollections().toArray();

        return {
            success: true,
            message: "MongoDB connected successfully",
            mode: "MongoDB",
            collections: collections.map(c => c.name),
            database: DB_NAME
        };
    } catch (error) {
        isMongoDBConnected = false;
        return {
            success: false,
            message: "MongoDB connection test failed",
            mode: "CSV",
            error: error.message
        };
    }
}

// Check if MongoDB is available
export function isMongoDBAvailable() {
    return isMongoDBConnected;
}

// Get database instance (for direct access if needed)
export async function getDatabase() {
    if (!isMongoDBConnected) {
        throw new Error('MongoDB not available');
    }
    return await getDB();
}

// Export COLLECTIONS for use in other files
export { COLLECTIONS };

// Helper function to get DB connection (for studentDataStore.js)
export { getDB };

export default {
    initializeDatabase,
    testConnection,
    isMongoDBAvailable,
    getDatabase,
    getDB,
    COLLECTIONS
};