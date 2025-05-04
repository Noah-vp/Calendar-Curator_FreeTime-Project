import flask
import json
from datetime import datetime
from backend_logic.auth import login_required
from backend_logic.calendar import extract_schedule_info, process_calendar_upload
from backend_logic.firebase import get_user_schedules, get_schedule, save_schedule, update_selection, get_selections
from backend_logic.ical import create_ical_export
from backend_logic.errors import (
    AuthenticationError, ValidationError, DatabaseError,
    handle_error, handle_web_error, validate_request_data, handle_firebase_error
)
from firebase_admin import auth, credentials, initialize_app

# Initialize Firebase Admin SDK
cred = credentials.Certificate("private_key.json")  # You'll need to download this from Firebase Console
initialize_app(cred, {
    'databaseURL': 'https://calendarcuratortool-default-rtdb.europe-west1.firebasedatabase.app/'  # Replace with your actual database URL
}) 

app = flask.Flask(__name__)
app.secret_key = 'scheduleing_is_all_optional'  # Required for flashing messages and sessions

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return handle_web_error(error)

@app.errorhandler(500)
def internal_error(error):
    return handle_web_error(error)

@app.errorhandler(AuthenticationError)
def handle_auth_error(error):
    return handle_error(error)

@app.errorhandler(ValidationError)
def handle_validation_error(error):
    return handle_error(error)

@app.errorhandler(DatabaseError)
def handle_database_error(error):
    return handle_error(error)

# Routes
@app.route('/')
def landing():
    return flask.render_template('landing.html')

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = flask.session.get('user_id')
    if not user_id:
        raise AuthenticationError('User not authenticated')
    
    try:
        schedules = get_user_schedules(user_id)
        return flask.render_template('dashboard.html', schedules=schedules)
    except Exception as e:
        raise DatabaseError(f'Error fetching schedules: {str(e)}')

@app.route('/settings')
@login_required
def settings():
    user_email = flask.session.get('user')
    if not user_email:
        raise AuthenticationError('User not authenticated')
    return flask.render_template('settings.html', user_email=user_email)

@app.route('/privacy')
def privacy():
    return flask.render_template('privacy.html')

@app.route('/terms')
def terms():
    return flask.render_template('terms.html')

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if flask.request.method == 'GET':
        return flask.render_template('login.html')
    return flask.redirect(flask.url_for('dashboard'))

