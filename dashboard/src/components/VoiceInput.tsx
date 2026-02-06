import React, { useState, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void;
  onContinuousListeningToggle?: (isListening: boolean) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptChange, onContinuousListeningToggle }) => {
  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [isContinuousListening, setIsContinuousListening] = useState<boolean>(false);

  useEffect(() => {
    if (transcript) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  useEffect(() => {
    onContinuousListeningToggle?.(listening);
  }, [listening, onContinuousListeningToggle]);

  const toggleContinuousListening = useCallback(() => {
    if (listening) {
      stopListening();
      setIsContinuousListening(false);
    } else {
      // Start continuous listening
      startListening({ continuous: true });
      setIsContinuousListening(true);
    }
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.warn('Your browser does not support speech recognition.');
      // Optionally, inform the user or disable the feature
    }
  }, [browserSupportsSpeechRecognition]);

  return (
    <div>
      <button onClick={toggleContinuousListening} disabled={!browserSupportsSpeechRecognition}>
        {listening ? 'Stop Listening' : 'Start Listening'}
      </button>
      {/* Optionally display transcript directly or hide it */}
      {/* {transcript && <p>You said: {transcript}</p>} */}
      {/* Button to reset transcript if needed */}
      {/* <button onClick={resetTranscript}>Reset Transcript</button> */}
    </div>
  );
};

export default VoiceInput;
