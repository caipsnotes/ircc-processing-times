/**
 * Main Application - Integrates DataService and ChartService
 */
class IRCCApp {
    constructor() {
        this.dataService = new DataService();
        this.chartService = new ChartService();
        this.currentCountry = null;
        this.isLoading = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading('Initializing application...');
            
            // Initialize data service
            await this.dataService.initialize();
            
            // Setup UI components
            this.setupCountryDropdown();
            this.setupEventListeners();
            this.displayLastUpdated();
            
            // Load weekly data in background
            this.loadWeeklyDataAsync();
            
            // Auto-select first country
            this.selectFirstCountry();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load IRCC processing times data');
        }
    }

    /**
     * Setup country dropdown
     */
    setupCountryDropdown() {
        const countrySelect = document.getElementById('country');
        if (!countrySelect) return;

        const countries = this.dataService.getCountries();
        if (!countries) return;

        // Clear existing options
        countrySelect.innerHTML = '<option value="">Select a country...</option>';

        // Sort countries alphabetically
        const sortedCountries = Object.entries(countries).sort(([,a], [,b]) => a.localeCompare(b));

        // Populate dropdown
        sortedCountries.forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            countrySelect.appendChild(option);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => {
                this.onCountryChange(e.target.value);
            });
        }

        // Setup tab switching if tabs exist
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Setup refresh button if it exists
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
    }

    /**
     * Handle country selection change
     */
    async onCountryChange(countryCode) {
        if (!countryCode) {
            this.clearCurrentData();
            return;
        }

        this.currentCountry = countryCode;
        
        // Update current data table
        this.displayCurrentData(countryCode);
        
        // Update historical chart if weekly data is loaded
        if (this.dataService.weeklyData.length > 0) {
            this.displayHistoricalChart(countryCode);
        }
    }

    /**
     * Display current processing times for selected country
     */
    displayCurrentData(countryCode) {
        const tableBody = document.querySelector('#data-table tbody');
        if (!tableBody) return;

        const countryData = this.dataService.getCountryData(countryCode);
        
        tableBody.innerHTML = '';

        if (!countryData) {
            tableBody.innerHTML = '<tr><td colspan="2">No processing time data available for this country</td></tr>';
            return;
        }

        Object.entries(countryData).forEach(([category, data]) => {
            const row = document.createElement('tr');
            const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const renderedData = this.renderData(data);
            
            row.innerHTML = `
                <td class="font-medium">${categoryName}</td>
                <td>${renderedData}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    /**
     * Render data dynamically based on its structure
     */
    renderData(data) {
        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            return data || "Not available";
        }

        if (typeof data === "object" && !Array.isArray(data) && data !== null) {
            let rowData = '';
            Object.entries(data).forEach(([key, value]) => {
                const displayKey = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                rowData += `<div class="mb-1"><strong>${displayKey}:</strong> ${this.renderData(value)}</div>`;
            });
            return rowData;
        }

        if (Array.isArray(data)) {
            return `<ul class="list-disc list-inside">${data.map(item => `<li>${this.renderData(item)}</li>`).join('')}</ul>`;
        }

        return "Not available";
    }

    /**
     * Display historical chart for selected country
     */
    displayHistoricalChart(countryCode) {
        const chartContainer = document.getElementById('chart-container');
        if (!chartContainer) return;

        const historicalData = this.dataService.getHistoricalData(countryCode);
        
        if (historicalData.length === 0) {
            chartContainer.innerHTML = '<p class="text-gray-500 text-center">No historical data available for this country</p>';
            return;
        }

        const countries = this.dataService.getCountries();
        const countryName = countries ? countries[countryCode] : countryCode;

        this.chartService.createHistoricalChart(
            'chart-container',
            'historical-chart',
            historicalData,
            {
                title: `Processing Times for ${countryName}`,
                yAxisLabel: 'Processing Time (varies by category)'
            }
        );
    }

    /**
     * Load weekly data asynchronously
     */
    async loadWeeklyDataAsync() {
        try {
            this.showLoadingMessage('Loading historical data...');
            
            await this.dataService.loadWeeklyData();
            
            this.hideLoadingMessage();
            
            // Update chart if country is already selected
            if (this.currentCountry) {
                this.displayHistoricalChart(this.currentCountry);
            }
            
        } catch (error) {
            console.error('Error loading weekly data:', error);
            this.showLoadingMessage('Historical data temporarily unavailable');
        }
    }

    /**
     * Display last updated information
     */
    displayLastUpdated() {
        const lastUpdatedDiv = document.getElementById('last-updated');
        if (!lastUpdatedDiv) return;

        const lastUpdated = this.dataService.getLastUpdated();
        if (lastUpdated) {
            lastUpdatedDiv.innerHTML = `<span class="text-sm text-gray-600">Data last updated: ${lastUpdated}</span>`;
        }
    }

    /**
     * Select first country automatically
     */
    selectFirstCountry() {
        const countrySelect = document.getElementById('country');
        if (countrySelect && countrySelect.options.length > 1) {
            // Skip the first option (placeholder) and select the second
            countrySelect.value = countrySelect.options[1].value;
            countrySelect.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Clear current data display
     */
    clearCurrentData() {
        const tableBody = document.querySelector('#data-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="2">Please select a country</td></tr>';
        }

        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<p class="text-gray-500 text-center">Select a country to view historical data</p>';
        }

        this.currentCountry = null;
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Show selected tab content
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
        }

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active', 'bg-blue-500', 'text-white');
            button.classList.add('bg-gray-200', 'text-gray-700');
        });

        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.remove('bg-gray-200', 'text-gray-700');
            activeButton.classList.add('active', 'bg-blue-500', 'text-white');
        }
    }

    /**
     * Refresh data
     */
    async refreshData() {
        try {
            this.showLoading('Refreshing data...');
            
            this.dataService.clearCache();
            await this.dataService.initialize();
            await this.dataService.loadWeeklyData();
            
            this.setupCountryDropdown();
            this.displayLastUpdated();
            
            if (this.currentCountry) {
                this.onCountryChange(this.currentCountry);
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to refresh data');
        }
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.textContent = message;
            loadingDiv.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }

    /**
     * Show loading message in specific area
     */
    showLoadingMessage(message) {
        const messageDiv = document.getElementById('chart-container');
        if (messageDiv) {
            messageDiv.innerHTML = `<p class="text-gray-500 text-center">${message}</p>`;
        }
    }

    /**
     * Hide loading message
     */
    hideLoadingMessage() {
        // This will be replaced by actual chart or data
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        } else {
            alert(message); // Fallback
        }
        this.hideLoading();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new IRCCApp();
    app.init().catch(error => {
        console.error('Failed to start application:', error);
    });
});
