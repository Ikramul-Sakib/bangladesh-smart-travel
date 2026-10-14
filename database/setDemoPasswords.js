const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

async function setDemoPasswords() {
  try {
    const adminHash = await bcrypt.hash('Admin@1234', 12);
    const agentHash = await bcrypt.hash('Agent@1234', 12);
    const touristHash = await bcrypt.hash('Tourist@1234', 12);

    await pool.execute(`UPDATE users SET password_hash = ? WHERE role = 'admin'`, [adminHash]);
    await pool.execute(`UPDATE users SET password_hash = ? WHERE role = 'agent'`, [agentHash]);
    await pool.execute(`UPDATE users SET password_hash = ? WHERE role = 'tourist'`, [touristHash]);

    console.log('==========================================================');
    console.log('Demo Accounts Ready for Testing:');
    console.log('1. Admin   -> admin@bdsmarttravel.com        | Admin@1234');
    console.log('2. Agent 1 -> rafiq@bengalecotours.com       | Agent@1234');
    console.log('3. Agent 2 -> nusrat@hillsea.com             | Agent@1234');
    console.log('4. Agent 3 -> kamrul@sundarbanheritage.com   | Agent@1234');
    console.log('5. Tourist -> tanvir@example.com             | Tourist@1234');
    console.log('==========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update demo passwords:', error.message);
    process.exit(1);
  }
}

setDemoPasswords();