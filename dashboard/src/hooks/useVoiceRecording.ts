import { useState, useCallback, useRef } from 'react';
import { API_BASE } from '../services/api';

export const useVoiceRecording = (onTranscript: (text: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);

  // Fallback: browser Web Speech API
  const tryWebSpeechAPI = useCallback((): boolean => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Web Speech API error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    speechRecognitionRef.current = recognition;
    setIsRecording(true);
    return true;
  }, [onTranscript]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size === 0) {
          setError('No audio recorded. Please try again.');
          return;
        }

        setIsProcessing(true);
        try {
          const response = await fetch(`${API_BASE}/api/voice`, {
            method: 'POST',
            body: audioBlob,
            headers: {
              'Content-Type': 'audio/webm'
            }
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Transcription failed (${response.status})`);
          }

          const data = await response.json();
          if (data.text) {
            onTranscript(data.text);
            setError(null);
          } else {
            setError('No speech detected. Please try again.');
          }
        } catch (error: any) {
          console.error('[Voice] Whisper transcription error:', error);
          setError(error.message || 'Transcription failed. Check your API key.');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('[Voice] Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // Try Web Speech API as fallback
        if (!tryWebSpeechAPI()) {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
        }
      } else {
        setError(`Could not start recording: ${error.message}`);
      }
    }
  }, [isRecording, onTranscript, tryWebSpeechAPI]);

  const stopRecording = useCallback(() => {
    // Stop Web Speech API if active
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsRecording(false);
      return;
    }
    // Stop MediaRecorder
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isRecording,
    isProcessing,
    error,
    clearError,
    startRecording,
    stopRecording,
    toggleRecording
  };
};
