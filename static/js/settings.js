console.log("settings.js loaded");

// Wait for Firebase to be initialized
firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    console.log("User is signed in:", user.email);
    // Update displayed email
    document.getElementById("current_email").textContent = user.email;
    setupEmailChange();
    setupPasswordChange();
    setupPreferences();
    setupDeleteAccount();
  } else {
    console.log("No user is signed in");
    // Redirect to login if not authenticated
    window.location.href = "{{ url_for('login') }}";
  }
});

function setupEmailChange() {
  // Get the email change form
  const emailForm = document.getElementById("email_form");
  const submit_email_button = document.getElementById("update_email_button");
  submit_email_button.addEventListener("click", async function (e) {
    e.preventDefault();

    // Get form values
    const currentPassword = document.getElementById(
      "current_password_email"
    ).value;
    const newEmail = document.getElementById("new_email").value;

    // Validate inputs
    if (!currentPassword || !newEmail) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("No user is currently signed in");
      }

      // Reauthenticate user
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await user.reauthenticateWithCredential(credential);

      console.log("Updating email to:", newEmail);
      user
        .updateEmail(newEmail)
        .then(() => {
          // Email updated!
          // Show success message
          showNotification("Email updated successfully!", "success");

          // Clear form
          emailForm.reset();

          // Update displayed email
          document.getElementById("current_email").textContent = newEmail;
        })
        .catch((error) => {
          console.error("Error updating email:", error);
          showNotification(error.message, "error");
        });
    } catch (error) {
      console.error("Error updating email:", error);
      showNotification(error.message, "error");
    }
  });
}

function setupPasswordChange() {
  const passwordForm = document.getElementById("password_form");
  const submit_password_button = document.getElementById(
    "update_password_button"
  );

  submit_password_button.addEventListener("click", async function (e) {
    e.preventDefault();

    console.log("Updating password");

    // Get form values
    const currentPassword = document.getElementById("current_password").value;
    const newPassword = document.getElementById("new_password").value;
    const confirmPassword = document.getElementById("confirm_password").value;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification("Please fill in all fields", "error");
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      showNotification("New passwords do not match", "error");
      return;
    }

    console.log("Passwords match");

    // Check password strength
    if (newPassword.length < 6) {
      showNotification("Password must be at least 6 characters long", "error");
      return;
    }

    console.log("Password strength is good");

    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("No user is currently signed in");
      }

      console.log("User is signed in");

      // Reauthenticate user
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await user.reauthenticateWithCredential(credential);

      console.log("User reauthenticated");

      // Update password
      await user.updatePassword(newPassword);

      console.log("Password updated");

      // Show success message
      showNotification("Password updated successfully!", "success");

      // Clear form
      passwordForm.reset();

      console.log("Form reset");
    } catch (error) {
      console.error("Error updating password:", error);
      showNotification(error.message, "error");
    }
  });
}

function setupPreferences() {
  const preferencesForm = document.getElementById("preferences_form");
  const submit_preferences_button = document.getElementById(
    "update_preferences_button"
  );

  // Load current preference
  const user = firebase.auth().currentUser;
  if (user) {
    const userRef = firebase.database().ref("users/" + user.uid);
    userRef.once("value").then((snapshot) => {
      const data = snapshot.val();
      if (data && data.email_preference) {
        document.querySelector(
          `input[value="${data.email_preference}"]`
        ).checked = true;
      } else {
        // Default to all notifications if no preference is set
        document.getElementById("all_notifications").checked = true;
      }
    });
  }

  submit_preferences_button.addEventListener("click", async function (e) {
    e.preventDefault();

    // Get selected preference
    const selectedPreference = document.querySelector(
      'input[name="notification_preference"]:checked'
    );
    if (!selectedPreference) {
      showNotification("Please select a notification preference", "error");
      return;
    }

    const preference = selectedPreference.value;

    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("No user is currently signed in");
      }

      // Only store the preference if it's not "all"
      if (preference !== "all") {
        const userRef = firebase.database().ref("users/" + user.uid);
        await userRef.update({
          email_preference: preference,
        });
      } else {
        // If preference is "all", remove the preference from the database
        const userRef = firebase.database().ref("users/" + user.uid);
        await userRef.update({
          email_preference: null,
        });
      }

      // Show success message
      showNotification("Preferences updated successfully!", "success");
    } catch (error) {
      console.error("Error updating preferences:", error);
      showNotification(error.message, "error");
    }
  });
}

function setupDeleteAccount() {
  const deleteButton = document.getElementById("delete_account_button");
  const deleteModal = document.getElementById("delete_modal");
  const cancelButton = document.getElementById("cancel_delete");
  const confirmButton = document.getElementById("confirm_delete");

  // Show modal when delete button is clicked
  deleteButton.addEventListener("click", function () {
    deleteModal.classList.remove("hidden");
  });

  // Hide modal when cancel button is clicked
  cancelButton.addEventListener("click", function () {
    deleteModal.classList.add("hidden");
  });

  // Handle account deletion when confirm button is clicked
  confirmButton.addEventListener("click", async function () {
    try {
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("No user is currently signed in");
      }

      // Delete user data from Realtime Database
      const userRef = firebase.database().ref("users/" + user.uid);
      await userRef.remove();

      // Delete user from Firebase Auth
      await user.delete();

      // Show success message
      showNotification("Account deleted successfully", "success");

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Error deleting account:", error);

      // Handle specific errors
      if (error.code === "auth/requires-recent-login") {
        showNotification(
          "Please reauthenticate before deleting your account",
          "error"
        );
      } else {
        showNotification(error.message, "error");
      }

      // Hide modal
      deleteModal.classList.add("hidden");
    }
  });

  // Close modal when clicking outside
  deleteModal.addEventListener("click", function (e) {
    if (e.target === deleteModal) {
      deleteModal.classList.add("hidden");
    }
  });
}

// Helper function to show notifications
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
    type === "success"
      ? "bg-green-100 text-green-800"
      : type === "error"
      ? "bg-red-100 text-red-800"
      : "bg-blue-100 text-blue-800"
  }`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
