
import React, { useState, useRef, useCallback } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, PhotoIcon, AdjustmentsHorizontalIcon, XCircleIcon } from './icons';

interface PromptInputProps {
  onSend: (prompt: string, image?: File) => void;
  disabled: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSend, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSendClick = useCallback(() => {
    if ((prompt.trim() || imageFile) && !disabled) {
      onSend(prompt.trim(), imageFile ?? undefined);
      setPrompt('');
      setImageFile(null);
      setImagePreview(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [prompt, imageFile, onSend, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
      setImageFile(null);
      setImagePreview(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className="bg-slate-100 rounded-3xl p-4 shadow-sm">
        {imagePreview && (
          <div className="mb-2 relative w-24 h-24">
            <img src={imagePreview} alt="Image preview" className="rounded-lg object-cover w-full h-full" />
            <button onClick={removeImage} className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-md">
                <XCircleIcon className="w-6 h-6 text-slate-600 hover:text-slate-900"/>
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Enter a prompt here"
          className="w-full bg-transparent focus:outline-none resize-none text-slate-800 placeholder:text-slate-500 text-lg"
          rows={1}
          disabled={disabled}
        />
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 p-2 rounded-lg text-slate-600 hover:bg-slate-200" title="Tools">
              <AdjustmentsHorizontalIcon className="w-6 h-6" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-slate-600 hover:bg-slate-200" title="Upload image">
              <PhotoIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
             <div className="text-sm font-medium text-slate-500 bg-slate-200/80 px-3 py-1 rounded-lg">
                2.5 Flash
             </div>
            <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-200" title="Use microphone">
              <MicrophoneIcon className="w-6 h-6" />
            </button>
            <button
              onClick={handleSendClick}
              disabled={disabled || (!prompt.trim() && !imageFile)}
              className="p-3 rounded-full bg-slate-200 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 enabled:hover:bg-slate-300"
            >
              <PaperAirplaneIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
