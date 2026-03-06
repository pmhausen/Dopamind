import { createContext, useContext, useReducer, useCallback } from "react";
import * as mailService from "../services/mailService";

const MailContext = createContext();

const initialState = {
  mails: [],
  selectedMail: null,
  folder: "INBOX",
  loading: false,
  error: null,
  composing: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_MAILS":
      return { ...state, mails: action.payload, loading: false };
    case "SELECT_MAIL":
      return { ...state, selectedMail: action.payload };
    case "SET_FOLDER":
      return { ...state, folder: action.payload, selectedMail: null };
    case "UPDATE_MAIL": {
      const updated = action.payload;
      return {
        ...state,
        mails: state.mails.map((m) => (m.uid === updated.uid ? { ...m, ...updated } : m)),
        selectedMail:
          state.selectedMail?.uid === updated.uid
            ? { ...state.selectedMail, ...updated }
            : state.selectedMail,
      };
    }
    case "REMOVE_MAIL":
      return {
        ...state,
        mails: state.mails.filter((m) => m.uid !== action.payload),
        selectedMail:
          state.selectedMail?.uid === action.payload ? null : state.selectedMail,
      };
    case "SET_COMPOSING":
      return { ...state, composing: action.payload };
    default:
      return state;
  }
}

export function MailProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchMails = useCallback(async (folder = "INBOX", masterTag = null, limit = 50) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_FOLDER", payload: folder });
    try {
      const mails = await mailService.fetchMails(folder, masterTag, limit);
      dispatch({ type: "SET_MAILS", payload: mails });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const selectMail = useCallback(async (mail) => {
    if (!mail) {
      dispatch({ type: "SELECT_MAIL", payload: null });
      return;
    }
    // Fetch full body for detail view
    let fullMail = mail;
    try {
      fullMail = await mailService.fetchMailDetail(mail.uid);
      fullMail.tags = mail.tags; // preserve tags from list
      fullMail.seen = true;
    } catch {}
    dispatch({ type: "SELECT_MAIL", payload: fullMail });
    if (!mail.seen) {
      try {
        await mailService.markSeen(mail.uid);
        dispatch({ type: "UPDATE_MAIL", payload: { uid: mail.uid, seen: true } });
      } catch {}
    }
  }, []);

  const deleteMail = useCallback(async (uid) => {
    try {
      await mailService.deleteMail(uid);
      dispatch({ type: "REMOVE_MAIL", payload: uid });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const archiveMail = useCallback(async (uid) => {
    try {
      await mailService.archiveMail(uid);
      dispatch({ type: "REMOVE_MAIL", payload: uid });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  const tagMail = useCallback(async (uid, tag) => {
    try {
      await mailService.tagMail(uid, tag);
      // Append tag to existing tags
      const mail = state.mails.find((m) => m.uid === uid);
      const currentTags = mail?.tags || [];
      const newTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
      dispatch({ type: "UPDATE_MAIL", payload: { uid, tags: newTags } });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, [state.mails]);

  const untagMail = useCallback(async (uid, tag) => {
    try {
      await mailService.untagMail(uid, tag);
      const mail = state.mails.find((m) => m.uid === uid);
      const currentTags = mail?.tags || [];
      const newTags = currentTags.filter((t) => t !== tag);
      dispatch({ type: "UPDATE_MAIL", payload: { uid, tags: newTags } });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, [state.mails]);

  const sendMail = useCallback(async (mailData) => {
    try {
      await mailService.sendMail(mailData);
      dispatch({ type: "SET_COMPOSING", payload: null });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
      throw err;
    }
  }, []);

  const startCompose = useCallback((data = {}) => {
    dispatch({ type: "SET_COMPOSING", payload: { to: "", cc: "", subject: "", body: "", ...data } });
  }, []);

  const startReply = useCallback((mail) => {
    dispatch({
      type: "SET_COMPOSING",
      payload: {
        to: mail.from,
        cc: "",
        subject: `Re: ${(mail.subject || "").replace(/^Re:\s*/i, "")}`,
        body: `\n\n--- ${mail.from} ---\n${mail.body || mail.preview || ""}`,
        replyTo: mail.uid,
      },
    });
  }, []);

  return (
    <MailContext.Provider
      value={{ state, dispatch, fetchMails, selectMail, deleteMail, archiveMail, tagMail, untagMail, sendMail, startCompose, startReply }}
    >
      {children}
    </MailContext.Provider>
  );
}

export const useMail = () => useContext(MailContext);
