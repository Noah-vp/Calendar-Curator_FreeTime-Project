from datetime import datetime
import icalendar

def create_ical_export(schedule, selections, week_start, week_end):
    """Create an iCal file from the schedule data."""
    try:
        # Create iCal calendar
        cal = icalendar.Calendar()
        cal.add('prodid', '-//Optional Schedule//Export//EN')
        cal.add('version', '2.0')

        # Filter events for the current week and add them to the calendar
        for event in schedule['events']:
            try:
                # Parse event dates as UTC
                event_start = datetime.fromisoformat(event['start'].replace('Z', '+00:00'))
                if week_start <= event_start < week_end:
                    # Only include events that have been marked as attending
                    event_id = event.get('id')
                    if selections.get(event_id) == 'attending':
                        ical_event = icalendar.Event()
                        ical_event.add('summary', event['title'])
                        ical_event.add('dtstart', event_start)
                        ical_event.add('dtend', datetime.fromisoformat(event['end'].replace('Z', '+00:00')))
                        
                        # Safely get location from extendedProps
                        location = event.get('extendedProps', {}).get('location')
                        if location:
                            ical_event.add('location', location)
                        
                        cal.add_component(ical_event)
            except ValueError as e:
                print(f"Error processing event {event.get('id')}: {str(e)}")
                continue

        return cal.to_ical()
    except Exception as e:
        print(f"Error creating iCal export: {str(e)}")
        raise 