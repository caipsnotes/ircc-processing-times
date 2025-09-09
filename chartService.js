/**
 * ChartService - Handles chart rendering and data visualization
 * Requires Chart.js to be loaded
 */
class ChartService {
    constructor() {
        this.charts = new Map();
        this.colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
        ];
    }

    /**
     * Initialize chart container
     */
    createChartCanvas(containerId, chartId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }

        // Remove existing canvas if it exists
        const existingCanvas = container.querySelector(`#${chartId}`);
        if (existingCanvas) {
            existingCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.id = chartId;
        canvas.width = 800;
        canvas.height = 400;
        container.appendChild(canvas);

        return canvas;
    }

    /**
     * Extract numeric values from processing time data
     */
    extractProcessingTime(data) {
        if (typeof data === 'string') {
            // Try to extract number from strings like "12 months", "45 days", etc.
            const match = data.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : null;
        }
        
        if (typeof data === 'number') {
            return data;
        }
        
        if (typeof data === 'object' && data !== null) {
            // Look for common time-related properties
            const timeKeys = ['months', 'days', 'weeks', 'time', 'duration'];
            for (const key of timeKeys) {
                if (data[key] !== undefined) {
                    return this.extractProcessingTime(data[key]);
                }
            }
            
            // If object has multiple properties, might need custom logic
            // For now, return null for complex objects
            return null;
        }
        
        return null;
    }

    /**
     * Normalize time units to months for comparison
     */
    normalizeToMonths(value, unit) {
        if (!value) return null;
        
        switch (unit.toLowerCase()) {
            case 'days':
                return value / 30.44; // Average days per month
            case 'weeks':
                return value / 4.35; // Average weeks per month
            case 'months':
                return value;
            case 'years':
                return value * 12;
            default:
                return value; // Assume months if unit unknown
        }
    }

    /**
     * Prepare historical data for charting
     */
    prepareChartData(historicalData) {
        const chartData = {};
        
        historicalData.forEach(entry => {
            const category = entry.category;
            const date = entry.date;
            const processingTime = this.extractProcessingTime(entry.data);
            
            if (processingTime !== null) {
                if (!chartData[category]) {
                    chartData[category] = [];
                }
                
                chartData[category].push({
                    x: date,
                    y: processingTime,
                    week: entry.week,
                    rawData: entry.data
                });
            }
        });
        
        // Sort each category by date
        Object.keys(chartData).forEach(category => {
            chartData[category].sort((a, b) => a.x - b.x);
        });
        
        return chartData;
    }

    /**
     * Create a line chart for historical processing times
     */
    createHistoricalChart(containerId, chartId, historicalData, options = {}) {
        const canvas = this.createChartCanvas(containerId, chartId);
        const ctx = canvas.getContext('2d');
        
        const chartData = this.prepareChartData(historicalData);
        
        // Create datasets for each category
        const datasets = Object.entries(chartData).map(([category, data], index) => ({
            label: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            data: data,
            borderColor: this.colors[index % this.colors.length],
            backgroundColor: this.colors[index % this.colors.length] + '20',
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 6
        }));
        
        const config = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: options.title || 'Processing Times Over Time'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.parsed;
                                const rawData = context.raw;
                                return `${context.dataset.label}: ${point.y} (${rawData.week})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'week',
                            displayFormats: {
                                week: 'MMM DD'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: options.yAxisLabel || 'Processing Time'
                        },
                        beginAtZero: true
                    }
                }
            }
        };
        
        // Destroy existing chart if it exists
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
        }
        
        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        
        return chart;
    }

    /**
     * Create a comparison chart for multiple countries
     */
    createComparisonChart(containerId, chartId, countriesData, category, options = {}) {
        const canvas = this.createChartCanvas(containerId, chartId);
        const ctx = canvas.getContext('2d');
        
        const datasets = Object.entries(countriesData).map(([countryCode, historicalData], index) => {
            const categoryData = historicalData.filter(entry => entry.category === category);
            const chartData = this.prepareChartData(categoryData);
            
            return {
                label: countryCode, // You might want to convert this to country name
                data: chartData[category] || [],
                borderColor: this.colors[index % this.colors.length],
                backgroundColor: this.colors[index % this.colors.length] + '20',
                fill: false,
                tension: 0.1
            };
        });
        
        const config = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: options.title || `${category} - Country Comparison`
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'week'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: options.yAxisLabel || 'Processing Time'
                        },
                        beginAtZero: true
                    }
                }
            }
        };
        
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
        }
        
        const chart = new Chart(ctx, config);
        this.charts.set(chartId, chart);
        
        return chart;
    }

    /**
     * Create a simple trend indicator
     */
    calculateTrend(data) {
        if (data.length < 2) return { trend: 'insufficient-data', change: 0 };
        
        const recent = data.slice(-4); // Last 4 data points
        const older = data.slice(-8, -4); // Previous 4 data points
        
        if (recent.length === 0 || older.length === 0) return { trend: 'insufficient-data', change: 0 };
        
        const recentAvg = recent.reduce((sum, item) => sum + item.y, 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + item.y, 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        let trend = 'stable';
        if (change > 5) trend = 'increasing';
        else if (change < -5) trend = 'decreasing';
        
        return { trend, change: Math.round(change * 100) / 100 };
    }

    /**
     * Destroy a specific chart
     */
    destroyChart(chartId) {
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
            this.charts.delete(chartId);
        }
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}
