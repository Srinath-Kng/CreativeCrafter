import os
import logging
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# OpenWeatherMap API key
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")

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
        
@app.route('/api/weather', methods=['GET'])
def get_weather():
    """API endpoint to fetch current weather based on location"""
    import logging
    import random
    
    # Check if we're using the fallback mode (no API call)
    use_fallback = request.args.get('fallback') == 'true'
    
    if use_fallback:
        # Generate a reasonable random temperature based on season 
        # (simplified for demo - could be more sophisticated in real app)
        base_temp = 22  # Default comfortable room temperature
        variation = random.uniform(-5, 5)  # Random variation
        
        return jsonify({
            'temperature': round(base_temp + variation, 1),
            'location': 'Demo Location (Fallback Mode)',
            'fallback': True
        })
    
    # Get latitude and longitude from request
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    
    # Check if OpenWeather API key exists
    if not OPENWEATHER_API_KEY:
        logging.error("OpenWeather API key is missing")
        return jsonify({'error': 'Weather API key not configured'}), 500
    
    try:
        # Print API key for debugging (only first 4 and last 4 characters)
        api_key = OPENWEATHER_API_KEY
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
        logging.debug(f"Using API key: {masked_key}")
        
        # Call OpenWeatherMap API
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={api_key}"
        logging.debug(f"Requesting weather data from: {weather_url.replace(api_key, 'API_KEY_HIDDEN')}")
        
        response = requests.get(weather_url, timeout=10)
        
        # Log the status code and response content for debugging
        logging.debug(f"OpenWeatherMap API response status: {response.status_code}")
        logging.debug(f"OpenWeatherMap API response content: {response.text[:200]}...")
        
        # Handle specific error cases
        if response.status_code == 401:
            logging.error("OpenWeatherMap API key invalid or unauthorized")
            return jsonify({'error': 'Weather API key invalid or unauthorized. Please check the key or wait for it to activate.'}), 401
        elif response.status_code == 429:
            logging.error("OpenWeatherMap API rate limit exceeded")
            return jsonify({'error': 'Weather API rate limit exceeded. Please try again later.'}), 429
        
        response.raise_for_status()  # Raise exception for other HTTP errors
        
        weather_data = response.json()
        logging.debug(f"Weather data received: {weather_data}")
        
        # Extract relevant information
        temperature = weather_data.get('main', {}).get('temp')
        location = weather_data.get('name')
        country = weather_data.get('sys', {}).get('country')
        
        if temperature is None:
            logging.error("Temperature data not available in API response")
            return jsonify({'error': 'Temperature data not available'}), 500
            
        return jsonify({
            'temperature': round(temperature, 1),
            'location': f"{location}, {country}" if location and country else "your location"
        })
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Weather service error: {str(e)}")
        return jsonify({'error': f'Weather service error: {str(e)}'}), 500
    except Exception as e:
        logging.error(f"Unexpected error in weather API: {str(e)}")
        return jsonify({'error': 'Unable to fetch weather data'}), 500
