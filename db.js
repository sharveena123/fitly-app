const mongoose = require('mongoose');
const { client, enabled } = require('./lib/supabase');

const connectDB = async () => {
  if (enabled) {
    const { error } = await client.from('users').select('id').limit(1);
    if (error) throw new Error(`Supabase connection failed: ${error.message}`);
    console.log('Supabase connected successfully');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;