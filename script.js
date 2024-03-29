// script.js

// Function to send the Turnstile token to your Cloudflare Worker for verification
function sendTokenToServer(token) {
  console.log("Turnstile token:", token);
  const workerEndpoint = "https://turnstilebot.bluehawana.workers.dev/";

  fetch(workerEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Verification result:", data);
      if (data.success) {
        console.log("CAPTCHA verification successful");
        // Hide the Turnstile widget
        document.getElementById("turnstile-container").style.display = "none";
        // Reveal the rest of the website or continue with form submission
        document.getElementById("main-content").style.display = "block";
      } else {
        console.error(
          "CAPTCHA verification failed",
          data["error-codes"],
          data.messages
        );
        // Handle CAPTCHA verification failure
      }
    })
    .catch((error) => {
      console.error("Error during CAPTCHA verification:", error);
    });
}

// Function to render the Turnstile widget and handle the generated token
function onloadTurnstileCallback() {
  turnstile.render("#turnstile-container", {
    sitekey: "0x4AAAAAAALTkPrvFDCTqdiq", // Replace with your actual Turnstile site key
    callback: function (token) {
      console.log(`Challenge Success: ${token}`);
      // Send the token to your server-side for verification
      sendTokenToServer(token);
    },
  });
}

// Ensure the Turnstile callback function is loaded after the window loads
window.onload = onloadTurnstileCallback;
