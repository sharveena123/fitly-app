require('dotenv').config();
const express = require('express');
const path = require('path');
const exec = require('child_process').exec; 
const app = express();
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');

app.use(express.json());

// combine frontend layouts and backend APIs onto Port 3000
app.use(express.static(__dirname)); 

// authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  
  // automatically runs a hidden system command to launch app instantly
  const url = `http://localhost:${PORT}`;
  const startCommand = process.platform === 'darwin' ? `open ${url}` : process.platform === 'win32' ? `start ${url}` : `xdg-open ${url}`;
  exec(startCommand);
});

module.exports = app;
