import { Mic, MicOff } from "lucide-react";

const VoiceButton = ({ isListening, transcript, onStart, onStop, disabled }) => (
  <div className="voice-wrap">
    <button
      type="button"
      className={`voice-btn ${isListening ? "active" : ""}`}
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      aria-label={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
    {transcript ? <p className="voice-transcript">{transcript}</p> : null}
  </div>
);

export default VoiceButton;
