const { PORT, DB } = require('./config');
const db = require('./db');
const app = require('./app');

(async () => {
  try {
    await db.init();
  } catch (e) {
    console.error('\n✗ Could not connect to MySQL at %s:%s as "%s".\n  → Open the XAMPP Control Panel and START "MySQL", then run again.\n  (%s)\n', DB.host, DB.port, DB.user, e.message);
    process.exit(1);
  }
  await require('./seed').seedIfEmpty();
  app.listen(PORT, () => console.log(`✓ BookConnect API running on http://localhost:${PORT}  (database: ${DB.database})`));
})();
