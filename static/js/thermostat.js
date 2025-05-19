// Global variables for chart
let temperatureChart = null;

// DOM elements
const form = document.getElementById('thermo-form');
const simulateBtn = document.getElementById('simulate-btn');
const getLocationBtn = document.getElementById('get-location-btn');
const outputDiv = document.getElementById('output');
const aiSuggestionDiv = document.getElementById('ai-suggestion');
const energyMeterDiv = document.getElementById('energy-efficiency-meter');
const chartCanvas = document.getElementById('temperature-chart');
const locationStatusDiv = document.getElementById('location-status');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set default values for the form
    document.getElementById('roomTemp').value = '22';
    document.getElementById('outdoorTemp').value = '20';
    document.getElementById('preferredTemp').value = '23';
    
    // Set up event listeners
    simulateBtn.addEventListener('click', simulateAdjustment);
    getLocationBtn.addEventListener('click', getLocationTemperature);
    
    // Initialize empty chart
    initChart();
});

function initChart() {
    // Initialize empty chart with placeholders
    const ctx = chartCanvas.getContext('2d');
    temperatureChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Current', 'Preferred', 'AI Adjusted'],
            datasets: [{
                label: 'Temperature (°C)',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 15,
                    suggestedMax: 30
                }
            }
        }
    });
}

function simulateAdjustment() {
    // Validate form inputs
    if (!validateForm()) {
        return;
    }
    
    // Gather form data
    const formData = {
        roomTemp: document.getElementById('roomTemp').value,
        outdoorTemp: document.getElementById('outdoorTemp').value,
        preferredTemp: document.getElementById('preferredTemp').value,
        timeOfDay: document.getElementById('timeOfDay').value,
        occupancy: document.getElementById('occupancy').value
    };
    
    // Show loading state
    outputDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    aiSuggestionDiv.innerHTML = '';
    
    // Make API call to adjust temperature
    fetch('/api/adjust-temperature', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        displayResults(data);
    })
    .catch(error => {
        console.error('Error:', error);
        outputDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    });
}

function validateForm() {
    const roomTemp = document.getElementById('roomTemp').value;
    const outdoorTemp = document.getElementById('outdoorTemp').value;
    const preferredTemp = document.getElementById('preferredTemp').value;
    
    if (!roomTemp || !outdoorTemp || !preferredTemp) {
        outputDiv.innerHTML = '<div class="alert alert-danger">Please fill in all temperature fields</div>';
        return false;
    }
    
    if (isNaN(roomTemp) || isNaN(outdoorTemp) || isNaN(preferredTemp)) {
        outputDiv.innerHTML = '<div class="alert alert-danger">Temperature values must be numbers</div>';
        return false;
    }
    
    return true;
}

