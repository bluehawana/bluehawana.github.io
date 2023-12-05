// script.js

function turnstileCallback(token) {
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
        // Continue with form submission or other actions
      } else {
        console.error(
          "CAPTCHA verification failed",
          data["error-codes"],
          data.messages
        );
      }
    })
    .catch((error) => {
      console.error("Error during CAPTCHA verification:", error);
    });
}
