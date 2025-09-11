// servicesService.js - Handle In-Canada Services data

// Helper function to get ISO week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Load and display In-Canada services data
async function loadInCanadaServices() {
    const servicesLoading = document.getElementById('services-loading');
    const servicesError = document.getElementById('services-error');
    const servicesGrid = document.getElementById('services-grid');
    
    try {
        servicesLoading.classList.remove('hidden');
        servicesError.classList.add('hidden');
        
        // Get current week file
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const week = getWeekNumber(currentDate);
        const fileName = `${year}-W${week.toString().padStart(2, '0')}-in-canada-services.json`;
        
        const response = await fetch(`weekly/${fileName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        servicesLoading.classList.add('hidden');
        
        // Clear existing content
        servicesGrid.innerHTML = '';
        
        // Process and display the services data
        if (data && data.data && Array.isArray(data.data)) {
            data.data.forEach(service => {
                const serviceCard = document.createElement('div');
                serviceCard.className = 'service-card';
                
                serviceCard.innerHTML = `
                    <h4>${service.service_name_en || 'Service Name Not Available'}</h4>
                    <div class="service-time">${service.processing_time_en || 'N/A'}</div>
                    <div class="service-description">${service.service_desc_en || 'No description available'}</div>
                `;
                
                servicesGrid.appendChild(serviceCard);
            });
        } else {
            servicesGrid.innerHTML = '<p style="text-align: center; color: #6b7280;">No in-Canada services data available</p>';
        }
        
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
