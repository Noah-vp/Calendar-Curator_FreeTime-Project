from firebase_admin import db
import uuid
from datetime import datetime

def get_user_schedules(user_id):
    """Get all schedules for a user."""
    try:
        user_schedules_ref = db.reference(f'users/{user_id}/schedules')
        schedules_snapshot = user_schedules_ref.get()
        
        schedules = []
        if schedules_snapshot:
            for schedule_id, schedule_data in schedules_snapshot.items():
                schedule_data['id'] = schedule_id
                schedules.append(schedule_data)
        
        return schedules
    except Exception as e:
        print(f"Error fetching schedules: {str(e)}")
        return []

def get_schedule(user_id, schedule_id):
    """Get a specific schedule for a user."""
    try:
        schedule_ref = db.reference(f'users/{user_id}/schedules/{schedule_id}')
        schedule = schedule_ref.get()
        return schedule
    except Exception as e:
        print(f"Error fetching schedule: {str(e)}")
        return None

def save_schedule(user_id, schedule_data):
    """Save a new schedule for a user."""
    try:
        schedule_id = str(uuid.uuid4())
        schedule_data['id'] = schedule_id
        schedule_data['created_at'] = datetime.now().isoformat()
        
        user_schedules_ref = db.reference(f'users/{user_id}/schedules')
        user_schedules_ref.push(schedule_data)
        
        return schedule_id
    except Exception as e:
        print(f"Error saving schedule: {str(e)}")
        raise

def update_selection(user_id, schedule_id, event_id, selection):
    """Update the selection status for an event."""
    try:
        selection_ref = db.reference(f'users/{user_id}/schedules/{schedule_id}/selections/{event_id}')
        selection_ref.set(selection)
        return True
    except Exception as e:
        print(f"Error updating selection: {str(e)}")
        return False

def get_selections(user_id, schedule_id):
    """Get all selections for a schedule."""
    try:
        selections_ref = db.reference(f'users/{user_id}/schedules/{schedule_id}/selections')
        selections = selections_ref.get() or {}
        return selections
    except Exception as e:
        print(f"Error fetching selections: {str(e)}")
        return {} 