document.addEventListener("DOMContentLoaded", async function () {
    const countrySelect = document.getElementById("country");
    const tableBody = document.querySelector("#data-table tbody");
    const lastUpdatedDiv = document.getElementById("last-updated");  // Div to display last updated time

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

        // Function to handle dynamic rendering of data
        function renderData(category, data) {
            // If the data is a string or primitive value, just return it directly
            if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
                return data || "Not available";
            }

            // If the data is an object, recursively process its keys
            if (typeof data === "object" && !Array.isArray(data)) {
                let rowData = '';
                Object.entries(data).forEach(([key, value]) => {
                    rowData += `<div><strong>${key}:</strong> ${renderData(key, value)}</div>`;
                });
                return rowData;
            }

            // If the data is an array, handle it as a list
            if (Array.isArray(data)) {
                return `<ul>${data.map(item => `<li>${renderData(category, item)}</li>`).join('')}</ul>`;
            }

            // If none of the above, fallback to showing "Not available"
            return "Not available";
        }

        // Extract last updated date
        function extractLastUpdated(data) {
            if (data.hasOwnProperty('lastupdated')) {
                return data.lastupdated;
            }
            // If no lastupdated property exists, return null
            return null;
        }

        let lastUpdated = null;

        // Iterate through all categories and look for lastupdated property
        Object.values(timesData).forEach(category => {
            const updated = extractLastUpdated(category);
            if (updated) {
                lastUpdated = updated; // Grab the latest "lastupdated"
            }
        });

        // Display last updated info if available
        if (lastUpdated && lastUpdatedDiv) {
            lastUpdatedDiv.innerHTML = `Data last updated: ${lastUpdated}`;
        }

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

                    // Render data dynamically based on its structure
                    const rowData = renderData(category, countries[selectedCountry]);
                    row.innerHTML = `<td>${category.replace(/-/g, " ")}</td><td>${rowData}</td>`;
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
