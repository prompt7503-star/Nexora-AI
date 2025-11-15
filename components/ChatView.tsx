
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { UserCircleIcon, SparkleIcon } from './icons';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
}

const WelcomeScreen: React.FC = () => (
  <div className="flex-grow flex flex-col justify-center items-center">
    <h1 className="text-5xl md:text-6xl font-medium text-center">
      <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Hello, Manish</span>
    </h1>
    <p className="text-slate-500 mt-4 text-xl">How can I help you today?</p>
  </div>
);

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUserModel = message.role === 'model';
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUserModel ? 'bg-slate-700' : 'bg-green-500'}`}>
                {isUserModel ? <SparkleIcon className="w-5 h-5 text-white" /> : <UserCircleIcon className="w-8 h-8 text-white p-0.5" />}
            </div>
            <div className="flex-1">
                <p className="font-bold text-slate-800">{isUserModel ? 'Gemini' : 'You'}</p>
                <div className="prose prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.parts.map(p => p.text).join('')}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    </div>
  );
};

const LoadingIndicator: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
              <SparkleIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
              <p className="font-bold text-slate-800">Gemini</p>
              <div className="flex items-center space-x-2 mt-2">
                  <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></div>
              </div>
          </div>
      </div>
  </div>
);


const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div ref={scrollRef} className="flex-grow overflow-y-auto">
      {messages.map((msg, index) => (
        <ChatMessage key={index} message={msg} />
      ))}
      {isLoading && <LoadingIndicator />}
    </div>
  );
};

export default ChatView;
