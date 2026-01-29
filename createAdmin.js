const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use localhost instead of 127.0.0.1 for better compatibility
const MONGODB_URI = 'mongodb+srv://admin:admin123@cluster0.8x05n6z.mongodb.net/?appName=Cluster0';

console.log('🔧 Using MongoDB URI:', MONGODB_URI);

async function createAdmin() {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        
        // Simple connection without deprecated options
        await mongoose.connect(MONGODB_URI);
        
        console.log('✅ MongoDB Connected Successfully!');
        
        // Define User Schema
        const userSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true },
            email: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            role: { type: String, enum: ['admin', 'editor'], default: 'editor' },
            createdAt: { type: Date, default: Date.now }
        });
        
        const User = mongoose.model('User', userSchema);
        
        // Check if admin exists
        let admin = await User.findOne({ email: 'admin@example.com' });
        
        if (admin) {
            console.log('⚠️ Admin user already exists:');
            console.log('   Email:', admin.email);
            console.log('   Username:', admin.username);
            
            // Test password
            const isValid = await bcrypt.compare('admin123', admin.password);
            console.log('   Password test (admin123):', isValid ? '✅ Correct' : '❌ Incorrect');
        } else {
            // Create new admin
            console.log('👤 Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            admin = new User({
                username: 'admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin'
            });
            
            await admin.save();
            
            console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
            console.log('=====================================');
            console.log('📧 Email: admin@example.com');
            console.log('🔑 Password: admin123');
            console.log('👤 Username: admin');
            console.log('🎯 Role: admin');
            console.log('=====================================');
        }
        
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔍 MongoDB IS NOT RUNNING! Please:');
            console.log('1. Start MongoDB service:');
            console.log('   Windows: Press Win+R, type "services.msc", find "MongoDB" and start it');
            console.log('   Or run: net start MongoDB');
            console.log('2. If MongoDB is not installed, download from:');
            console.log('   https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi');
        }
        
        process.exit(1);
    }
}

createAdmin();