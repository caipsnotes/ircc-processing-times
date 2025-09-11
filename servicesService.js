// servicesService.js - Handle In-Canada Services data

// Helper function to get ISO week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Find the most recent in-Canada services file
async function findMostRecentServicesFile() {
    const baseUrl = "https://raw.githubusercontent.com/caipsnotes/ircc-processing-times/main";
    
    try {
        // Try to get the weekly index first
        const indexResponse = await fetch(`${baseUrl}/weekly/index.json`);
        if (indexResponse.ok) {
            const weeklyFiles = await indexResponse.json();
            
            // Filter for in-canada-services files and sort by filename (newest first)
            const servicesFiles = weeklyFiles
                .filter(file => file.includes('-in-canada-services.json'))
                .sort()
                .reverse();
            
            if (servicesFiles.length > 0) {
                return servicesFiles[0]; // Most recent file
            }
        }
    } catch (error) {
        console.warn('Could not fetch weekly index, trying fallback method:', error);
    }
    
    // Fallback: try recent weeks
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentWeek = getWeekNumber(currentDate);
    
    // Try current week and up to 4 weeks back
    for (let i = 0; i <= 4; i++) {
        let weekToTry = currentWeek - i;
        let yearToTry = currentYear;
        
        // Handle year boundary
        if (weekToTry <= 0) {
            yearToTry = currentYear - 1;
            weekToTry = 52 + weekToTry; // Approximate last week of previous year
        }
        
        const fileName = `${yearToTry}-W${weekToTry.toString().padStart(2, '0')}-in-canada-services.json`;
        
        try {
            const testResponse = await fetch(`weekly/${fileName}`, { method: 'HEAD' });
            if (testResponse.ok) {
                return fileName;
            }
        } catch (e) {
            // Continue to next week
        }
    }
    
    throw new Error('No in-Canada services file found in recent weeks');
}

// Store the loaded services data globally
let servicesData = null;

// Get category display name dynamically (completely future-proof)
function getCategoryDisplayName(categoryKey) {
    // Convert technical key to readable format
    return categoryKey
        .replace(/_/g, ' ')              // Replace underscores with spaces
        .replace(/-/g, ' ')              // Replace hyphens with spaces
        .replace(/\b\w/g, l => l.toUpperCase())  // Capitalize first letter of each word
        .replace(/\bFlpt\b/g, 'FLPT')    // Fix common abbreviations
        .replace(/\bIec\b/g, 'IEC')
        .replace(/\bEta\b/g, 'ETA')
        .replace(/\bPr\b/g, 'PR')
        .replace(/\bPnp\b/g, 'PNP')
        .replace(/\bFsw\b/g, 'FSW')
        .replace(/\bCec\b/g, 'CEC')
        .replace(/\bCit\b/g, 'Citizenship')
        .replace(/\bQc\b/g, 'Quebec')
        .replace(/\bRoc\b/g, 'Rest of Canada')
        .replace(/\bPgp\b/g, 'Parent & Grandparent Program')
        .replace(/\bSawp\b/g, 'Seasonal Agricultural Worker Program')
        .replace(/\bEmpp\b/g, 'EMPP');
}

// Helper function to create readable service names dynamically (completely future-proof)
function formatServiceName(categoryKey, serviceKey) {
    // Get base category name
    const categoryName = getCategoryDisplayName(categoryKey);
    
    // Get service name
    const serviceName = serviceKey
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\bFlpt\b/g, 'FLPT')
        .replace(/\bIec\b/g, 'IEC')
        .replace(/\bEta\b/g, 'ETA')
        .replace(/\bPr\b/g, 'PR')
        .replace(/\bQc\b/g, 'Quebec')
        .replace(/\bRoc\b/g, 'Rest of Canada')
        .replace(/\bVos\b/g, 'Verification of Status')
        .replace(/\bImm\b/g, 'Immigration')
        .replace(/\bTr\b/g, 'Temporary Resident')
        .replace(/\bAmend\b/g, 'Amendment')
        .replace(/\bRep\b/g, 'Replacement')
        .replace(/\bCit\b/g, 'Citizenship')
        .replace(/\bSawp\b/g, 'SAWP');
    
    // If service name is the same as category or very similar, just return category
    const categoryWords = categoryName.toLowerCase().split(' ');
    const serviceWords = serviceName.toLowerCase().split(' ');
    const commonWords = categoryWords.filter(word => serviceWords.includes(word));
    
    if (serviceName.toLowerCase() === categoryName.toLowerCase() || 
        serviceKey === categoryKey ||
        commonWords.length === categoryWords.length) {
        return categoryName;
    }
    
    // For compound names, try to avoid redundancy
    if (categoryWords.some(word => serviceWords.includes(word))) {
        return `${categoryName} - ${serviceName}`;
    }
    
    return `${categoryName} - ${serviceName}`;
}

