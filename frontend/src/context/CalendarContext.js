import { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import * as calendarService from "../services/calendarService";

const CalendarContext = createContext();

const initialState = {
  events: [],
  loading: false,
  error: null,
  selectedDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })(),
  view: "month",
  fetched: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_EVENTS":
      return { ...state, events: action.payload, loading: false, fetched: true };
    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.payload] };
    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
    case "DELETE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.payload) };
    case "SET_DATE":
      return { ...state, selectedDate: action.payload };
    case "SET_VIEW":
      return { ...state, view: action.payload };
    default:
      return state;
  }
}

export function CalendarProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchEvents = useCallback(async (start, end) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const events = await calendarService.fetchEvents(start, end);
      dispatch({ type: "SET_EVENTS", payload: events });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(async (event) => {
    try {
      const created = await calendarService.createEvent(event);
      dispatch({ type: "ADD_EVENT", payload: created });
      return created;
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const updateEvent = useCallback(async (event) => {
    try {
      await calendarService.updateEvent(event);
      dispatch({ type: "UPDATE_EVENT", payload: event });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const deleteEvent = useCallback(async (id) => {
    try {
      await calendarService.deleteEvent(id);
      dispatch({ type: "DELETE_EVENT", payload: id });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const getEventsForDate = useCallback(
    (date) => state.events.filter((e) => (e.date || e.start?.slice(0, 10)) === date),
    [state.events]
  );

  return (
    <CalendarContext.Provider
      value={{ state, dispatch, fetchEvents, addEvent, updateEvent, deleteEvent, getEventsForDate }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export const useCalendar = () => useContext(CalendarContext);
