from datetime import datetime
from urllib.parse import parse_qs, urlparse
from .functions import is_valid_url, parse_vu_calendar

def extract_schedule_info(url, calendar_data):
    """Extract meaningful information from the URL or calendar data."""
    # Use calendar name if available
    if calendar_data['calendar_name']:
        return {
            'title': calendar_data['calendar_name'],
            'subtitle': f"{len(calendar_data['events'])} events"
        }
    
    # Fallback: Try to get course codes from events
    course_codes = set()
    for event in calendar_data['events']:
        if 'course_code' in event['extendedProps'] and event['extendedProps']['course_code']:
            course_codes.add(event['extendedProps']['course_code'])
    
    if course_codes:
        # If we have course codes, use them
        title = ', '.join(sorted(course_codes))
        return {
            'title': title,
            'subtitle': f'{len(course_codes)} courses, {len(calendar_data["events"])} events'
        }
    
    # If no course codes, try to extract info from URL
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)
    
    # Try to find meaningful parameters in the URL
    identifiers = []
    for param in ['q', 'id', 'code', 'course']:
        if param in query_params:
            identifiers.extend(query_params[param])
    
    if identifiers:
        title = ', '.join(identifiers)
    else:
        # If no meaningful parameters, use the date
        title = f"Schedule from {datetime.now().strftime('%B %d, %Y')}"
    
    return {
        'title': title,
        'subtitle': f"{len(calendar_data['events'])} events"
    }

def process_calendar_upload(url):
    """Process a calendar URL and return the calendar data."""
    if not url:
        raise ValueError('Please enter a URL')
    
    if not is_valid_url(url):
        raise ValueError('Please enter a valid URL')
    
    calendar_data = parse_vu_calendar(url)
    if not calendar_data['events']:
        raise ValueError('No upcoming events found in the calendar')
    
    return calendar_data 