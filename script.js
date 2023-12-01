// script.js

function turnstileCallback(token) {
  console.log("Turnstile token:", token);
  // You can perform actions here after the Turnstile challenge is completed
  // Example: Hide the Turnstile widget
  var turnstileWidget = document.querySelector(".cf-turnstile");
  if (turnstileWidget) {
    turnstileWidget.style.display = "none";
  }

  // If you had a server-side endpoint, you'd send the token to it for validation
  // Example:
  // fetch('your_serverless_function_endpoint', {
  //     method: 'POST',
  //     headers: {
  //         'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ token: token }),
  // })
  // .then(response => response.json())
  // .then(data => {
  //     console.log('Validation response:', data);
  //     // Handle the response here
  // })
  // .catch(error => {
  //     console.error('Error:', error);
  // });
}
