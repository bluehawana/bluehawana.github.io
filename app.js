window.addEventListener("DOMContentLoaded", (event) => {
  getVisitCount();
});

const functionApiUrl =
  "https://api.countapi.xyz/hit/bluehawana.com/visits?callback=liveViews";
const localFunctionApi = "http://localhost:7071/api/GetResumeCounter";

const getVisitCount = () => {
  let count = 30;
  fetch(functionApiUrl)
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      console.log("Website called function API.");
      count = response.count;
      document.getElementById("visiters").innerText = count;
    })
    .catch(function (error) {
      console.log(error);
    });
  return count;
};
