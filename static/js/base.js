document.addEventListener("DOMContentLoaded", function () {
  // Handle flash messages
  const flashMessages = document.querySelectorAll(".flash-message");
  flashMessages.forEach((message) => {
    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => {
        message.remove();
      }, 300);
    }, 3000);
  });

  // Handle form submission on Enter key
  const urlForm = document.getElementById("url-form");
  if (urlForm) {
    const urlInput = document.getElementById("url");
    urlInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        urlForm.submit();
      }
    });
  }
});
