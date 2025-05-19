// Global variables
let historyChart = null;
let historyData = [];

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const historyTableContainer = document.getElementById('history-table-container');
const historyTableBody = document.getElementById('history-table-body');
const noDataMessage = document.getElementById('no-data-message');
const insightsContainer = document.getElementById('insights-container');
const historyChartCanvas = document.getElementById('history-chart');

// Initialize the history page
document.addEventListener('DOMContentLoaded', function() {
    // Fetch history data
    fetchHistoryData();
});

function fetchHistoryData() {
    // Show loading indicator
    loadingIndicator.style.display = 'block';
    historyTableContainer.style.display = 'none';
    noDataMessage.style.display = 'none';
    
    // Fetch temperature history from API
    fetch('/api/history')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to retrieve history data');
            }
            return response.json();
        })
        .then(data => {
            // Process received data
            historyData = data.history;
            
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            
            // Display data
            if (historyData.length > 0) {
                displayHistoryTable();
                initHistoryChart();
                generateInsights();
                historyTableContainer.style.display = 'block';
            } else {
                noDataMessage.style.display = 'block';
                insightsContainer.innerHTML = '<div class="alert alert-info text-center">Make some temperature adjustments to see AI insights about your usage patterns.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            loadingIndicator.style.display = 'none';
            historyTableContainer.style.display = 'none';
            noDataMessage.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i> Error loading temperature history: ${error.message}</div>`;
            noDataMessage.style.display = 'block';
        });
}

function displayHistoryTable() {
    // Clear existing table rows
    historyTableBody.innerHTML = '';
    
    // Add a row for each history entry, newest first
    historyData.forEach(entry => {
        const row = document.createElement('tr');
        
        // Format the timestamp
        const timestamp = new Date(entry.timestamp);
        const formattedDate = moment(timestamp).format('MMM D, YYYY h:mm A');
        
        // Create row cells
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${entry.roomTemp}°C</td>
            <td>${entry.outdoorTemp}°C</td>
            <td>${entry.preferredTemp}°C</td>
            <td>${entry.adjustedTemp}°C</td>
            <td>${entry.timeOfDay}</td>
            <td>${entry.occupancy}</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${getEfficiencyColorClass(entry.energyEfficiency)}" 
                         role="progressbar" 
                         style="width: ${entry.energyEfficiency}%;" 
                         aria-valuenow="${entry.energyEfficiency}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${entry.energyEfficiency}%
                    </div>
                </div>
            </td>
        `;
        
        // Add tooltip with AI suggestion
        row.setAttribute('data-bs-toggle', 'tooltip');
        row.setAttribute('data-bs-placement', 'top');
        row.setAttribute('title', entry.suggestion || 'No suggestion available');
        
        // Add the row to the table
        historyTableBody.appendChild(row);
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initHistoryChart() {
    // Prepare data for chart (reverse to show oldest first)
    const chartData = [...historyData].reverse();
    
    // Extract data for the chart
    const labels = chartData.map(entry => moment(new Date(entry.timestamp)).format('MM/DD HH:mm'));
    const roomTemps = chartData.map(entry => entry.roomTemp);
    const outdoorTemps = chartData.map(entry => entry.outdoorTemp);
    const adjustedTemps = chartData.map(entry => entry.adjustedTemp);
    
    // Set up chart
    const ctx = historyChartCanvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (historyChart) {
        historyChart.destroy();
    }
    
    // Create new chart
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Room Temperature',
                    data: roomTemps,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Outdoor Temperature',
                    data: outdoorTemps,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Adjusted Temperature',
                    data: adjustedTemps,
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Temperature History Over Time'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

function generateInsights() {
    // Only generate insights if we have enough data
    if (historyData.length < 2) {
        insightsContainer.innerHTML = '<div class="alert alert-info">Make more temperature adjustments to get AI insights about your usage patterns.</div>';
        return;
    }
    
    const insights = [];
    
    // Calculate average efficiency
    const avgEfficiency = historyData.reduce((sum, entry) => sum + entry.energyEfficiency, 0) / historyData.length;
    
    // Check temp difference between preferred and adjusted
    const avgTempDifference = historyData.reduce((sum, entry) => 
        sum + Math.abs(entry.preferredTemp - entry.adjustedTemp), 0) / historyData.length;
    
    // Identify most common time of day for adjustments
    const timeCount = {};
    historyData.forEach(entry => {
        timeCount[entry.timeOfDay] = (timeCount[entry.timeOfDay] || 0) + 1;
    });
    
    const mostCommonTime = Object.keys(timeCount).reduce((a, b) => 
        timeCount[a] > timeCount[b] ? a : b);
    
    // Generate insights
    insights.push(`<div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title"><i class="fas fa-bolt me-2 text-warning"></i>Energy Efficiency</h5>
            <p>Your average energy efficiency rating is <strong>${avgEfficiency.toFixed(1)}%</strong>.</p>
            <div class="progress mb-2" style="height: 25px;">
                <div class="progress-bar ${getEfficiencyColorClass(avgEfficiency)}" 
                     role="progressbar" 
                     style="width: ${avgEfficiency}%;" 
                     aria-valuenow="${avgEfficiency}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${avgEfficiency.toFixed(1)}%
                </div>
            </div>
            <p class="mb-0 small">${getEfficiencyMessage(avgEfficiency)}</p>
        </div>
    </div>`);
    
    insights.push(`<div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title"><i class="fas fa-thermometer-half me-2 text-danger"></i>Temperature Preferences</h5>
            <p>On average, the AI adjusts your preferred temperature by <strong>${avgTempDifference.toFixed(1)}°C</strong>.</p>
            <p class="mb-0 small">${getTempDifferenceMessage(avgTempDifference)}</p>
        </div>
    </div>`);
    
    insights.push(`<div class="card mb-3">
        <div class="card-body">
            <h5 class="card-title"><i class="fas fa-clock me-2 text-info"></i>Usage Patterns</h5>
            <p>You most frequently adjust the thermostat during the <strong>${mostCommonTime}</strong>.</p>
            <p class="mb-0 small">${getTimeOfDayMessage(mostCommonTime)}</p>
        </div>
    </div>`);
    
    // Update the insights container
    insightsContainer.innerHTML = `
        <div class="row">
            ${insights.map(insight => `<div class="col-md-4">${insight}</div>`).join('')}
        </div>
    `;
}

// Utility functions
function getEfficiencyColorClass(efficiency) {
    if (efficiency >= 80) return 'bg-success';
    if (efficiency >= 60) return 'bg-info';
    if (efficiency >= 40) return 'bg-warning';
    return 'bg-danger';
}

function getEfficiencyMessage(efficiency) {
    if (efficiency >= 80) return 'Excellent! Your settings are very energy efficient.';
    if (efficiency >= 60) return 'Good efficiency. Minor improvements could save more energy.';
    if (efficiency >= 40) return 'Average efficiency. Consider adjusting your preferences to save energy.';
    return 'Low efficiency. Significant energy savings possible by accepting AI recommendations.';
}

function getTempDifferenceMessage(difference) {
    if (difference < 1) return 'Your preferences closely match energy-efficient settings.';
    if (difference < 2) return 'The AI makes minor adjustments to your preferences for better efficiency.';
    return 'Consider adjusting your temperature preferences to improve energy efficiency.';
}

function getTimeOfDayMessage(timeOfDay) {
    if (timeOfDay === 'Morning') return 'Morning adjustments often focus on warming the space as people start their day.';
    if (timeOfDay === 'Afternoon') return 'Afternoon adjustments typically respond to peak outdoor temperatures.';
    if (timeOfDay === 'Night') return 'Night adjustments usually optimize for comfort during sleep hours.';
    return 'Your adjustment patterns vary throughout the day.';
}