function displayResults(data) {
    // Display adjusted temperature and change
    let changeText = data.change >= 0 ? `+${data.change}` : `${data.change}`;
    let actionText = data.change > 0 ? 'Heating' : (data.change < 0 ? 'Cooling' : 'Maintaining');
    
    outputDiv.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">AI Thermostat Adjustment</h5>
                <p class="card-text">Adjusted Thermostat Setting: <strong>${data.adjustedTemp}°C</strong></p>
                <p class="card-text">Change from current: <strong>${changeText}°C</strong></p>
                <p class="card-text">Action: <strong>${actionText}</strong></p>
            </div>
        </div>
    `;
    
    // Display AI suggestion
    aiSuggestionDiv.innerHTML = `
        <div class="alert alert-info">
            <i class="fa fa-lightbulb"></i> <strong>AI Suggestion:</strong> ${data.aiSuggestion}
        </div>
    `;
    
    // Update the energy efficiency meter
    updateEnergyEfficiency(data.energyEfficiency);
    
    // Update chart
    updateChart(data.currentTemp, data.preferredTemp, data.adjustedTemp);
}

function updateEnergyEfficiency(efficiency) {
    // Determine color based on efficiency
    let colorClass = 'bg-danger';
    if (efficiency >= 80) {
        colorClass = 'bg-success';
    } else if (efficiency >= 60) {
        colorClass = 'bg-info';
    } else if (efficiency >= 40) {
        colorClass = 'bg-warning';
    }
    
    energyMeterDiv.innerHTML = `
        <h5>Energy Efficiency</h5>
        <div class="progress">
            <div class="progress-bar ${colorClass}" role="progressbar" 
                style="width: ${efficiency}%" 
                aria-valuenow="${efficiency}" 
                aria-valuemin="0" 
                aria-valuemax="100">${efficiency}%</div>
        </div>
    `;
}

function updateChart(current, preferred, adjusted) {
    // Update chart data
    temperatureChart.data.datasets[0].data = [current, preferred, adjusted];
    
    // Adjust y-axis scale if needed
    const minTemp = Math.min(current, preferred, adjusted) - 2;
    const maxTemp = Math.max(current, preferred, adjusted) + 2;
    
    temperatureChart.options.scales.y.suggestedMin = minTemp;
    temperatureChart.options.scales.y.suggestedMax = maxTemp;
    
    // Update chart
    temperatureChart.update();
}

function getLocationTemperature() {
    // Show loading indicator
    locationStatusDiv.innerHTML = '<small class="text-info"><i class="fas fa-spinner fa-spin"></i> Getting your location...</small>';
    
    // Check if we should use fallback mode
    const useFallback = document.getElementById('fallback-mode') && document.getElementById('fallback-mode').checked;
    
    if (useFallback) {
        // Use fallback API endpoint that doesn't require real location
        locationStatusDiv.innerHTML = '<small class="text-info"><i class="fas fa-spinner fa-spin"></i> Generating sample temperature data...</small>';
        
        fetch('/api/weather?fallback=true')
            .then(response => response.json())
            .then(data => {
                // Update the outdoor temperature field
                document.getElementById('outdoorTemp').value = data.temperature;
                locationStatusDiv.innerHTML = `<small class="text-success"><i class="fas fa-check-circle"></i> Sample temperature from ${data.location}</small>`;
            })
            .catch(error => {
                console.error('Error in fallback mode:', error);
                locationStatusDiv.innerHTML = `<small class="text-danger"><i class="fas fa-exclamation-circle"></i> Error generating sample data</small>`;
            });
        
        return;
    }
    
    // Regular geolocation flow
    // Check if geolocation is supported by the browser
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                locationStatusDiv.innerHTML = '<small class="text-info"><i class="fas fa-spinner fa-spin"></i> Fetching weather data...</small>';
                
                // Get weather data from backend
                fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
                    .then(response => {
                        if (!response.ok) {
                            // Get error details from response if available
                            return response.json().then(errorData => {
                                throw new Error(errorData.error || `Weather service error (${response.status})`);
                            }).catch(e => {
                                // If can't parse JSON, use status text
                                throw new Error(`Weather service error: ${response.statusText || response.status}`);
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Update the outdoor temperature field
                        document.getElementById('outdoorTemp').value = data.temperature;
                        locationStatusDiv.innerHTML = `<small class="text-success"><i class="fas fa-check-circle"></i> Current temperature in ${data.location}</small>`;
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        
                        // Provide helpful error message based on common issues
                        let errorMessage = error.message;
                        if (errorMessage.includes('API key invalid') || errorMessage.includes('401')) {
                            errorMessage = 'Weather API key invalid. New API keys may take a few hours to activate.';
                        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                            errorMessage = 'Weather service limit reached. Please try again later.';
                        }
                        
                        // Show error and offer fallback option
                        locationStatusDiv.innerHTML = `
                            <small class="text-danger"><i class="fas fa-exclamation-circle"></i> ${errorMessage}</small>
                            <div class="mt-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="fallback-mode">
                                    <label class="form-check-label" for="fallback-mode">
                                        <small>Use sample data instead</small>
                                    </label>
                                </div>
                                <button class="btn btn-sm btn-outline-secondary mt-1" onclick="getLocationTemperature()">Try again</button>
                            </div>
                        `;
                    });
            },
            // Error callback
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Unable to get your location';
                if (error.code === 1) {
                    errorMessage = 'Location permission denied. Please allow location access and try again.';
                } else if (error.code === 2) {
                    errorMessage = 'Location unavailable. Check your device settings.';
                } else if (error.code === 3) {
                    errorMessage = 'Location request timed out. Please try again.';
                }
                
                // Show error and offer fallback option
                locationStatusDiv.innerHTML = `
                    <small class="text-danger"><i class="fas fa-exclamation-circle"></i> ${errorMessage}</small>
                    <div class="mt-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="fallback-mode">
                            <label class="form-check-label" for="fallback-mode">
                                <small>Use sample data instead</small>
                            </label>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary mt-1" onclick="getLocationTemperature()">Try again</button>
                    </div>
                `;
            },
            // Geolocation options
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        // Show error for browsers that don't support geolocation and offer fallback
        locationStatusDiv.innerHTML = `
            <small class="text-danger"><i class="fas fa-exclamation-circle"></i> Geolocation is not supported by your browser</small>
            <div class="mt-2">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="fallback-mode" checked>
                    <label class="form-check-label" for="fallback-mode">
                        <small>Use sample data instead</small>
                    </label>
                </div>
                <button class="btn btn-sm btn-outline-secondary mt-1" onclick="getLocationTemperature()">Try with sample data</button>
            </div>
        `;
    }
}
