const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Helper function to get server timestamp
const getServerTimestamp = () => {
  // For emulator, use current time. For production, use server timestamp
  if (process.env.FUNCTIONS_EMULATOR) {
    return new Date();
  }

  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (error) {
    console.error("Error accessing FieldValue.serverTimestamp:", error);
    // Fallback to current time
    return new Date();
  }
};

module.exports = {
  admin,
  db,
  getServerTimestamp,
};
