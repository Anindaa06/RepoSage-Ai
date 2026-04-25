import { useEffect, useRef, useState } from "react";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useVoice = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognition()));
  }, []);

  const ensureRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const Recognition = getSpeechRecognition();
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startListening = () => {
    const recognition = ensureRecognition();
    if (!recognition) return;
    setTranscript("");
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const clearTranscript = () => setTranscript("");

  const speak = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  };

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    speak,
    stopSpeaking
  };
};