// Create and populate the service category dropdown
function createServiceCategoryDropdown(data) {
    // Check if dropdown already exists
    let dropdown = document.getElementById('service-category-select');
    if (!dropdown) {
        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'controls';
        dropdownContainer.style.marginBottom = '20px';
        dropdownContainer.innerHTML = `
            <label for="service-category-select">Select Service Category:</label>
            <select id="service-category-select">
                <option value="">All Services</option>
            </select>
        `;
        
        // Insert after the info card
        const infoCard = document.querySelector('#in-canada-tab .info-card');
        infoCard.parentNode.insertBefore(dropdownContainer, infoCard.nextSibling);
        dropdown = document.getElementById('service-category-select');
    } else {
        // Clear existing options except "All Services"
        dropdown.innerHTML = '<option value="">All Services</option>';
    }
    
    // Get service categories (skip default-update) - COMPLETELY DYNAMIC
    const serviceCategories = Object.keys(data).filter(key => key !== 'default-update');
    
    // Populate dropdown with categories - NO HARDCODED MAPPINGS
    serviceCategories.forEach(categoryKey => {
        const option = document.createElement('option');
        option.value = categoryKey;
        option.textContent = getCategoryDisplayName(categoryKey); // Dynamic name generation
        dropdown.appendChild(option);
    });
    
    // Add event listener for dropdown change
    dropdown.addEventListener('change', function() {
        displayFilteredServices(this.value);
    });
}

// Display services filtered by category
function displayFilteredServices(selectedCategory) {
    const servicesGrid = document.getElementById('services-grid');
    
    if (!servicesData) {
        return;
    }
    
    // Clear existing service cards (keep header and dropdown)
    const serviceCards = servicesGrid.querySelectorAll('.service-card');
    serviceCards.forEach(card => card.remove());
    
    // Get services to display - COMPLETELY DYNAMIC
    let categoriesToShow = [];
    if (selectedCategory) {
        // Show only selected category
        if (servicesData[selectedCategory]) {
            categoriesToShow = [[selectedCategory, servicesData[selectedCategory]]];
        }
    } else {
        // Show all categories (excluding metadata)
        categoriesToShow = Object.entries(servicesData).filter(([key]) => key !== 'default-update');
    }
    
    if (categoriesToShow.length > 0) {
        categoriesToShow.forEach(([categoryKey, categoryData]) => {
            // Handle categories that have multiple services
            Object.entries(categoryData).forEach(([serviceKey, processingTime]) => {
                const serviceCard = document.createElement('div');
                serviceCard.className = 'service-card';
                
                // Create readable service name - COMPLETELY DYNAMIC
                const serviceName = formatServiceName(categoryKey, serviceKey);
                
                serviceCard.innerHTML = `
                    <h4>${serviceName}</h4>
                    <div class="service-time">${processingTime || 'N/A'}</div>
                `;
                
                servicesGrid.appendChild(serviceCard);
            });
        });
    } else {
        const noDataElement = document.createElement('p');
        noDataElement.style.textAlign = 'center';
        noDataElement.style.color = '#6b7280';
        noDataElement.textContent = 'No services found for the selected category';
        servicesGrid.appendChild(noDataElement);
    }
}

// Load and display In-Canada services data
async function loadInCanadaServices() {
    const servicesLoading = document.getElementById('services-loading');
    const servicesError = document.getElementById('services-error');
    const servicesGrid = document.getElementById('services-grid');
    
    try {
        servicesLoading.classList.remove('hidden');
        servicesError.classList.add('hidden');
        
        // Find the most recent services file
        const fileName = await findMostRecentServicesFile();
        console.log('Using services file:', fileName);
        
        const response = await fetch(`weekly/${fileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        servicesData = data; // Store globally
        
        servicesLoading.classList.add('hidden');
        
        // Clear existing content
        servicesGrid.innerHTML = '';
        
        // Add a header showing which week's data is being displayed
        const weekInfo = fileName.match(/(\d{4})-W(\d{2})/);
        if (weekInfo) {
            const headerElement = document.createElement('div');
            headerElement.className = 'info-card';
            headerElement.innerHTML = `
                <h3>Data from ${data['default-update']?.lastupdated || `${weekInfo[1]} Week ${parseInt(weekInfo[2])}`}</h3>
                <p>Select a service category below to view specific processing times, or view all services.</p>
            `;
            servicesGrid.appendChild(headerElement);
        }
        
        // Create category dropdown - COMPLETELY DYNAMIC
        createServiceCategoryDropdown(data);
        
        // Display all services initially
        displayFilteredServices('');
        
    } catch (error) {
        console.error('Error loading in-Canada services:', error);
        servicesLoading.classList.add('hidden');
        servicesError.textContent = `Error loading in-Canada services: ${error.message}`;
        servicesError.classList.remove('hidden');
    }
}

// Initialize services tab functionality
function initializeServicesTab() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and hide all content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Add active class to clicked button and show target content
            this.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.remove('hidden');
            
            // Load in-Canada services data when that tab is clicked
            if (targetTab === 'in-canada') {
                loadInCanadaServices();
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeServicesTab();
});
