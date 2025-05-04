// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPq9fe4kZEI834cjOE9B_PY-vKcgv6tUk",
  authDomain: "calendarcuratortool.firebaseapp.com",
  databaseURL:
    "https://calendarcuratortool-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "calendarcuratortool",
  storageBucket: "calendarcuratortool.firebasestorage.app",
  messagingSenderId: "665123679713",
  appId: "1:665123679713:web:27a420f5bd36220b1d36a0",
  measurementId: "G-W69Z6EYMPH",
};

// Initialize Firebase only if it hasn't been initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get a reference to the database service
const database = firebase.database();

// Database utility functions
const dbUtils = {
  // Save user preferences
  saveUserPreferences: async (userId, preferences) => {
    try {
      await database.ref(`users/${userId}/preferences`).set(preferences);
      return true;
    } catch (error) {
      console.error("Error saving user preferences:", error);
      return false;
    }
  },

  // Get user preferences
  getUserPreferences: async (userId) => {
    try {
      const snapshot = await database
        .ref(`users/${userId}/preferences`)
        .once("value");
      return snapshot.val() || {};
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return {};
    }
  },

  // Save user calendar
  saveUserCalendar: async (userId, calendarData) => {
    try {
      await database.ref(`users/${userId}/calendar`).set(calendarData);
      return true;
    } catch (error) {
      console.error("Error saving user calendar:", error);
      return false;
    }
  },

  // Get user calendar
  getUserCalendar: async (userId) => {
    try {
      const snapshot = await database
        .ref(`users/${userId}/calendar`)
        .once("value");
      return snapshot.val() || {};
    } catch (error) {
      console.error("Error getting user calendar:", error);
      return {};
    }
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      await database.ref(`users/${userId}/profile`).update(profileData);
      return true;
    } catch (error) {
      console.error("Error updating user profile:", error);
      return false;
    }
  },
};
