require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

async function checkAdminStatus(email) {
  try {
    // Get the user by email
    const user = await admin.auth().getUserByEmail(email);
    // Get the user's custom claims
    const userRecord = await admin.auth().getUser(user.uid);
    const claims = userRecord.customClaims || {};

    console.log(`User Claims for ${email}:`, claims);
    if (claims && claims.admin) {
      console.log(`${email} has admin claim.`);
    } else {
      console.log(`${email} does NOT have admin claim.`);
    }
  } catch (error) {
    console.error("Error checking admin status:", error.message);
    if (error.code === 'auth/user-not-found') {
      console.log(`User with email ${email} does not exist.`);
    }
  }
}

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Admin claim set for ${email}`);
  } catch (error) {
    console.error("Error setting admin claim:", error.message);
  }
}

// Run the script
async function main() {
  const email = 'cesurgroupuk@gmail.com';
  console.log('Checking initial admin status...');
  await checkAdminStatus(email);
  
  console.log('\nSetting admin claim...');
  await setAdminClaim(email);
  
  console.log('\nVerifying admin status after setting claim...');
  await checkAdminStatus(email);
}

main().catch(console.error);