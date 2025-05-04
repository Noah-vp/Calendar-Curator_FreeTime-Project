from functools import wraps
import flask
from firebase_admin import auth
from datetime import datetime, timedelta

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check if user is in session
        if 'user' in flask.session and 'user_id' in flask.session:
            # Check if session is still valid (less than 1 hour old)
            if 'last_activity' in flask.session:
                last_activity = datetime.fromisoformat(flask.session['last_activity'])
                if datetime.now() - last_activity < timedelta(hours=1):
                    # Update last activity
                    flask.session['last_activity'] = datetime.now().isoformat()
                    return f(*args, **kwargs)
            
        # If no valid session, check Firebase token
        id_token = flask.request.cookies.get('token')
        if not id_token:
            flask.flash('Please login to access this page', 'error')
            return flask.redirect(flask.url_for('login'))
            
        try:
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            # Set session variables
            flask.session['user'] = decoded_token['email']
            flask.session['user_id'] = decoded_token['uid']
            flask.session['last_activity'] = datetime.now().isoformat()
            return f(*args, **kwargs)
        except:
            # Clear invalid session
            flask.session.clear()
            flask.flash('Please login to access this page', 'error')
            return flask.redirect(flask.url_for('login'))
    return decorated_function

def handle_login_error(error_message):
    if 'auth/invalid-credential' in error_message or 'auth/invalid-email' in error_message:
        flask.flash('Invalid email or password', 'error')
    else:
        flask.flash(error_message, 'error')
    return flask.jsonify({'redirect': flask.url_for('login')}) 