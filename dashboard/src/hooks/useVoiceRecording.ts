import { useState, useCallback, useRef } from 'react';
import { API_BASE } from '../services/api';

export const useVoiceRecording = (onTranscript: (text: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use standard audio/webm or similar supported by browser
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
          }
        } catch (error) {
          console.error('Whisper transcription error:', error);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      alert('Could not access microphone.');
    }
  }, [isRecording, onTranscript]);

  const stopRecording = useCallback(() => {
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

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    toggleRecording
  };
};