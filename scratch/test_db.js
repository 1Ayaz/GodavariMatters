const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend dir
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const testDb = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log('Connecting to:', uri.replace(/:([^@]+)@/, ':****@')); // Hide password
        
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('✅ MongoDB Connected successfully!');
        
        // Try a simple query
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections in DB:', collections.map(c => c.name));
        
        // Try to count stores if model exists
        try {
            const Store = require('../backend/models/Store');
            const count = await Store.countDocuments();
            console.log('Total stores in DB:', count);
        } catch (e) {
            console.log('Could not load Store model or count stores:', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

testDb();
