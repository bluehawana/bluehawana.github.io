// script.js

function turnstileCallback(token) {
  console.log("Turnstile token:", token);

  // Replace with your Cloudflare Worker's endpoint
  const workerEndpoint = "https://turnstilebot.bluehawana.workers.dev/";

  fetch(workerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: token }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Verification result:", data);
      if (data.success) {
        // CAPTCHA verified successfully
        // You can now proceed with form submission or other actions
        console.log("CAPTCHA verification successful");
      } else {
        // CAPTCHA verification failed
        console.error("CAPTCHA verification failed");
      }
    })
    .catch((error) => {
      console.error("Error during CAPTCHA verification:", error);
    });
}
