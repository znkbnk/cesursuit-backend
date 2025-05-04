// Run this migration script
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://cesur-suits.firebaseio.com'
});

async function setAdminClaim() {
    await admin.auth().setCustomUserClaims('grPYsM1ZtTRXfYjmpnTJuyMDog62', { admin: true });
    console.log("Admin claim set successfully");
  }
  setAdminClaim();