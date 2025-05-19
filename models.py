from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# This is a placeholder that will be replaced with the actual db instance from app.py
db = SQLAlchemy()

class TemperatureAdjustment(db.Model):
    """Model for storing temperature adjustment history"""
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    room_temp = db.Column(db.Float, nullable=False)
    outdoor_temp = db.Column(db.Float, nullable=False)
    preferred_temp = db.Column(db.Float, nullable=False)
    adjusted_temp = db.Column(db.Float, nullable=False)
    time_of_day = db.Column(db.String(20), nullable=False)
    occupancy = db.Column(db.Boolean, default=True, nullable=False)
    energy_efficiency = db.Column(db.Integer, nullable=False)
    suggestion = db.Column(db.Text)

    def __repr__(self):
        return f'<TemperatureAdjustment {self.timestamp}: {self.room_temp}°C → {self.adjusted_temp}°C>'
    
    def to_dict(self):
        """Convert adjustment record to dictionary for API responses"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'roomTemp': self.room_temp,
            'outdoorTemp': self.outdoor_temp,
            'preferredTemp': self.preferred_temp,
            'adjustedTemp': self.adjusted_temp,
            'timeOfDay': self.time_of_day,
            'occupancy': 'Yes' if self.occupancy else 'No',
            'energyEfficiency': self.energy_efficiency,
            'suggestion': self.suggestion
        }