// Every test starts signed in as the demo account, with its data and the
// catalog in SQLite (like right after the first sync). See src/test/seed.ts.
const { seedDatabase } = require('./src/test/seed');

beforeEach(() => {
  seedDatabase();
});
