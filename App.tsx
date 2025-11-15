
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatView from './components/ChatView';
import PromptInput from './components/PromptInput';
import { Message } from './types';
import { streamChatResponse } from './services/geminiService';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSend = useCallback(async (prompt: string, image?: File) => {
    if (isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: prompt }] };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({ role: msg.role, parts: msg.parts }));
      const stream = streamChatResponse(prompt, history, image);
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      for await (const chunk of stream) {
        modelResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.parts = [{ text: modelResponse }];
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error streaming response:", error);
      const errorMessage: Message = { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  return (
    <div className="flex h-screen w-screen bg-white text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col overflow-y-hidden">
          <ChatView messages={messages} isLoading={isLoading} />
          <PromptInput onSend={handleSend} disabled={isLoading} />
        </main>
      </div>
    </div>
  );
};

export default App;
