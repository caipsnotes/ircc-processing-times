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

// Helper function to create readable service names
function formatServiceName(categoryKey, serviceKey) {
    const categoryNames = {
        'visitor_inside_canada': 'Visitor Record',
        'visitor_extension': 'Visitor Extension',
        'study_extension': 'Study Permit Extension',
        'work_extension': 'Work Permit Extension',
        'iec': 'International Experience Canada',
        'eta': 'Electronic Travel Authorization',
        'quebec_business': 'Quebec Business',
        'self_employed_federal': 'Self-Employed Federal',
        'fed_skilled_trades': 'Federal Skilled Trades',
        'startup_back': 'Start-up Visa',
        'refugees_protected': 'Protected Persons & Refugees',
        'humanitarian_compassionate': 'Humanitarian & Compassionate',
        'citizenship': 'Citizenship',
        'pr_card': 'PR Card',
        'rep_documents': 'Replacement Documents',
        'caregivers': 'Caregivers',
        'sawp': 'Seasonal Agricultural Worker',
        'dependents_protected_persons': 'Dependents of Protected Persons',
        'atlantic-immigration-program': 'Atlantic Immigration Program',
        'cec_flpt': 'Canadian Experience Class (First Language Proficiency Test)',
        'pnp_ee_flpt': 'Provincial Nominee Program - Express Entry',
        'pnp_flpt': 'Provincial Nominee Program',
        'fsw_ee_flpt': 'Federal Skilled Worker - Express Entry',
        'skilled_workers_qc_flpt': 'Quebec Skilled Workers',
        'cit_grant_flpt': 'Citizenship Grant',
        'cit_proof_flpt': 'Citizenship Proof',
        'spousal_canada_qc_flpt': 'Spousal Sponsorship (Canada) - Quebec',
        'spousal_canada_roc_flpt': 'Spousal Sponsorship (Canada) - Rest of Canada',
        'spousal_outside_qc_flpt': 'Spousal Sponsorship (Outside Canada) - Quebec',
        'spousal_outside_roc_flpt': 'Spousal Sponsorship (Outside Canada) - Rest of Canada',
        'pgp_qc_flpt': 'Parent & Grandparent Program - Quebec',
        'pgp_roc_flpt': 'Parent & Grandparent Program - Rest of Canada'
    };
    
    const serviceNames = {
        'visitor_inside_canada': 'Application from Inside Canada',
        'visitor_extension': 'Extension Application',
        'study_extension': 'Extension Application',
        'work_extension': 'Extension Application',
        'iec': 'Regular Processing',
        'iec_past': 'Past Participant',
        'eta': 'Electronic Travel Authorization',
        'new_pr': 'New PR Card',
        'existing_pr': 'Replacement PR Card',
        'vos': 'Verification of Status',
        'replacement': 'Replacement Document',
        'amend_imm': 'Amendment - Immigration Document',
        'amend_tr': 'Amendment - Temporary Resident Document',
        'childcare': 'Home Child Care Provider',
        'childcare_pr': 'Home Child Care Provider - PR Application',
        'supportworker': 'Home Support Worker',
        'supportworker_pr': 'Home Support Worker - PR Application',
        'sawp_current': 'Current Season Application',
        'cit_resumption': 'Resumption of Citizenship',
        'cit_renunciation': 'Renunciation of Citizenship',
        'cit_search': 'Citizenship Search',
        'cit_adoption_part1': 'Adoption - Part 1',
        'refugees_protected_roc': 'Rest of Canada',
        'refugees_protected_qc': 'Quebec',
        'humanitarian_compassionate_roc': 'Rest of Canada',
        'humanitarian_compassionate_qc': 'Quebec'
    };
    
    const categoryName = categoryNames[categoryKey] || categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const serviceName = serviceNames[serviceKey] || serviceKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // If service name is the same as category, just return category
    if (serviceName.toLowerCase() === categoryName.toLowerCase() || serviceKey === categoryKey) {
        return categoryName;
    }
    
    return `${categoryName} - ${serviceName}`;
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
                <p>Showing the most recent available in-Canada services processing times.</p>
            `;
            servicesGrid.appendChild(headerElement);
        }
        
        // Process the services data - skip the default-update section
        const serviceCategories = Object.entries(data).filter(([key]) => key !== 'default-update');
        
        if (serviceCategories.length > 0) {
            serviceCategories.forEach(([categoryKey, categoryData]) => {
                // Handle categories that have multiple services
                Object.entries(categoryData).forEach(([serviceKey, processingTime]) => {
                    const serviceCard = document.createElement('div');
                    serviceCard.className = 'service-card';
                    
                    // Create readable service name
                    const serviceName = formatServiceName(categoryKey, serviceKey);
                    
                    serviceCard.innerHTML = `
                        <h4>${serviceName}</h4>
                        <div class="service-time">${processingTime || 'N/A'}</div>
                    `;
                    
                    servicesGrid.appendChild(serviceCard);
                });
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
