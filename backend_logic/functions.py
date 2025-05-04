from datetime import datetime, timedelta
import requests
from urllib.parse import urlparse
from icalendar import Calendar
from dateutil import tz

def is_valid_url(url):
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def parse_vu_calendar(url):
    try:
        # Fetch the calendar data
        response = requests.get(url)
        response.raise_for_status()
        
        # Parse the iCalendar data
        cal = Calendar.from_ical(response.text)
        events = []
        
        # Get calendar name
        calendar_name = str(cal.get('X-WR-CALNAME', ''))
        if calendar_name:
            # Clean up the calendar name (remove escaped characters and extra spaces)
            calendar_name = calendar_name.replace('\\', '').strip()
        
        # Convert to local timezone
        local_tz = tz.gettz('Europe/Amsterdam')
        
        # Get current date in Amsterdam timezone
        now = datetime.now(local_tz)
        today = now.date()
        
        for component in cal.walk():
            if component.name == "VEVENT":
                # Parse the event data
                summary = str(component.get('summary', ''))
                description = str(component.get('description', ''))
                location = str(component.get('location', ''))
                
                # Get start and end times
                dtstart = component.get('dtstart').dt
                dtend = component.get('dtend').dt
                
                # Convert to local timezone if they're timezone-aware
                if dtstart.tzinfo:
                    dtstart = dtstart.astimezone(local_tz)
                if dtend.tzinfo:
                    dtend = dtend.astimezone(local_tz)
                
                # Skip events that have already ended
                if dtend.date() < today:
                    continue
                
                # Format the time string with date
                time_str = f"{dtstart.strftime('%A %d %B %Y %H:%M')} - {dtend.strftime('%H:%M')}"
                
                # Extract course code and type from description
                course_info = {}
                for line in description.split('\\n'):
                    if 'Vakcode:' in line:
                        course_info['code'] = line.split('Vakcode:')[1].strip()
                    elif 'Type:' in line:
                        course_info['type'] = line.split('Type:')[1].strip()
                
                # Create a unique ID for the event
                event_id = f"{summary}_{dtstart.isoformat()}"
                
                # Format event for FullCalendar
                event = {
                    'id': event_id,
                    'title': summary,
                    'start': dtstart.isoformat(),
                    'end': dtend.isoformat(),
                    'extendedProps': {
                        'location': location,
                        'course_code': course_info.get('code', ''),
                        'type': course_info.get('type', '')
                    }
                }
                events.append(event)
        
        # Sort events by start time
        events.sort(key=lambda x: x['start'])
        
        return {
            'events': events,
            'calendar_name': calendar_name
        }
    except Exception as e:
        raise Exception(f"Error parsing calendar: {str(e)}")
