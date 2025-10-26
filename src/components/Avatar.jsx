import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Avatar Component - Ready Player Me Integration
 * 
 * Displays a 3D avatar with lip-sync animation and emotional expressions.
 * Integrates Ready Player Me SDK for avatar rendering and provides hooks
 * for TTS audio synchronization and emotion-based animations.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.speaking - Whether the avatar is currently speaking
 * @param {string} props.emotion - Current emotion state (neutral, happy, sad, surprised, thinking)
 * @param {string} props.avatarUrl - Ready Player Me avatar URL (optional)
 * @param {Object} props.audioConfig - Audio configuration for lip-sync
 * @param {string} props.audioConfig.url - TTS audio URL
 * @param {string} props.audioConfig.transcript - Text transcript for fallback animation
 * @param {string} props.className - Additional CSS classes
 */
const Avatar = ({ 
  speaking = false, 
  emotion = 'neutral',
  avatarUrl = null,
  audioConfig = null,
  className = ''
}) => {
  const iframeRef = useRef(null);
  const audioRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(emotion);
  const [isSpeaking, setIsSpeaking] = useState(speaking);
  
  // Default Ready Player Me avatar URL (can be customized)
  const defaultAvatarUrl = avatarUrl || 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=1024';
  
  // Ready Player Me iframe configuration
  const rpmConfig = {
    clearCache: false,
    bodyType: 'fullbody',
    quickStart: false,
    selectBodyType: false,
  };

  /**
   * Initialize Ready Player Me avatar in iframe
   */
  useEffect(() => {
    if (!iframeRef.current) return;

    const handleLoad = () => {
      setIsLoaded(true);
      console.log('[Avatar] Ready Player Me avatar loaded successfully');
    };

    const iframe = iframeRef.current;
    iframe.addEventListener('load', handleLoad);

    // Listen for messages from RPM iframe
    const handleMessage = (event) => {
      if (event.data?.source === 'readyplayerme') {
        console.log('[Avatar] RPM Event:', event.data);
        
        // Handle avatar export/selection
        if (event.data.eventName === 'v1.avatar.exported') {
          console.log('[Avatar] New avatar selected:', event.data.data.url);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Handle emotion changes with smooth transitions
   */
  useEffect(() => {
    setCurrentEmotion(emotion);
    console.log(`[Avatar] Emotion changed to: ${emotion}`);
    
    // Send emotion update to avatar renderer if available
    if (iframeRef.current && isLoaded) {
      try {
        iframeRef.current.contentWindow?.postMessage({
          target: 'readyplayerme',
          type: 'emotion',
          data: { emotion }
        }, '*');
      } catch (error) {
        console.warn('[Avatar] Failed to send emotion update:', error);
      }
    }
  }, [emotion, isLoaded]);

  /**
   * Handle speaking state and lip-sync animation
   */
  useEffect(() => {
    setIsSpeaking(speaking);
    
    // If audioConfig is provided, handle lip-sync
    if (speaking && audioConfig) {
      handleLipSync(audioConfig);
    } else if (!speaking && audioRef.current) {
      // Stop audio playback when speaking ends
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [speaking, audioConfig]);

  /**
   * Lip-sync animation handler
   * Synchronizes mouth movements with TTS audio or transcript
   * 
   * @param {Object} config - Audio configuration
   * @param {string} config.url - Audio URL
   * @param {string} config.transcript - Text transcript
   */
  const handleLipSync = async (config) => {
    try {
      console.log('[Avatar] Starting lip-sync with config:', config);

      // If audio URL is provided, use audio-driven lip-sync
      if (config.url) {
        if (!audioRef.current) {
          audioRef.current = new Audio(config.url);
        } else {
          audioRef.current.src = config.url;
        }

        // Setup audio analysis for real-time lip-sync
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioRef.current);
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Animate mouth based on audio amplitude
        const animateMouth = () => {
          if (!isSpeaking) return;
          
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          const intensity = Math.min(average / 128, 1);

          // Send lip-sync data to avatar
          if (iframeRef.current && isLoaded) {
            iframeRef.current.contentWindow?.postMessage({
              target: 'readyplayerme',
              type: 'lipsync',
              data: { intensity, speaking: true }
            }, '*');
          }

          requestAnimationFrame(animateMouth);
        };

        audioRef.current.play();
        animateMouth();
      } 
      // If only transcript is provided, use text-driven animation
      else if (config.transcript) {
        simulateTextBasedLipSync(config.transcript);
      }
    } catch (error) {
      console.error('[Avatar] Lip-sync error:', error);
    }
  };

  /**
   * Simulate lip-sync animation based on text transcript
   * Used as fallback when audio URL is not available
   * 
   * @param {string} transcript - Text to animate
   */
  const simulateTextBasedLipSync = (transcript) => {
    if (!transcript || !iframeRef.current || !isLoaded) return;

    console.log('[Avatar] Using text-based lip-sync for:', transcript.substring(0, 50));

    const words = transcript.split(' ');
    const avgWordDuration = 300; // milliseconds per word
    
    let currentWordIndex = 0;

    const animateNextWord = () => {
      if (!isSpeaking || currentWordIndex >= words.length) {
        // Animation complete
        iframeRef.current?.contentWindow?.postMessage({
          target: 'readyplayerme',
          type: 'lipsync',
          data: { intensity: 0, speaking: false }
        }, '*');
        return;
      }

      const word = words[currentWordIndex];
      const intensity = 0.5 + Math.random() * 0.5; // Vary intensity

      // Send lip-sync pulse
      iframeRef.current?.contentWindow?.postMessage({
        target: 'readyplayerme',
        type: 'lipsync',
        data: { intensity, speaking: true, word }
      }, '*');

      currentWordIndex++;
      setTimeout(animateNextWord, avgWordDuration);
    };

    animateNextWord();
  };

  /**
   * Get emotion-based visual styling
   */
  const getEmotionStyle = () => {
    const emotionStyles = {
      neutral: 'opacity-100',
      happy: 'opacity-100 brightness-110',
      sad: 'opacity-90 brightness-90',
      surprised: 'opacity-100 brightness-105 scale-105',
      thinking: 'opacity-95',
      excited: 'opacity-100 brightness-110 scale-102'
    };
    
    return emotionStyles[currentEmotion] || emotionStyles.neutral;
  };

  /**
   * Get speaking indicator classes
   */
  const getSpeakingIndicator = () => {
    if (!isSpeaking) return null;
    
    return (
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        <span className="text-xs font-medium">Speaking...</span>
      </div>
    );
  };

  return (
    <div className={`avatar-container relative w-full h-full overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg shadow-2xl ${className}`}>
      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white text-sm font-medium">Loading Avatar...</p>
          </div>
        </div>
      )}

      {/* Ready Player Me Avatar Iframe */}
      <iframe
        ref={iframeRef}
        src={`https://demo.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody&avatarUrl=${encodeURIComponent(defaultAvatarUrl)}`}
        className={`w-full h-full border-0 transition-all duration-300 ${getEmotionStyle()}`}
        allow="camera *; microphone *; clipboard-write"
        title="Ready Player Me Avatar"
        style={{ minHeight: '400px' }}
      />

      {/* Speaking Indicator */}
      {getSpeakingIndicator()}

      {/* Emotion Indicator Badge */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-80 text-white px-3 py-1 rounded-full text-xs font-medium">
        <span className="capitalize">{currentEmotion}</span>
      </div>

      {/* Hidden audio element for lip-sync */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

// PropTypes validation
Avatar.propTypes = {
  speaking: PropTypes.bool,
  emotion: PropTypes.oneOf(['neutral', 'happy', 'sad', 'surprised', 'thinking', 'excited']),
  avatarUrl: PropTypes.string,
  audioConfig: PropTypes.shape({
    url: PropTypes.string,
    transcript: PropTypes.string
  }),
  className: PropTypes.string
};

export default Avatar;

/**
 * Custom hook for avatar lip-sync control
 * Provides easy interface for managing avatar speech
 * 
 * @returns {Object} Avatar control methods
 */
export const useAvatarLipSync = () => {
  const [speaking, setSpeaking] = useState(false);
  const [audioConfig, setAudioConfig] = useState(null);

  const speak = (url, transcript) => {
    setAudioConfig({ url, transcript });
    setSpeaking(true);
  };

  const stopSpeaking = () => {
    setSpeaking(false);
    setAudioConfig(null);
  };

  return {
    speaking,
    audioConfig,
    speak,
    stopSpeaking
  };
};

/**
 * Usage Example:
 * 
 * import Avatar, { useAvatarLipSync } from './components/Avatar';
 * 
 * function MyComponent() {
 *   const { speaking, audioConfig, speak, stopSpeaking } = useAvatarLipSync();
 *   const [emotion, setEmotion] = useState('neutral');
 * 
 *   const handleSpeak = async () => {
 *     // Get TTS audio from your voice service
 *     const audioUrl = await generateTTS('Hello, I am your AI twin!');
 *     speak(audioUrl, 'Hello, I am your AI twin!');
 *   };
 * 
 *   return (
 *     <Avatar 
 *       speaking={speaking}
 *       emotion={emotion}
 *       audioConfig={audioConfig}
 *       className="w-96 h-96"
 *     />
 *   );
 * }
 */
