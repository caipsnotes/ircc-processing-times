/**
 * Simple Chart Service - No external dependencies
 * Creates basic charts using HTML/CSS/SVG
 */
class SimpleChartService {
    constructor() {
        this.colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
        ];
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
            return null;
        }
        
        return null;
    }

    /**
     * Prepare historical data for charting
     */
    prepareChartData(historicalData) {
        const chartData = {};
        
        historicalData.forEach(entry => {
            const category = entry.category;
            const processingTime = this.extractProcessingTime(entry.data);
            
            if (processingTime !== null) {
                if (!chartData[category]) {
                    chartData[category] = [];
                }
                
                chartData[category].push({
                    week: entry.week,
                    value: processingTime,
                    rawData: entry.data
                });
            }
        });
        
        // Sort each category by week
        Object.keys(chartData).forEach(category => {
            chartData[category].sort((a, b) => a.week.localeCompare(b.week));
        });
        
        return chartData;
    }

    /**
     * Create a simple HTML table-based chart
     */
    createSimpleChart(containerId, historicalData, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const chartData = this.prepareChartData(historicalData);
        
        if (Object.keys(chartData).length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No historical data available for this country</p>';
            return;
        }

        let html = `
            <div class="simple-chart">
                <h3 class="chart-title">${options.title || 'Processing Times Over Time'}</h3>
                <div class="chart-container">
        `;

        // Create a simple table-based chart
        Object.entries(chartData).forEach(([category, data], categoryIndex) => {
            const color = this.colors[categoryIndex % this.colors.length];
            const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            html += `
                <div class="chart-category" style="margin-bottom: 20px;">
                    <h4 style="color: ${color}; margin-bottom: 10px;">${categoryName}</h4>
                    <div class="chart-data">
            `;

            // Find min and max values for scaling
            const values = data.map(d => d.value);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            const range = maxValue - minValue || 1;

            // Create bars
            data.forEach((point, index) => {
                const barHeight = range > 0 ? ((point.value - minValue) / range) * 100 : 50;
                const trend = index > 0 ? (point.value > data[index - 1].value ? '↑' : 
                               point.value < data[index - 1].value ? '↓' : '→') : '';
                
                html += `
                    <div class="chart-bar" style="display: inline-block; margin: 0 5px; text-align: center;">
                        <div style="width: 60px; height: 100px; position: relative; border-bottom: 1px solid #ccc;">
                            <div style="
                                width: 40px;
                                height: ${barHeight}%;
                                background-color: ${color};
                                position: absolute;
                                bottom: 0;
                                left: 10px;
                                border-radius: 2px 2px 0 0;
                                opacity: 0.8;
                            " title="${point.week}: ${point.value} (${point.rawData})"></div>
                        </div>
                        <div style="font-size: 12px; margin-top: 5px;">
                            <div>${point.week.replace('2025-W', 'W')}</div>
                            <div style="font-weight: bold;">${point.value}</div>
                            <div style="color: ${color};">${trend}</div>
                        </div>
                    </div>
                `;
            });

            // Calculate trend
            if (data.length >= 2) {
                const change = data[data.length - 1].value - data[0].value;
                const changePercent = ((change / data[0].value) * 100).toFixed(1);
                const trendText = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable';
                const trendColor = change > 0 ? '#ef4444' : change < 0 ? '#10b981' : '#6b7280';
                
                html += `
                    <div style="margin-top: 10px; font-size: 14px; color: ${trendColor};">
                        <strong>Trend:</strong> ${trendText} (${change > 0 ? '+' : ''}${change} days, ${changePercent}%)
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Create a simple data table view
     */
    createDataTable(containerId, historicalData, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chartData = this.prepareChartData(historicalData);
        
        if (Object.keys(chartData).length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No historical data available for this country</p>';
            return;
        }

        let html = `
            <div class="data-table-chart">
                <h3>${options.title || 'Processing Times Over Time'}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Category</th>
        `;

        // Get all unique weeks
        const allWeeks = new Set();
        Object.values(chartData).forEach(data => {
            data.forEach(point => allWeeks.add(point.week));
        });
        const sortedWeeks = Array.from(allWeeks).sort();

        // Add week headers
        sortedWeeks.forEach(week => {
            html += `<th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${week}</th>`;
        });

        html += `
                            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add data rows
        Object.entries(chartData).forEach(([category, data]) => {
            const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += `<tr><td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold;">${categoryName}</td>`;

            // Add values for each week
            sortedWeeks.forEach(week => {
                const point = data.find(d => d.week === week);
                const value = point ? `${point.value} days` : '-';
                html += `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${value}</td>`;
            });

            // Add trend
            if (data.length >= 2) {
                const change = data[data.length - 1].value - data[0].value;
                const trendIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                const trendText = `${trendIcon} ${change > 0 ? '+' : ''}${change}`;
                html += `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${trendText}</td>`;
            } else {
                html += `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">-</td>`;
            }

            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }
}