@app.route('/login_error', methods=['POST'])
def login_error():
    error_message = flask.request.json.get('error')
    flask.flash(error_message, 'error')
    return flask.redirect(flask.url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if flask.request.method == 'POST':
        email = flask.request.form.get('email')
        password = flask.request.form.get('password')
        confirm_password = flask.request.form.get('confirm_password')
        
        # Basic validation
        if not email or not password or not confirm_password:
            flask.flash('All fields are required', 'error')
            return flask.redirect(flask.url_for('register'))
            
        if password != confirm_password:
            flask.flash('Passwords do not match', 'error')
            return flask.redirect(flask.url_for('register'))
            
        try:
            # Create user with Firebase Authentication
            user = auth.create_user(
                email=email,
                password=password
            )
            flask.flash('Registration successful! Please login.', 'success')
            return flask.redirect(flask.url_for('login'))
            
        except auth.EmailAlreadyExistsError:
            flask.flash('Email already registered', 'error')
            return flask.redirect(flask.url_for('register'))
        except Exception as e:
            flask.flash(f'Registration failed: {str(e)}', 'error')
            return flask.redirect(flask.url_for('register'))
    
    return flask.render_template('register.html')

@app.route('/register_error', methods=['POST'])
def register_error():
    error_message = flask.request.json.get('error')
    flask.flash(error_message, 'error')
    return flask.jsonify({'redirect': flask.url_for('register')})

@app.route('/logout')
def logout():
    flask.session.clear()
    response = flask.redirect(flask.url_for('landing'))
    response.set_cookie('token', '', expires=0)
    return response

# Calendar functionality
@app.route('/upload_schedule', methods=['POST'])
@login_required
def upload_schedule():
    data = flask.request.form
    validate_request_data(data, ['url'])
    
    try:
        calendar_data = process_calendar_upload(data['url'])
        schedule_info = extract_schedule_info(data['url'], calendar_data)
        
        user_id = flask.session.get('user_id')
        if not user_id:
            raise AuthenticationError('User not authenticated')
        
        new_schedule = {
            'url': data['url'],
            'events': calendar_data['events'],
            'event_count': len(calendar_data['events']),
            'title': schedule_info['title'],
            'subtitle': schedule_info['subtitle']
        }
        
        schedule_id = save_schedule(user_id, new_schedule)
        flask.flash('Schedule imported successfully!', 'success')
        return flask.redirect(flask.url_for('dashboard'))
        
    except ValueError as e:
        raise ValidationError(str(e))
    except Exception as e:
        raise DatabaseError(f'Error importing schedule: {str(e)}')

@app.route('/schedule/<id>')
@login_required
def schedule(id):
    user_id = flask.session.get('user_id')
    if not user_id:
        raise AuthenticationError('User not authenticated')
    
    try:
        schedule = get_schedule(user_id, id)
        if not schedule:
            raise ValidationError('Schedule not found')
        
        events_json = json.dumps(schedule['events'], ensure_ascii=False)
        return flask.render_template('index.html', 
                                   events=events_json,
                                   has_imported=True,
                                   schedule_id=id)
        
    except Exception as e:
        raise DatabaseError(f'Error fetching schedule: {str(e)}')

@app.route('/update_selection', methods=['POST'])
@login_required
def update_selection():
    data = flask.request.get_json()
    validate_request_data(data, ['event_id', 'selection', 'schedule_id'])
    
    user_id = flask.session.get('user_id')
    if not user_id:
        raise AuthenticationError('User not authenticated')
    
    try:
        success = update_selection(user_id, data['schedule_id'], data['event_id'], data['selection'])
        if not success:
            raise DatabaseError('Failed to update selection')
        return flask.jsonify({'success': True})
    except Exception as e:
        raise DatabaseError(f'Error updating selection: {str(e)}')

@app.route('/get_selections', methods=['GET'])
@login_required
def get_selections_route():
    schedule_id = flask.request.args.get('schedule_id')
    if not schedule_id:
        raise ValidationError('Schedule ID is required')
        
    user_id = flask.session.get('user_id')
    if not user_id:
        raise AuthenticationError('User not authenticated')
    
    try:
        selections = get_selections(user_id, schedule_id)
        return flask.jsonify(selections)
    except Exception as e:
        raise DatabaseError(f'Error fetching selections: {str(e)}')

@app.route('/export_ical', methods=['POST'])
@login_required
def export_ical():
    data = flask.request.get_json()
    validate_request_data(data, ['schedule_id', 'week_start', 'week_end'])
    
    try:
        week_start = datetime.fromisoformat(data['week_start'].replace('Z', '+00:00'))
        week_end = datetime.fromisoformat(data['week_end'].replace('Z', '+00:00'))
    except ValueError as e:
        raise ValidationError('Invalid date format')
    
    user_id = flask.session.get('user_id')
    if not user_id:
        raise AuthenticationError('User not authenticated')

    try:
        schedule = get_schedule(user_id, data['schedule_id'])
        if not schedule:
            raise ValidationError('Schedule not found')

        selections = get_selections(user_id, data['schedule_id'])
        ical_data = create_ical_export(schedule, selections, week_start, week_end)

        response = flask.make_response(ical_data)
        response.headers['Content-Type'] = 'text/calendar'
        response.headers['Content-Disposition'] = f'attachment; filename=schedule_{week_start.strftime("%Y%m%d")}.ics'
        return response
    except Exception as e:
        raise DatabaseError(f'Error creating iCal export: {str(e)}')

if __name__ == '__main__':
    app.run(debug=True)
