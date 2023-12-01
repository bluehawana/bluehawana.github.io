// script.js

function turnstileCallback(response) {
    console.log('Turnstile verification response:', response);
    setTimeout(function() {
        var turnstileOverlay = document.querySelector('.cf-turnstile');
        if (turnstileOverlay) {
            console.log('Hiding Turnstile overlay');
            turnstileOverlay.style.display = 'none';
        } else {
            console.error('Turnstile overlay not found');
        }
    }, 1000); // Delay of 1000 milliseconds (1 second)
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
