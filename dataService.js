/**
 * DataService - Handles all data fetching and processing for IRCC processing times
 */
class DataService {
    constructor() {
        this.baseUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main";
        this.cache = new Map();
        this.countries = null;
        this.currentData = null;
        this.weeklyData = [];
    }

    /**
     * Initialize the service by loading countries and current data
     */
    async initialize() {
        try {
            const [countriesData, currentData] = await Promise.all([
                this.fetchCountries(),
                this.fetchCurrentData()
            ]);
            
            this.countries = countriesData;
            this.currentData = currentData;
            
            return { countries: this.countries, current: this.currentData };
        } catch (error) {
            console.error("Failed to initialize DataService:", error);
            throw error;
        }
    }

    /**
     * Fetch country names
     */
    async fetchCountries() {
        const url = `${this.baseUrl}/data/data-country-name-en.json`;
        return this.fetchWithCache(url);
    }

    /**
     * Fetch current processing times
     */
    async fetchCurrentData() {
        const url = `${this.baseUrl}/data/data-ptime-en.json`;
        return this.fetchWithCache(url);
    }

    /**
     * Fetch weekly data index
     */
    async fetchWeeklyIndex() {
        const url = `${this.baseUrl}/weekly/index.json`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn("Weekly index not available, generating from known pattern");
                return this.generateWeeklyFileList();
            }
            return await response.json();
        } catch (error) {
            console.warn("Error fetching weekly index, using fallback:", error);
            return this.generateWeeklyFileList();
        }
    }

    /**
     * Generate a list of potential weekly files (fallback when index.json doesn't exist)
     */
    generateWeeklyFileList() {
        const files = [];
        const currentDate = new Date();
        
        // Generate last 52 weeks
        for (let i = 0; i < 52; i++) {
            const weekDate = new Date(currentDate.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
            const year = weekDate.getFullYear();
            const week = this.getWeekNumber(weekDate);
            files.push(`${year}-W${week.toString().padStart(2, '0')}.json`);
        }
        
        return files.reverse(); // Oldest to newest
    }

    /**
     * Get ISO week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Load weekly historical data
     */
    async loadWeeklyData(maxWeeks = 52) {
        try {
            const weeklyFiles = await this.fetchWeeklyIndex();
            const recentFiles = weeklyFiles.slice(-maxWeeks);
            
            this.weeklyData = [];
            
            for (const filename of recentFiles) {
                try {
                    const url = `${this.baseUrl}/weekly/${filename}`;
                    const weekData = await fetch(url);
                    
                    if (weekData.ok) {
                        const data = await weekData.json();
                        const weekInfo = this.parseWeekFilename(filename);
                        
                        this.weeklyData.push({
                            filename,
                            ...weekInfo,
                            data: data,
                            timestamp: new Date(weekInfo.year, 0, 1 + (weekInfo.week - 1) * 7)
                        });
                    }
                } catch (error) {
                    console.warn(`Error loading weekly file ${filename}:`, error);
                }
            }
            
            // Sort by timestamp
            this.weeklyData.sort((a, b) => a.timestamp - b.timestamp);
            
            return this.weeklyData;
        } catch (error) {
            console.error("Error loading weekly data:", error);
            return [];
        }
    }

    /**
     * Parse week filename to extract year and week number
     */
    parseWeekFilename(filename) {
        const match = filename.match(/(\d{4})-W(\d{2})\.json/);
        if (match) {
            return {
                year: parseInt(match[1]),
                week: parseInt(match[2])
            };
        }
        return { year: null, week: null };
    }

    /**
     * Get processing times for a specific country
     */
    getCountryData(countryCode) {
        if (!this.currentData) return null;
        
        const countryData = {};
        let hasData = false;
        
        Object.entries(this.currentData).forEach(([category, countries]) => {
            if (countries[countryCode]) {
                countryData[category] = countries[countryCode];
                hasData = true;
            }
        });
        
        return hasData ? countryData : null;
    }

    /**
     * Get historical data for a specific country and category
     */
    getHistoricalData(countryCode, category = null) {
        const historicalData = [];
        
        this.weeklyData.forEach(weekData => {
            // Skip if year or week is null
            if (!weekData.year || !weekData.week) {
                console.warn(`Skipping invalid week data:`, weekData.filename);
                return;
            }
            
            if (category) {
                // Get specific category data
                if (weekData.data[category] && weekData.data[category][countryCode]) {
                    historicalData.push({
                        date: weekData.timestamp,
                        week: `${weekData.year}-W${weekData.week.toString().padStart(2, '0')}`,
                        category: category,
                        country: countryCode,
                        data: weekData.data[category][countryCode]
                    });
                }
            } else {
                // Get all categories for this country
                Object.entries(weekData.data).forEach(([cat, countries]) => {
                    if (countries[countryCode]) {
                        historicalData.push({
                            date: weekData.timestamp,
                            week: `${weekData.year}-W${weekData.week.toString().padStart(2, '0')}`,
                            category: cat,
                            country: countryCode,
                            data: countries[countryCode]
                        });
                    }
                });
            }
        });
        
        return historicalData;
    }

    /**
     * Extract last updated timestamp from data
     */
    getLastUpdated() {
        if (!this.currentData) return null;
        
        for (const category of Object.values(this.currentData)) {
            if (category.lastupdated) {
                return category.lastupdated;
            }
        }
        return null;
    }

    /**
     * Fetch with simple caching
     */
    async fetchWithCache(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        
        const data = await response.json();
        this.cache.set(url, data);
        return data;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get available countries
     */
    getCountries() {
        return this.countries ? this.countries["country-name"] : null;
    }
}
