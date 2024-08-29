import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './VoiceTutor.css';

const VoiceTutor = () => {
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('Beginner');
    const [conversation, setConversation] = useState([]);
    const { transcript, resetTranscript } = useSpeechRecognition();
    const [isListening, setIsListening] = useState(false);
    const [conversationEnded, setConversationEnded] = useState(false);
    const [timer, setTimer] = useState(null);

    useEffect(() => {
        if (conversationEnded) {
            stopAllListening();  // Ensure all listening and processing stops
        } else if (transcript && isListening) {
            if (timer) {
                clearTimeout(timer);
            }

            const newTimer = setTimeout(() => {
                if (!transcript.toLowerCase().includes('thank you')) {
                    processInput();
                }
            }, 4000);

            setTimer(newTimer);
        }
    }, [transcript, isListening, conversationEnded]);

    useEffect(() => {
        if (transcript.toLowerCase().includes('thank you') && !conversationEnded) {
            endConversation();
        }
    }, [transcript]);

    const startConversation = async () => {
        if (conversationEnded) return;  // Prevent starting new conversation after it has ended
        try {
            const response = await axios.post('http://localhost:5000/start', { topic: selectedTopic, level: selectedLevel });
            setConversation([...conversation, { role: 'assistant', content: response.data.greeting }]);

            // Stop listening before playing the TTS audio
            stopAllListening();

            playAudio(response.data.audio_file);

            // Resume listening after TTS playback is done
            setTimeout(() => {
                resetTranscript();
                setIsListening(true);
                SpeechRecognition.startListening({ continuous: true });
            }, 100); // A slight delay to ensure UI updates

        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    };

    const processInput = async () => {
        if (conversationEnded) return;  // Prevent processing input after conversation has ended
        try {
            // Stop listening before processing the AI response
            stopAllListening();

            // Update the conversation with user's input
            setConversation((prevConversation) => [
                ...prevConversation, 
                { role: 'user', content: transcript }
            ]);

            // Reset the transcript after processing input
            resetTranscript();

            // Make API request to process user input
            const response = await axios.post('http://localhost:5000/api/process', { input: transcript, topic: selectedTopic, level: selectedLevel });

            // Update the conversation with AI response (before TTS)
            setConversation((prevConversation) => [
                ...prevConversation,
                { role: 'assistant', content: response.data.response }
            ]);

            // Ensure the text is rendered first before TTS
            setTimeout(() => {
                // Play the audio after the assistant's response is shown on screen
                playAudio(response.data.audio_file);

                // Resume listening after TTS playback is done
                setIsListening(true);
                SpeechRecognition.startListening({ continuous: true });
            }, 100); // A slight delay to allow the UI to update
            
        } catch (error) {
            console.error('Error processing input:', error);
        }
    };

    const endConversation = () => {
        setConversation((prevConversation) => [
            ...prevConversation,
            { role: 'assistant', content: 'Conversation ended.' }
        ]);
        setConversationEnded(true);  // Mark conversation as ended
        stopAllListening();
        resetTranscript();  // Clear any pending transcript (including "thank you")
    };

    const stopAllListening = () => {
        setIsListening(false);
        SpeechRecognition.stopListening();
    };

    const handleTopicSelection = (topic) => {
        setSelectedTopic(topic);
    };

    const playAudio = (audioUrl) => {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play().then(() => {
                console.log('Audio playing successfully');
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    };

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <div>Your browser does not support speech recognition.</div>;
    }

    return (
        <div className="voice-tutor-container">
            <h1>Your Personal <span className="blue-head">Voice Tutor</span></h1>
            <p>Enter a topic you want to learn about along with the education level you want to be taught at and generate a personalized tutor tailored to you!</p>
            <p>Say 'thank you' to end the conversation.</p>
            <div className="options">
                <button className="option-button" onClick={() => handleTopicSelection('Spoken English')}>📚 Spoken English</button>
                <button className="option-button" onClick={() => handleTopicSelection('Machine Learning')}>💡 Machine Learning</button>
                <button className="option-button" onClick={() => handleTopicSelection('Personal Finance')}>💰 Personal Finance</button>
                <button className="option-button" onClick={() => handleTopicSelection('U.S History')}>📜 U.S History</button>
            </div>
            <div className="input-container">
                <input type="text" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} placeholder="Teach me about..." />
                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                </select>
                <button onClick={startConversation} className="start-button" disabled={conversationEnded}>🔊 Start</button>
            </div>
            <div className="conversation-container">
                {conversation.map((entry, index) => (
                    <div key={index}>  
                        <strong>{entry.role === 'user' ? '👦User' : '🖥️Assistant'}:</strong> {entry.content}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VoiceTutor;
