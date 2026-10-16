const bcrypt = require('bcrypt');

async function testPassword() {
  const hashAdmin = '$2b$10$VO9Wq0Md5/QaWfovtg8aq.FUcH4fqDR87FRRIgsNL5BooONgo4y0a';
  const match = await bcrypt.compare('password123', hashAdmin);
  console.log('Matches password123:', match);
}

testPassword();
