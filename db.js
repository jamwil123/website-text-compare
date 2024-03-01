const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");

const serviceAccount = require("./f1-api-58639-firebase-adminsdk-vz3ne-60fffadcae.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

module.exports = db;
