import os
from flask import Flask, render_template, request, jsonify

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

@app.route('/')
def index():
    """Render the main page of the thermostat simulator"""
    return render_template('index.html')

@app.route('/api/adjust-temperature', methods=['POST'])
def adjust_temperature():
    """API endpoint to calculate temperature adjustments based on AI logic"""
    data = request.json
    
    # Extract data from request
    room_temp = float(data.get('roomTemp', 22))
    outdoor_temp = float(data.get('outdoorTemp', 20))
    preferred_temp = float(data.get('preferredTemp', 23))
    time_of_day = data.get('timeOfDay', 'Morning')
    occupancy = data.get('occupancy') == 'Yes'
    
    # Apply AI logic for temperature adjustment
    adjusted_temp = preferred_temp
    
    # If room is unoccupied, use energy saving mode
    if not occupancy:
        adjusted_temp = 28 if outdoor_temp > 25 else 18
    # Night time adjustment
    elif time_of_day == 'Night':
        adjusted_temp = preferred_temp - 1
    # Morning adjustments
    elif time_of_day == 'Morning':
        # In the morning, warm up a bit if it's cold outside
        if outdoor_temp < 15:
            adjusted_temp = preferred_temp + 0.5
    # Afternoon adjustments
    elif time_of_day == 'Afternoon':
        # In the afternoon, if it's hot outside, lower temp slightly
        if outdoor_temp > 30:
            adjusted_temp = preferred_temp - 0.5
    
    # Calculate energy efficiency
    energy_efficiency = calculate_energy_efficiency(room_temp, adjusted_temp, outdoor_temp, occupancy)
    
    # Generate AI suggestion
    ai_suggestion = generate_ai_suggestion(adjusted_temp, room_temp, outdoor_temp, occupancy, time_of_day)
    
    return jsonify({
        'adjustedTemp': round(adjusted_temp, 1),
        'currentTemp': room_temp,
        'preferredTemp': preferred_temp,
        'change': round(adjusted_temp - room_temp, 1),
        'energyEfficiency': energy_efficiency,
        'aiSuggestion': ai_suggestion
    })

def calculate_energy_efficiency(current_temp, adjusted_temp, outdoor_temp, occupancy):
    """Calculate the energy efficiency of the adjusted temperature setting"""
    # Baseline efficiency
    efficiency = 80
    
    # Efficiency decreases as the difference between indoor and outdoor increases
    temp_difference = abs(adjusted_temp - outdoor_temp)
    efficiency -= min(30, temp_difference * 1.5)
    
    # If room is unoccupied and we're using eco settings, efficiency is higher
    if not occupancy:
        efficiency += 15
    
    # If we're making a large adjustment, that's less efficient
    if abs(adjusted_temp - current_temp) > 2:
        efficiency -= 10
    
    # Ensure efficiency stays within 0-100 range
    return max(0, min(100, round(efficiency)))

def generate_ai_suggestion(adjusted_temp, current_temp, outdoor_temp, occupancy, time_of_day):
    """Generate an AI suggestion based on the thermostat settings"""
    
    change = adjusted_temp - current_temp
    
    if not occupancy:
        return "Room is unoccupied. Activating eco mode to save energy."
    
    suggestions = []
    
    # Temperature difference suggestions
    if abs(change) > 3:
        suggestions.append(f"Large temperature change of {abs(change):.1f}°C may use significant energy. Consider a gradual change.")
    
    # Time of day specific suggestions
    if time_of_day == 'Night':
        suggestions.append("Lower temperature at night can improve sleep quality and save energy.")
    elif time_of_day == 'Morning' and outdoor_temp < 10:
        suggestions.append("It's cold outside. Pre-heating the room is recommended.")
    elif time_of_day == 'Afternoon' and outdoor_temp > 30:
        suggestions.append("It's hot outside. Consider using fans to supplement cooling.")
    
    # Outdoor vs indoor temperature suggestions
    if outdoor_temp > adjusted_temp + 5:
        suggestions.append("Keep blinds/curtains closed to prevent heat gain from sunlight.")
    elif outdoor_temp < adjusted_temp - 5:
        suggestions.append("Ensure windows and doors are sealed to prevent heat loss.")
    
    # Energy saving suggestions
    if adjusted_temp > 25:
        suggestions.append("Setting above 25°C will optimize energy savings.")
    elif adjusted_temp < 19:
        suggestions.append("Setting below 19°C will increase energy consumption.")
    
    # If we have multiple suggestions, pick one randomly to avoid overwhelming the user
    import random
    if suggestions:
        return random.choice(suggestions)
    else:
        return "Current setting is optimal for comfort and energy efficiency."
