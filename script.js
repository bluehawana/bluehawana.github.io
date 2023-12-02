// script.js

function turnstileCallback(response) {
  console.log("Turnstile verification response:", response);

  // Delay execution to ensure Turnstile is fully loaded and interactive
  setTimeout(function () {
    var turnstileOverlay = document.querySelector(".cf-turnstile");
    if (turnstileOverlay) {
      console.log("Hiding Turnstile overlay");
      turnstileOverlay.style.display = "none";
    } else {
      console.error("Turnstile overlay not found");
    }
  }, 500); // Delay of 500 milliseconds
}
