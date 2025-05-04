document.addEventListener("DOMContentLoaded", function () {
  // Handle modal open/close
  const uploadModal = document.getElementById("uploadModal");
  const openModalBtn = document.getElementById("openUploadModal");
  const closeModalBtn = document.getElementById("closeUploadModal");
  const cancelModalBtn = document.getElementById("cancelUploadModal");

  if (openModalBtn) {
    openModalBtn.addEventListener("click", function () {
      uploadModal.classList.remove("hidden");
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function () {
      uploadModal.classList.add("hidden");
    });
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", function () {
      uploadModal.classList.add("hidden");
    });
  }

  // Close modal when clicking outside
  if (uploadModal) {
    uploadModal.addEventListener("click", function (e) {
      if (e.target === uploadModal) {
        uploadModal.classList.add("hidden");
      }
    });
  }
});
