document.addEventListener("DOMContentLoaded", async function () {
    const countrySelect = document.getElementById("country");
    const tableBody = document.querySelector("#data-table tbody");

    const countryUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main/data/data-country-name-en.json";
    const timeUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main/data/data-ptime-en.json";

    try {
        const [countriesRes, timesRes] = await Promise.all([fetch(countryUrl), fetch(timeUrl)]);
        const countriesData = await countriesRes.json();
        const timesData = await timesRes.json();

        // Populate dropdown
        Object.keys(countriesData).forEach((code) => {
            let option = document.createElement("option");
            option.value = code;
            option.textContent = countriesData[code]; // Extract country name
            countrySelect.appendChild(option);
        });

        // Load data on country selection
        countrySelect.addEventListener("change", function () {
            const selectedCountry = this.value;
            tableBody.innerHTML = ""; // Clear table
            if (timesData[selectedCountry]) {
                timesData[selectedCountry].forEach((item) => {
                    let row = document.createElement("tr");
                    row.innerHTML = `<td>${item.category}</td><td>${item.time}</td>`;
                    tableBody.appendChild(row);
                });
            }
        });

        // Auto-select first country if available
        if (countrySelect.options.length > 0) {
            countrySelect.value = countrySelect.options[0].value;
            countrySelect.dispatchEvent(new Event("change"));
        }
    } catch (error) {
        console.error("Error loading JSON data:", error);
    }
});
