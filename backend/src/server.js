const app = require('./app');
const { initDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database is not connected:', error.message);
    process.exit(1); // Exit with failure code so Nodemon waits for fixes
  }
};

startServer();