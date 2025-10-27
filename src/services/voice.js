/**
 * Voice Service - TTS/STT Module
 * Provides client-side Web Speech API with backend fallback
 * @module services/voice
 */

/**
 * Check if Web Speech API is available in the browser
 * @returns {Object} Object with TTS and STT availability
 */
export const checkWebSpeechSupport = () => {
  return {
    tts: 'speechSynthesis' in window,
    stt: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  };
};

/**
 * Text-to-Speech using Web Speech API
 * @param {string} text - Text to speak
 * @param {Object} options - Voice options
 * @param {string} options.lang - Language code (default: 'en-US')
 * @param {number} options.rate - Speech rate 0.1-10 (default: 1)
 * @param {number} options.pitch - Speech pitch 0-2 (default: 1)
 * @param {number} options.volume - Speech volume 0-1 (default: 1)
 * @returns {Promise<void>}
 */
export const speakText = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!checkWebSpeechSupport().tts) {
      reject(new Error('Web Speech API TTS not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stop current speech synthesis
 */
export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Get available voices from Web Speech API
 * @returns {Promise<Array>} Array of available voices
 */
export const getAvailableVoices = () => {
  return new Promise((resolve) => {
    if (!checkWebSpeechSupport().tts) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      // Voices might load asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
};

/**
 * Speech-to-Text using Web Speech API
 * @param {Object} options - Recognition options
 * @param {string} options.lang - Language code (default: 'en-US')
 * @param {boolean} options.continuous - Continuous recognition (default: false)
 * @param {boolean} options.interimResults - Return interim results (default: false)
 * @param {number} options.maxAlternatives - Max alternatives (default: 1)
 * @returns {Object} Recognition controller with start, stop methods
 */
export const startListening = (options = {}) => {
  const support = checkWebSpeechSupport();
  if (!support.stt) {
    throw new Error('Web Speech API STT not supported');
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = options.lang || 'en-US';
  recognition.continuous = options.continuous || false;
  recognition.interimResults = options.interimResults || false;
  recognition.maxAlternatives = options.maxAlternatives || 1;

  return {
    recognition,
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort()
  };
};

/**
 * Backend TTS using Firebase Cloud Functions
 * Calls /api/tts endpoint for high-quality TTS
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice ID (provider-specific)
 * @param {string} options.provider - TTS provider ('openai' or 'elevenlabs')
 * @param {string} options.model - Model to use (provider-specific)
 * @returns {Promise<string>} Audio URL
 */
export const generateTTS = async (text, options = {}) => {
  try {
    const { voice, provider = 'openai', model } = options;

    // Call backend TTS endpoint (no API keys exposed)
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice,
        provider,
        model
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'TTS generation failed');
    }

    const data = await response.json();
    return data.audioUrl;
  } catch (error) {
    console.error('Backend TTS error:', error);
    throw error;
  }
};

/**
 * Play audio from URL
 * @param {string} audioUrl - URL of the audio file
 * @param {Object} options - Playback options
 * @param {number} options.volume - Volume 0-1 (default: 1)
 * @param {number} options.playbackRate - Playback rate (default: 1)
 * @returns {Promise<HTMLAudioElement>} Audio element
 */
export const playAudio = (audioUrl, options = {}) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.volume = options.volume || 1;
    audio.playbackRate = options.playbackRate || 1;

    audio.onended = () => resolve(audio);
    audio.onerror = (error) => reject(error);

    audio.play().catch(reject);
  });
};

/**
 * Hybrid TTS - Try Web Speech first, fallback to backend
 * @param {string} text - Text to speak
 * @param {Object} options - Combined options for both methods
 * @returns {Promise<void>}
 */
export const speak = async (text, options = {}) => {
  try {
    // Try Web Speech API first (faster, no cost)
    if (checkWebSpeechSupport().tts && !options.forceBackend) {
      await speakText(text, options);
    } else {
      // Fallback to backend TTS
      const audioUrl = await generateTTS(text, options);
      await playAudio(audioUrl, options);
    }
  } catch (error) {
    console.error('Voice TTS error:', error);
    throw error;
  }
};

/**
 * Voice recorder using Web Speech API or MediaRecorder
 * @param {Object} options - Recording options
 * @param {boolean} options.useWebSpeech - Use Web Speech API (default: true)
 * @param {Function} options.onResult - Callback for recognition results
 * @param {Function} options.onError - Callback for errors
 * @returns {Object} Recorder controller
 */
export const createVoiceRecorder = (options = {}) => {
  const { useWebSpeech = true, onResult, onError } = options;

  if (useWebSpeech && checkWebSpeechSupport().stt) {
    // Use Web Speech API for STT
    const controller = startListening({
      continuous: options.continuous,
      interimResults: options.interimResults
    });

    controller.recognition.onresult = (event) => {
      const results = Array.from(event.results).map(result => ({
        transcript: result[0].transcript,
        confidence: result[0].confidence,
        isFinal: result.isFinal
      }));
      if (onResult) onResult(results);
    };

    controller.recognition.onerror = (event) => {
      if (onError) onError(event.error);
    };

    return controller;
  } else {
    // Fallback to MediaRecorder for raw audio capture
    let mediaRecorder = null;
    let audioChunks = [];

    return {
      start: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            if (onResult) onResult({ audioBlob });
          };

          mediaRecorder.start();
        } catch (error) {
          if (onError) onError(error);
        }
      },
      stop: () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
      },
      abort: () => {
        if (mediaRecorder) {
          audioChunks = [];
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
          }
        }
      }
    };
  }
};

export default {
  checkWebSpeechSupport,
  speakText,
  stopSpeaking,
  getAvailableVoices,
  startListening,
  generateTTS,
  playAudio,
  speak,
  createVoiceRecorder
};
