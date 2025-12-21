// src/server.js
const app = require('./app');
const { logPoolStats } = require('./config/db');

const PORT = process.env.PORT || 4000;

//periodic monitor for MySQL (auto-logs every 5 seconds)
// setInterval(() => {
//   console.log("🔍 MySQL Pool Status:");
//   logPoolStats();
// }, 10000);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
