/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleIcon, XIcon, SendIcon, Volume2Icon, SearchIcon, BrainCircuitIcon, PaperclipIcon } from './icons';
import { generateChatStream, generateSpeech } from '../services/geminiService';
import { getFriendlyErrorMessage, fileToPart, decode, decodeAudioData } from '../lib/utils';
import { ChatMessage, Part } from '../types';
import Spinner from './Spinner';

interface ChatBotProps {
    contextImageUrl: string | null;
}

const ChatBot: React.FC<ChatBotProps> = ({ contextImageUrl }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useSearch, setUseSearch] = useState(false);
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const messageEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);
    
    useEffect(() => {
        if (isOpen && !audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            } catch (e) {
                console.error("AudioContext is not supported by this browser.", e);
            }
        }
    }, [isOpen]);

    const handleSendMessage = useCallback(async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput && !attachedFile) return;

        setError(null);
        setIsLoading(true);
        const userMessageId = `user-${Date.now()}`;
        
        const userParts: Part[] = [];
        if (trimmedInput) {
            userParts.push({ text: trimmedInput });
        }
        if (attachedFile) {
            try {
                const filePart = await fileToPart(attachedFile);
                userParts.push(filePart);
            } catch (e) {
                setError(getFriendlyErrorMessage(e, "Failed to process attachment"));
                setIsLoading(false);
                return;
            }
        }

        const newUserMessage: ChatMessage = { id: userMessageId, role: 'user', parts: userParts };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setAttachedFile(null);

        const modelMessageId = `model-${Date.now()}`;
        const newModelMessage: ChatMessage = { id: modelMessageId, role: 'model', parts: [{ text: '' }] };
        setMessages(prev => [...prev, newModelMessage]);

        try {
            const history = messages.map(({ role, parts }) => ({ role, parts }));
            const stream = await generateChatStream(history, newUserMessage, { useSearch, useThinkingMode });

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;

                setMessages(prev => prev.map(msg => 
                    msg.id === modelMessageId 
                        ? { 
                            ...msg, 
                            parts: [{ text: (msg.parts[0].text || '') + chunkText }],
                            groundingChunks: groundingChunks ?? msg.groundingChunks
                          } 
                        : msg
                ));
            }

        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to get response'));
            setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId 
                    ? { ...msg, parts: [{ text: 'Sorry, I encountered an error.' }] }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }

    }, [input, messages, useSearch, useThinkingMode, attachedFile]);

    const handlePlayAudio = async (text: string, messageId: string) => {
        if (!audioContextRef.current) {
            setError("Audio playback is not available in your browser.");
            return;
        }
        if (speakingMessageId) return; // Prevent multiple playbacks

        setSpeakingMessageId(messageId);
        try {
            const base64Audio = await generateSpeech(text);
            const decodedAudio = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedAudio, audioContextRef.current, 24000, 1);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            source.onended = () => {
                setSpeakingMessageId(null);
            };

        } catch (err) {
            setError(getFriendlyErrorMessage(err, "Failed to generate audio"));
            setSpeakingMessageId(null);
        }
    };
    
    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError("File size exceeds 10MB. Please choose a smaller file.");
                return;
            }
            setAttachedFile(file);
        }
    };


    const renderMessageContent = (message: ChatMessage) => {
        return (
            <>
                {message.parts.map((part, index) => {
                    if (part.text) {
                        return <p key={index} className="whitespace-pre-wrap">{part.text}</p>;
                    }
                    if (part.inlineData) {
                        const { mimeType, data } = part.inlineData;
                        const src = `data:${mimeType};base64,${data}`;
                        if (mimeType.startsWith('image/')) {
                            return <img key={index} src={src} className="max-w-xs rounded-lg my-2" alt="attached content" />;
                        }
                        if (mimeType.startsWith('video/')) {
                             return <video key={index} src={src} controls className="max-w-xs rounded-lg my-2" />;
                        }
                    }
                    return null;
                })}
                 {message.groundingChunks && (
                    <div className="mt-3 text-xs">
                        <h4 className="font-bold text-gray-600">Sources:</h4>
                        <ol className="list-decimal list-inside space-y-1">
                            {message.groundingChunks.map((chunk: any, index: number) => (
                                chunk.web && (
                                    <li key={index}>
                                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                            {chunk.web.title || chunk.web.uri}
                                        </a>
                                    </li>
                                )
                            ))}
                        </ol>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        className="fixed bottom-24 right-4 sm:right-6 md:right-8 w-[calc(100%-2rem)] sm:w-96 h-[70vh] max-h-[600px] bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col border border-gray-200/80 z-50"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <header className="flex items-center justify-between p-4 border-b border-gray-200/80">
                            <h2 className="text-xl font-serif text-gray-900">AI Assistant</h2>
                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200/70">
                                <XIcon className="w-5 h-5 text-gray-600"/>
                            </button>
                        </header>
                        
                        <div className="flex-grow p-4 overflow-y-auto space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0"/>}
                                    <div className={`p-3 rounded-2xl max-w-xs text-sm ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-br-none' : 'bg-gray-200/70 text-gray-800 rounded-bl-none'}`}>
                                        {renderMessageContent(msg)}
                                        {msg.role === 'model' && msg.parts[0].text && !isLoading && (
                                            <button 
                                                onClick={() => handlePlayAudio(msg.parts[0].text!, msg.id)} 
                                                disabled={!!speakingMessageId}
                                                className="mt-2 text-gray-500 hover:text-gray-800 disabled:opacity-50"
                                            >
                                                <Volume2Icon className={`w-4 h-4 ${speakingMessageId === msg.id ? 'animate-pulse' : ''}`}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && messages[messages.length-1]?.role === 'model' && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0"/>
                                    <div className="p-3 rounded-2xl bg-gray-200/70 flex items-center">
                                        <Spinner />
                                    </div>
                                </div>
                            )}
                            <div ref={messageEndRef} />
                        </div>
                        {error && <p className="text-red-500 text-xs px-4 pb-2">{error}</p>}
                        
                        {attachedFile && (
                             <div className="px-4 pb-2 text-xs text-gray-600 flex items-center justify-between">
                               <span>Attached: {attachedFile.name}</span>
                               <button onClick={() => setAttachedFile(null)}><XIcon className="w-3 h-3"/></button>
                             </div>
                        )}

                        <div className="p-2 border-t border-gray-200/80">
                            <div className="flex items-center gap-2 px-2">
                                <button
                                    onClick={() => setUseSearch(!useSearch)}
                                    title="Ground with Google Search"
                                    className={`p-1.5 rounded-md transition-colors ${useSearch ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <SearchIcon className="w-5 h-5"/>
                                </button>
                                <button
                                    onClick={() => setUseThinkingMode(!useThinkingMode)}
                                    title="Enable Thinking Mode (slower, more capable)"
                                    className={`p-1.5 rounded-md transition-colors ${useThinkingMode ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <BrainCircuitIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 pt-0 border-t border-gray-200/80">
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-gray-800">
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                    placeholder="Ask a question..."
                                    className="w-full p-2 bg-transparent focus:outline-none text-sm"
                                    disabled={isLoading}
                                />
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden"/>
                                <button onClick={handleAttachmentClick} disabled={isLoading} className="p-2 text-gray-500 hover:text-gray-800">
                                    <PaperclipIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={handleSendMessage} disabled={isLoading || (!input.trim() && !attachedFile)} className="p-2 mr-1 rounded-md bg-gray-900 text-white disabled:bg-gray-300">
                                    <SendIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="fixed bottom-6 right-4 sm:right-6 md:right-8 w-14 h-14 bg-gray-900 rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:bg-gray-700 transition-all active:scale-95"
                aria-label={isOpen ? 'Close Chatbot' : 'Open Chatbot'}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                         key={isOpen ? 'close' : 'open'}
                         initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                         animate={{ opacity: 1, rotate: 0, scale: 1 }}
                         exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                         transition={{ duration: 0.2 }}
                    >
                         {isOpen ? <XIcon /> : <MessageCircleIcon />}
                    </motion.div>
                </AnimatePresence>
            </button>
        </>
    );
};

export default ChatBot;
