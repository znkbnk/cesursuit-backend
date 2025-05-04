const admin = require('firebase-admin');
admin.initializeApp();

const uid = 'aqIAqeJZfGSMR4ZP8Rhb0rqdnFR2'; // Replace with the UID of zenikibeniki@gmail.com
admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log('Admin claim set'))
  .catch((error) => console.error('Error setting claim:', error));