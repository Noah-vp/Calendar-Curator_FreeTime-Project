document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");
  var selectedEvent = null;
  var currentWeekEvents = [];
  var currentEventIndex = -1;
  var exportSelection = document.getElementById("exportSelection");

  // Keep track of event selections
  var eventSelections = {};

  // Export handlers
  window.handleExportIcal = function () {
    // Get current view's date range
    const view = calendar.view;
    if (!view) return;

    const week_start = view.activeStart;
    const week_end = view.activeEnd;

    // Format dates to ensure consistent timezone handling
    const formatDate = (date) => {
      // Convert to UTC and remove timezone indicator
      return date.toISOString().split(".")[0] + "Z";
    };

    // Send data as JSON
    fetch("/export_ical", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedule_id: window.scheduleId,
        week_start: formatDate(week_start),
        week_end: formatDate(week_end),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Export failed");
        }
        return response.blob();
      })
      .then((blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule_${week_start.toISOString().split("T")[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch((error) => {
        console.error("Error exporting calendar:", error);
      });
  };

  window.handleGoogleSync = function () {
    // This will be implemented later
    console.log("Sync to Google Calendar clicked");
  };

  function updateEventStyles() {
    calendar.getEvents().forEach((event) => {
      const selection = eventSelections[event.id];
      if (event.id === selectedEvent?.id) {
        // Selected event is always blue
        event.setProp("backgroundColor", "#3b82f6");
        event.setProp("borderColor", "#2563eb");
        event.setProp("textColor", "#ffffff");
        event.setProp("classNames", "event-current");
      } else if (selection === "attending") {
        // Preserve green for attended events
        event.setProp("backgroundColor", "#10b981");
        event.setProp("borderColor", "#059669");
        event.setProp("textColor", "#ffffff");
        event.setProp("classNames", "event-attending");
      } else if (selection === "skipped") {
        // Preserve red for skipped events
        event.setProp("backgroundColor", "#ef4444");
        event.setProp("borderColor", "#dc2626");
        event.setProp("textColor", "#ffffff");
        event.setProp("classNames", "event-skipped");
      } else {
        // Default gray for unselected events
        event.setProp("backgroundColor", "#f3f4f6");
        event.setProp("borderColor", "#e5e7eb");
        event.setProp("textColor", "#374151");
        event.setProp("classNames", "");
      }
    });
    calendar.render();
  }

  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridWeek,timeGridDay",
    },
    slotMinTime: "08:00:00",
    slotMaxTime: "21:00:00",
    allDaySlot: false,
    height: "auto",
    expandRows: true,
    events: window.calendarEvents,
    eventClick: function (info) {
      // Update selected event
      selectedEvent = info.event;
      currentEventIndex = currentWeekEvents.findIndex(
        (e) => e.id === info.event.id
      );

      // Show event details
      showEventDetails(info.event);

      // Update styles
      updateEventStyles();
    },
    eventClassNames: "cursor-pointer",
    eventDidMount: function (info) {
      // Apply initial styles based on selection status
      const selection = eventSelections[info.event.id];
      if (info.event === selectedEvent) {
        info.event.setProp("backgroundColor", "#3b82f6");
        info.event.setProp("borderColor", "#2563eb");
        info.event.setProp("textColor", "#ffffff");
      } else if (selection === "attending") {
        info.event.setProp("backgroundColor", "#10b981");
        info.event.setProp("borderColor", "#059669");
        info.event.setProp("textColor", "#ffffff");
      } else if (selection === "skipped") {
        info.event.setProp("backgroundColor", "#ef4444");
        info.event.setProp("borderColor", "#dc2626");
        info.event.setProp("textColor", "#ffffff");
      }
    },
    datesSet: function (dateInfo) {
      // When the visible date range changes, update the current week's events
      const start = dateInfo.start;
      const end = dateInfo.end;
      currentWeekEvents = calendar
        .getEvents()
        .filter((event) => {
          return event.start >= start && event.start < end;
        })
        .sort((a, b) => a.start - b.start);

      // Reset current selection
      selectedEvent = null;

      // Find and select the first truly undecided event (no selection in backend)
      const firstUndecidedEvent = currentWeekEvents.find(
        (event) => !eventSelections[event.id]
      );
      if (firstUndecidedEvent) {
        selectedEvent = firstUndecidedEvent;
        currentEventIndex = currentWeekEvents.indexOf(firstUndecidedEvent);
        showEventDetails(selectedEvent);
        updateEventStyles();
        exportSelection.style.display = "none";
      } else {
        // Hide event details if no undecided events in this week
        document.getElementById("eventSelection").style.display = "none";
        currentEventIndex = -1;
        selectedEvent = null;
        updateEventStyles();
        // Show the export interface when all events are decided
        exportSelection.style.display = "block";
      }
    },
  });

  // Load selections before rendering the calendar
  async function initializeCalendar() {
    try {
      // Load saved selections
      await loadSelections();

      // Render the calendar after selections are loaded
      calendar.render();

      // Update the current week's events and select the first undecided event
      const view = calendar.view;
      if (view) {
        const start = view.activeStart;
        const end = view.activeEnd;
        currentWeekEvents = calendar
          .getEvents()
          .filter((event) => {
            return event.start >= start && event.start < end;
          })
          .sort((a, b) => a.start - b.start);

        // Find and select the first undecided event
        const firstUndecidedEvent = currentWeekEvents.find(
          (event) => !eventSelections[event.id]
        );
        if (firstUndecidedEvent) {
          selectedEvent = firstUndecidedEvent;
          currentEventIndex = currentWeekEvents.indexOf(firstUndecidedEvent);
          showEventDetails(selectedEvent);
          updateEventStyles();
          exportSelection.style.display = "none";
        } else {
          // Show the export interface when all events are decided
          exportSelection.style.display = "block";
        }
      }
    } catch (error) {
      console.error("Error initializing calendar:", error);
      // Still render the calendar even if there's an error loading selections
      calendar.render();
    }
  }

  // Initialize the calendar
  initializeCalendar();

  function showEventDetails(event) {
    const eventSelection = document.getElementById("eventSelection");
    const eventTitle = document.getElementById("eventTitle");
    const eventLocation = document.getElementById("eventLocation");
    const eventTime = document.getElementById("eventTime");

    eventTitle.textContent = event.title;
    eventLocation.textContent = event.extendedProps.location || "No location";
    eventTime.textContent = `${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}`;
    eventSelection.style.display = "block";
  }

  function moveToNextEvent() {
    // Find the next undecided event starting from current position
    let nextUndecidedEvent = currentWeekEvents
      .slice(currentEventIndex + 1)
      .find((event) => !eventSelections[event.id]);

    // If no undecided events found after current position,
    // look from beginning of week up to current position
    if (!nextUndecidedEvent) {
      nextUndecidedEvent = currentWeekEvents
        .slice(0, currentEventIndex + 1)
        .find((event) => !eventSelections[event.id]);
    }

    if (nextUndecidedEvent) {
      // Update selection to next undecided event
      selectedEvent = nextUndecidedEvent;
      currentEventIndex = currentWeekEvents.indexOf(nextUndecidedEvent);
      showEventDetails(selectedEvent);
      updateEventStyles();
      exportSelection.style.display = "none";
    } else {
      // Hide event details if no undecided events in this week
      document.getElementById("eventSelection").style.display = "none";
      currentEventIndex = -1;
      selectedEvent = null;
      updateEventStyles();
      // Show the export interface when all events are decided
      exportSelection.style.display = "block";
    }
  }

  window.handleAttend = function () {
    if (selectedEvent) {
      // Update local state
      eventSelections[selectedEvent.id] = "attending";
      updateEventStyles();

      // Update API in background
      updateEventSelection(selectedEvent.id, "attending").then(() => {
        moveToNextEvent();
      });
    }
  };

  window.handleSkip = function () {
    if (selectedEvent) {
      // Update local state
      eventSelections[selectedEvent.id] = "skipped";
      updateEventStyles();

      // Update API in background
      updateEventSelection(selectedEvent.id, "skipped").then(() => {
        moveToNextEvent();
      });
    }
  };

  async function updateEventSelection(eventId, selection) {
    try {
      const response = await fetch("/update_selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          selection: selection,
          schedule_id: window.scheduleId,
        }),
      });

      if (!response.ok) {
        // If API call fails, revert the selection
        delete eventSelections[eventId];
        updateEventStyles();
        console.error("Failed to update selection on server");
      }
    } catch (error) {
      // If API call fails, revert the selection
      delete eventSelections[eventId];
      updateEventStyles();
      console.error("Error updating selection:", error);
    }
  }

  async function loadSelections() {
    try {
      const response = await fetch(
        `/get_selections?schedule_id=${window.scheduleId}`
      );
      const selections = await response.json();

      // Update local state with saved selections
      eventSelections = selections;

      // Update event styles
      updateEventStyles();
    } catch (error) {
      console.error("Error loading selections:", error);
    }
  }
});
