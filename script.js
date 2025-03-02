document.addEventListener("DOMContentLoaded", async function () {
    const countrySelect = document.getElementById("country");
    const tableBody = document.querySelector("#data-table tbody");

    const countryUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main/data/data-country-name-en.json";
    const timeUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main/data/data-ptime-en.json";

    try {
        const [countriesRes, timesRes] = await Promise.all([fetch(countryUrl), fetch(timeUrl)]);
        const countriesData = await countriesRes.json();
        const timesData = await timesRes.json();

        const countryList = countriesData["country-name"]; // Extract country-name object

        // Populate dropdown with country names
        Object.entries(countryList).forEach(([code, name]) => {
            let option = document.createElement("option");
            option.value = code;
            option.textContent = name;
            countrySelect.appendChild(option);
        });

        // Load processing time on country selection
        countrySelect.addEventListener("change", function () {
            const selectedCountry = this.value;
            tableBody.innerHTML = ""; // Clear previous table data

            let hasData = false;

            // Iterate through all categories in timesData
            Object.entries(timesData).forEach(([category, countries]) => {
                if (countries[selectedCountry]) {
                    hasData = true;
                    let row = document.createElement("tr");
                    row.innerHTML = `<td>${category.replace(/-/g, " ")}</td>
                                     <td>${countries[selectedCountry]}</td>`;
                    tableBody.appendChild(row);
                }
            });

            if (!hasData) {
                tableBody.innerHTML = `<tr><td colspan="2">No processing time available</td></tr>`;
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
