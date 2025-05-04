from flask import jsonify, render_template
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CalendarError(Exception):
    """Base exception for calendar-related errors"""
    pass

class AuthenticationError(Exception):
    """Exception for authentication-related errors"""
    pass

class ValidationError(Exception):
    """Exception for validation-related errors"""
    pass

class DatabaseError(Exception):
    """Exception for database-related errors"""
    pass

def handle_error(error, status_code=500):
    """Generic error handler that returns appropriate response based on error type"""
    error_message = str(error)
    logger.error(f"Error occurred: {error_message}")
    
    if isinstance(error, AuthenticationError):
        return jsonify({'error': error_message}), 401
    elif isinstance(error, ValidationError):
        return jsonify({'error': error_message}), 400
    elif isinstance(error, DatabaseError):
        return jsonify({'error': 'Database operation failed'}), 500
    else:
        return jsonify({'error': 'An unexpected error occurred'}), status_code

def handle_web_error(error, template='error.html'):
    """Handler for web page errors that renders an error template"""
    error_message = str(error)
    logger.error(f"Web error occurred: {error_message}")
    return render_template(template, error=error_message), 500

def validate_request_data(data, required_fields):
    """Validate that all required fields are present in the request data"""
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
    return True

def handle_firebase_error(error):
    """Handle Firebase-specific errors"""
    error_message = str(error)
    logger.error(f"Firebase error: {error_message}")
    
    if 'email-already-exists' in error_message.lower():
        raise ValidationError('Email already registered')
    elif 'invalid-email' in error_message.lower():
        raise ValidationError('Invalid email format')
    elif 'weak-password' in error_message.lower():
        raise ValidationError('Password is too weak')
    else:
        raise DatabaseError('Firebase operation failed') 