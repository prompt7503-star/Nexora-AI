




import React, { useState, useRef, useEffect, FormEvent } from "react";
import ReactDOM from "react-dom/client";
// FIX: Import GenerateContentResponse for proper type hinting of API call results.
import { GoogleGenAI, Chat, Modality, Type, GenerateContentResponse } from "@google/genai";
import { marked } from "marked";

// Define the Blob type for audio, as it is not exported directly by the SDK.
interface Blob {
  data: string;
  mimeType: string;
}

// Define the structure for a grounding source
interface GroundingSource {
  web?: {
    // FIX: Make uri and title optional to match the GroundingChunk type from the SDK.
    uri?: string;
    title?: string;
  };
}

// Define the structure for a single message part
interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  videoData?: {
    uri: string;
    mimeType: string;
  };
}

// Define the structure for a chat message
interface ChatMessage {
  role: 'user' | 'model';
  parts: MessagePart[];
  sources?: GroundingSource[];
  type?: 'tool-intro';
}

type ModelType = 'gemini-2.5-flash' | 'gemini-2.5-pro';

// Define the structure for a chat session
interface ChatSession {
  title: string;
  messages: ChatMessage[];
  chatInstance: Chat;
  model: ModelType;
}

type ActiveView = 'chat' | 'pixshop' | 'ai-headshot' | 'logo-design' | 'explore' | 'live-chat' | 'visigen-ai' | 'reality-portal' | 'ai-calm-room';

// --- SVG Icons ---
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.26 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/><path d="M0 0h24v24H0z" fill="none"/></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>;
const CancelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l-.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>;
const UpgradeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L14.46 9.54L21 12L14.46 14.46L12 21L9.54 14.46L3 12L9.54 9.54L12 3Z" stroke="#0B57D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const DropdownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px"><path d="M7 10l5 5 5-5H7z"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>;
const ToolsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>;
const CanvasIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14h-3v3h-2v-3H8v-2h3v-3h2v3h3v2zm-3-7V3.5L18.5 9H13z"/></svg>;
const GuidedLearningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM15 16H5V8h10v8z"/></svg>;
const PersonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const LogoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>;
const ExploreIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L14.46 9.54L21 12L14.46 14.46L12 21L9.54 14.46L3 12L9.54 9.54L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const LiveIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C11.4477 2 11 2.44772 11 3V11C11 11.5523 11.4477 12 12 12C12.5523 12 13 11.5523 13 11V3C13 2.44772 12.5523 2 12 2Z" fill="currentColor"/><path d="M8 7C7.44772 7 7 7.44772 7 8V16C7 16.5523 7.44772 17 8 17C8.55228 17 9 16.5523 9 16V8C9 7.44772 8.55228 7 8 7Z" fill="currentColor"/><path d="M4 11C3.44772 11 3 11.4477 3 12V12C3 12.5523 3.44772 13 4 13V13H4.01C4.56228 13 5.01 12.5523 5.01 12V12C5.01 11.4477 4.56228 11 4.01 11H4Z" fill="currentColor"/><path d="M16 7C15.4477 7 15 7.44772 15 8V16C15 16.5523 15.4477 17 16 17C16.5523 17 17 16.5523 17 16V8C17 7.44772 16.5523 7 16 7Z" fill="currentColor"/><path d="M20 11C19.4477 11 19 11.4477 19 12V12C19 12.5523 19.4477 13 20 13V13H20.01C20.5623 13 21.01 12.5523 21.01 12V12C21.01 11.4477 20.5623 11 20.01 11H20Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M1 18C1 17.4477 1.44772 17 2 17H22C22.5523 17 23 17.4477 23 18V19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V18Z" fill="currentColor"/></svg>;
const StopLiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM9 9h6v6H9z"/></svg>;
const LoadingSpinnerIcon = () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20px" height="20px"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const VisiGenAIIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2zM18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zM12.35 16.35l-2.79-3.72c-.1-.13-.27-.2-.44-.19-.17.01-.32.11-.39.26L7 18h10l-2.43-3.24c-.1-.13-.27-.2-.44-.19-.17.01-.32.11-.39.26l-1.39 1.86zM12 11l1.5-2L15 11l-1.5 2L12 11zm3.5-3.5l1 1.5-1 1.5-1.5-1-1.5 1-1-1.5 1-1.5 1.5 1 1.5-1z"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>;
const RealityPortalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M21,12.5C21,17.19 17.19,21 12.5,21H12v-2h.5c2.76,0 5-2.24 5-5s-2.24-5-5-5H12V7h.5C17.19,7 21,10.81 21,12.5zM12,19H5.99C4.34,19 3,17.66 3,16s1.34-3 3.01-3H12v-2H5.99C3.23,11 1,13.23 1,16s2.23,5 4.99,5H12V19z"/></svg>;
const AICalmRoomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-2-8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>;


// --- Message Action Icons ---
const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>;
const ThumbsDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79-.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>;
const MoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const CheckmarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>;
const ListenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 9v6h4l5 5V4L7 9H3zm7 .17v5.66L8.17 13H5v-2h3.17L10 9.17zM14.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14.5 6.47v1.54c1.13.56 2 1.71 2 3s-.87 2.44-2 3v1.54c1.81-.65 3-2.48 3-4.54s-1.19-3.89-3-4.54z"/></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 6h12v12H6V6z"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>;


// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- VisiGen AI View Component ---
const VisiGenView: React.FC = () => {
    type AspectRatio = "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
    const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
    
    // Generate State
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

    // Edit State
    const [editPrompt, setEditPrompt] = useState('');
    const [sourceImage, setSourceImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Common State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    const aspectRatios: { label: string; value: AspectRatio }[] = [
        { label: 'Square', value: '1:1' },
        { label: 'Portrait', value: '9:16' },
        { label: 'Widescreen', value: '16:9' },
        { label: 'Standard', value: '4:3' },
        { label: 'Photo', value: '3:4' },
    ];
    
    const quickActions = ['Remove BG', 'Fix Lighting', 'Beautify', 'Retro Filter'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setSourceImage({
                    preview: URL.createObjectURL(file),
                    data: result.split(',')[1],
                    mimeType: file.type,
                });
                setResultImage(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!generatePrompt.trim()) {
            setError("Please enter a prompt to generate an image.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: generatePrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio,
                },
            });

            const base64ImageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
            if (base64ImageBytes) {
                setResultImage(`data:image/png;base64,${base64ImageBytes}`);
            } else {
                throw new Error("Image generation failed. The model did not return an image.");
            }
        } catch (err) {
            console.error("VisiGen Generate Error:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during image generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!sourceImage) {
            setError("Please upload an image to edit.");
            return;
        }
        if (!editPrompt.trim()) {
            setError("Please enter a prompt to describe your edit.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImage(null);

        const parts = [
            { inlineData: { data: sourceImage.data, mimeType: sourceImage.mimeType } },
            { text: editPrompt }
        ];

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const mimeType = imagePart.inlineData.mimeType;
                setResultImage(`data:${mimeType};base64,${base64ImageBytes}`);
            } else {
                throw new Error("Image editing failed. The model did not return an image.");
            }
        } catch (err) {
            console.error("VisiGen Edit Error:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during image editing.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `visigen-ai-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderResult = () => {
        if (isLoading) {
            return (
                <div className="visigen-result-loader">
                    <h3>Generating...</h3>
                    <p>Your creative vision is materializing.</p>
                    <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                </div>
            );
        }
        if (resultImage) {
            return (
                <div className="visigen-result-image-wrapper">
                    <img src={resultImage} alt="Generated result" className="visigen-result-image" />
                    <button className="visigen-download-btn" onClick={handleDownload} title="Download Image">
                        <DownloadIcon />
                    </button>
                </div>
            );
        }
        return (
             <div className="visigen-result-placeholder">
                <VisiGenAIIcon />
                <p>Your creative vision will appear here.</p>
            </div>
        );
    };

    return (
        <div className="visigen-ai-view-wrapper">
            <div className="visigen-ai-view">
                <div className="visigen-main-panel">
                    <div className="visigen-tabs">
                        <button 
                            className={`visigen-tab generate ${activeTab === 'generate' ? 'active' : ''}`}
                            onClick={() => setActiveTab('generate')}
                        >
                            Generate
                        </button>
                        <button 
                            className={`visigen-tab edit ${activeTab === 'edit' ? 'active' : ''}`}
                            onClick={() => setActiveTab('edit')}
                        >
                            Edit
                        </button>
                    </div>

                    {activeTab === 'generate' ? (
                        <div className="visigen-panel">
                            <h2>Create with AI</h2>
                            <div className="visigen-form-group">
                                <textarea
                                    className="visigen-textarea"
                                    placeholder="e.g., A neon-hologram of a cat on a retro-futuristic synthwave grid..."
                                    value={generatePrompt}
                                    onChange={(e) => setGeneratePrompt(e.target.value)}
                                />
                            </div>
                            <div className="visigen-form-group">
                                <label>Aspect Ratio:</label>
                                <div className="visigen-aspect-ratios">
                                    {aspectRatios.map(ar => (
                                        <button 
                                            key={ar.value} 
                                            className={`visigen-aspect-btn ${aspectRatio === ar.value ? 'active' : ''}`}
                                            onClick={() => setAspectRatio(ar.value)}
                                        >
                                            {ar.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button className="visigen-main-btn generate" onClick={handleGenerate} disabled={isLoading}>
                                Generate
                            </button>
                        </div>
                    ) : (
                        <div className="visigen-panel">
                            <h2>Edit with AI</h2>
                            <input type="file" ref={editFileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                            <div className="visigen-upload-area" onClick={() => editFileInputRef.current?.click()}>
                                {sourceImage ? (
                                    <img src={sourceImage.preview} alt="Uploaded for editing" className="visigen-image-preview" />
                                ) : (
                                    <>
                                        <UploadIcon />
                                        <p>Click to upload an image</p>
                                    </>
                                )}
                            </div>
                             <div className="visigen-form-group">
                                <label>Quick Actions:</label>
                                 <div className="visigen-quick-actions">
                                     {quickActions.map(action => (
                                         <button key={action} className="visigen-quick-action-btn" onClick={() => setEditPrompt(action)}>
                                             {action}
                                         </button>
                                     ))}
                                 </div>
                            </div>
                            <div className="visigen-form-group">
                                <textarea
                                    className="visigen-textarea"
                                    placeholder="e.g., Change the background to a cyberpunk city..."
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                />
                            </div>
                            <button className={`visigen-main-btn edit ${sourceImage ? 'active' : ''}`} onClick={handleEdit} disabled={isLoading || !sourceImage}>
                                Apply Edit
                            </button>
                        </div>
                    )}
                    {error && <div className="visigen-error">{error}</div>}
                </div>
                <div className="visigen-result-panel">
                     <div className="visigen-result-header">
                        <h3>Result</h3>
                        {resultImage && !isLoading && (
                             <button className="visigen-clear-btn" onClick={() => setResultImage(null)}>Clear</button>
                        )}
                    </div>
                    <div className="visigen-result-content">
                        {renderResult()}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PixShop View Component ---
const PixShopView: React.FC = () => {
    const [currentImage, setCurrentImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
    const [history, setHistory] = useState<{ data: string; mimeType: string; preview: string; action: string }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [activeFilterCategory, setActiveFilterCategory] = useState<string>('AI Scene Effects');

    // Viewport State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [isLayersVisible, setIsLayersVisible] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const visibleCanvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const menuContainerRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const redrawCanvas = React.useCallback(() => {
        if (!visibleCanvasRef.current || !offscreenCanvasRef.current?.width) return;
        const visibleCtx = visibleCanvasRef.current.getContext('2d');
        if (!visibleCtx) return;

        visibleCtx.save();
        visibleCtx.fillStyle = theme === 'dark' ? '#2d2d2d' : '#f0f0f0';
        visibleCtx.fillRect(0, 0, visibleCtx.canvas.width, visibleCtx.canvas.height);
        visibleCtx.translate(pan.x, pan.y);
        visibleCtx.scale(zoom, zoom);
        visibleCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        visibleCtx.restore();
    }, [pan, zoom, theme]);

    const handleFitToScreen = () => {
        if (!mainContentRef.current || !offscreenCanvasRef.current?.width) return;
        const { clientWidth: containerWidth, clientHeight: containerHeight } = mainContentRef.current;
        const { width: imgWidth, height: imgHeight } = offscreenCanvasRef.current;
        const padding = 32;

        const scaleX = (containerWidth - padding) / imgWidth;
        const scaleY = (containerHeight - padding) / imgHeight;
        const newZoom = Math.min(scaleX, scaleY, 2); // Cap max zoom on fit to 2x

        setZoom(newZoom);

        const newPanX = (containerWidth - imgWidth * newZoom) / 2;
        const newPanY = (containerHeight - imgHeight * newZoom) / 2;
        setPan({ x: newPanX, y: newPanY });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuContainerRef]);
    
    useEffect(() => {
        if (currentImage) {
            const img = new Image();
            img.onload = () => {
                if (!offscreenCanvasRef.current) {
                    offscreenCanvasRef.current = document.createElement('canvas');
                }
                const offscreenCanvas = offscreenCanvasRef.current;
                offscreenCanvas.width = img.width;
                offscreenCanvas.height = img.height;
                const offscreenCtx = offscreenCanvas.getContext('2d');
                offscreenCtx?.drawImage(img, 0, 0);
                handleFitToScreen();
            };
            img.src = currentImage.preview;
        }
    }, [currentImage]);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                if (visibleCanvasRef.current && mainContentRef.current) {
                    visibleCanvasRef.current.width = mainContentRef.current.clientWidth;
                    visibleCanvasRef.current.height = mainContentRef.current.clientHeight;
                    redrawCanvas();
                }
            });
        });

        if (mainContentRef.current) {
            resizeObserver.observe(mainContentRef.current);
        }
        
        return () => resizeObserver.disconnect();
    }, [redrawCanvas]);

    useEffect(() => {
        redrawCanvas();
    }, [zoom, pan, theme, isLayersVisible, redrawCanvas]); // Redraw on theme change for bg color

    const pushToHistory = (image: { data: string; mimeType: string; preview: string }, action: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const readableAction = action.length > 25 ? action.substring(0, 22) + '...' : action;
        newHistory.push({ ...image, action: readableAction });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const newImage = {
                    preview: URL.createObjectURL(file),
                    data: result.split(',')[1],
                    mimeType: file.type,
                };
                setCurrentImage(newImage);
                const initialHistory = [{ ...newImage, action: 'Open' }];
                setHistory(initialHistory);
                setHistoryIndex(0);
                setError(null);
                setPrompt('');
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };
    
    const handleNewProject = () => {
        if(window.confirm('Are you sure you want to start a new project? All unsaved changes will be lost.')) {
            setCurrentImage(null);
            setHistory([]);
            setHistoryIndex(-1);
            setError(null);
            setPrompt('');
            if (offscreenCanvasRef.current) {
                const ctx = offscreenCanvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
            }
            redrawCanvas();
        }
    };

    const handleDownload = () => {
        if (!offscreenCanvasRef.current) return;
        const link = document.createElement('a');
        link.href = offscreenCanvasRef.current.toDataURL(currentImage?.mimeType || 'image/png');
        link.download = `pixshop-edit-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadClick = () => { fileInputRef.current?.click(); setActiveMenu(null); };
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCurrentImage(history[newIndex]);
        }
    };
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setCurrentImage(history[newIndex]);
        }
    };
    
    const updateImageFromCanvas = (action: string) => {
        if (!offscreenCanvasRef.current || !currentImage) return;
        const canvas = offscreenCanvasRef.current;
        const dataUrl = canvas.toDataURL(currentImage.mimeType);
        const newImage = {
            data: dataUrl.split(',')[1],
            mimeType: currentImage.mimeType,
            preview: dataUrl,
        };
        setCurrentImage(newImage);
        pushToHistory(newImage, action);
        setActiveMenu(null);
    };
    
    const handleRotate = (degrees: 90 | 180 | -90) => {
        if (!offscreenCanvasRef.current || !currentImage) return;
        setActiveMenu(null);
        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext('2d')!;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

        if (degrees === 90 || degrees === -90) {
            canvas.width = tempCanvas.height;
            canvas.height = tempCanvas.width;
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(degrees * Math.PI / 180);
        ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
        ctx.restore();

        updateImageFromCanvas(`Rotate ${degrees > 0 ? degrees : 360 + degrees}°`);
    };

    const handleFlip = (direction: 'horizontal' | 'vertical') => {
        if (!offscreenCanvasRef.current || !currentImage) return;
        setActiveMenu(null);
        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext('2d')!;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')!.drawImage(canvas, 0, 0);

        ctx.save();
        if (direction === 'horizontal') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
        }
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();

        updateImageFromCanvas(`Flip ${direction}`);
    };

    const handleAiEdit = async (editPrompt: string) => {
        if (!currentImage || !editPrompt.trim()) {
            setError("Please upload an image and provide an edit instruction.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setPrompt('');

        const parts = [{ inlineData: { data: currentImage.data, mimeType: currentImage.mimeType } }, { text: editPrompt }];

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const newImageBlob = new Blob([decode(imagePart.inlineData.data)], { type: imagePart.inlineData.mimeType });
                const newImage = {
                    data: imagePart.inlineData.data,
                    mimeType: imagePart.inlineData.mimeType,
                    preview: URL.createObjectURL(newImageBlob),
                };
                setCurrentImage(newImage);
                pushToHistory(newImage, editPrompt);
            } else {
                let detailedError = "The AI did not return an image.";
                 const blockReason = response.promptFeedback?.blockReason;
                 const finishReason = response.candidates?.[0]?.finishReason;
                 if (blockReason) { detailedError = `Request blocked due to '${blockReason}'.`; }
                 else if (finishReason && finishReason !== 'STOP') { detailedError = `Generation failed. Reason: ${finishReason}. Please adjust your prompt.`; }
                throw new Error(detailedError);
            }
        } catch (err) {
            console.error("PixShop AI Edit Error:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToolClick = (toolPrompt: string) => {
        setPrompt(toolPrompt);
        if (!toolPrompt.includes('[') && !toolPrompt.includes(']')) {
             handleAiEdit(toolPrompt);
        }
    };
    
    const handlePromptSubmit = (e: FormEvent) => {
        e.preventDefault();
        handleAiEdit(prompt);
    };

    const handleShowImageInfo = () => {
        if (!offscreenCanvasRef.current || !currentImage) return;
        const canvas = offscreenCanvasRef.current;
        alert(
`Image Information:
- Dimensions: ${canvas.width} x ${canvas.height} px
- MIME Type: ${currentImage.mimeType}`
        );
        setActiveMenu(null);
    };

    const handleResetToOriginal = () => {
        if (history.length > 0) {
            const originalImage = history[0];
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push({ ...originalImage, action: 'Reset to Original' });
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            setCurrentImage(originalImage);
        }
        setActiveMenu(null);
    };
    
    // Viewport Handlers
    const handleZoom = (direction: 'in' | 'out') => {
        setZoom(prevZoom => {
            const newZoom = direction === 'in' ? prevZoom * 1.2 : prevZoom / 1.2;
            return Math.max(0.1, Math.min(newZoom, 10)); // Clamp zoom level
        });
        setActiveMenu(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!currentImage) return;
        e.preventDefault();
        setZoom(prevZoom => {
            const newZoom = prevZoom - e.deltaY * 0.001;
            return Math.max(0.1, Math.min(newZoom, 10));
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!currentImage) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning || !currentImage) return;
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    };

    const handleMouseUp = () => setIsPanning(false);

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            editorContainerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
        setActiveMenu(null);
    };


    const tools = [
        { name: 'Remove BG', description: 'Remove the background', icon: <svg viewBox="0 0 24 24"><path d="M7.41,8.59L6,10L10.5,14.5L12,13.09L7.41,8.59M12,18.5A6.5,6.5 0 0,0 18.5,12A6.5,6.5 0 0,0 12,5.5A6.5,6.5 0 0,0 5.5,12A6.5,6.5 0 0,0 12,18.5M20.3,14.9L22,13.2C22,13.2 21.6,12.8 20.3,14.9M3.7,5.1C3.7,5.1 4.4,5.8 3.7,5.1M13.2,22L14.9,20.3C14.9,20.3 12.8,21.6 13.2,22M5.1,3.7C5.1,3.7 5.8,4.4 5.1,3.7Z" /></svg>, prompt: 'Remove the background and make it transparent' },
        { name: 'Enhance', description: 'Auto-adjust lighting and color', icon: <svg viewBox="0 0 24 24"><path d="M12 3L14.46 9.54L21 12L14.46 14.46L12 21L9.54 14.46L3 12L9.54 9.54L12 3Z" /></svg>, prompt: 'Enhance the image: improve lighting, colors, and sharpness' },
        { name: 'Remove Object', description: 'Remove an object seamlessly', icon: <svg viewBox="0 0 24 24"><path d="M19.3,5.3L17,3H7L4.7,5.3L3,7V17L5.3,19.3L7,21H17L19.3,18.7L21,17V7L19.3,5.3M16.5,18L12,13.5L7.5,18L6,16.5L10.5,12L6,7.5L7.5,6L12,10.5L16.5,6L18,7.5L13.5,12L18,16.5L16.5,18Z" /></svg>, prompt: 'Remove the [object] from the image' },
        { name: 'Recolor', description: 'Change the color of an object', icon: <svg viewBox="0 0 24 24"><path d="M19.2,2.8C18.6,2.3 17.7,2.3 17.1,2.8L16,4L13.8,1.8L12.4,3.2L14.6,5.4L13.5,6.5L2.8,17.2C2.3,17.8 2.3,18.7 2.8,19.3L4.7,21.2C5.3,21.7 6.2,21.7 6.8,21.2L17.5,10.5L18.6,11.6L20.8,9.4L22.2,10.8L20,13L21.2,14.1C21.7,14.7 21.7,15.6 21.2,16.2L19.3,18.1C18.7,18.7 17.8,18.7 17.2,18.1L15.1,16L16.2,14.9L12.7,11.4L11.3,12.8L13.5,15L11.4,17.1L10,15.7L7.8,17.9L9.2,19.3L10.6,17.9L13.8,21.1L12.4,22.5L14.5,24.6L15.6,23.5L22.6,16.5C23.1,15.9 23.1,15 22.6,14.4L20.7,12.5C20.1,11.9 19.2,11.9 18.6,12.5L17.5,13.6L14.1,10.1L15.5,8.7L17.7,10.9L19.1,9.5L17,7.4L18.1,6.3L22.6,10.8C23.1,10.2 23.1,9.3 22.6,8.7L19.2,5.3C19.2,5.3 19.3,5.2 19.3,5.2C19.8,4.6 19.8,3.7 19.2,3.1L19.2,2.8Z" /></svg>, prompt: 'Change the color of the [object] to [color]' },
        { name: 'Add Text', description: 'Add text to the image', icon: <svg viewBox="0 0 24 24"><path d="M21,6V8H3V6H21M7,10H17V12H7V10M7,14H17V16H7V14Z" /></svg>, prompt: `Add the text "[your text]" to the image` },
        { name: 'Beautify', description: 'Retouch and beautify face', icon: <svg viewBox="0 0 24 24"><path d="M3.27,6.22C6.44,4.73 10.9,6.06 13.3,9.05C15.85,12.24 16.3,17.22 13.84,20.7C13.5,21.24 12.88,21.43 12.34,21.1C11.8,20.75 11.62,20.13 11.95,19.59C13.86,16.89 13.5,12.91 11.5,10.33C9.4,7.65 5.86,6.67 3.03,8.04C2.5,8.28 1.88,8.06 1.63,7.54C1.38,7 1.6,6.38 2.12,6.15L3.27,6.22M9.54,2.5C10.1,2.5 10.55,2.95 10.54,3.5C10.54,4.05 10.09,4.5 9.54,4.5C8.97,4.5 8.53,4.05 8.54,3.5C8.53,2.95 8.98,2.5 9.54,2.5M4.54,7.5C5.1,7.5 5.55,7.95 5.54,8.5C5.54,9.05 5.09,9.5 4.54,9.5C3.97,9.5 3.53,9.05 3.54,8.5C3.53,7.95 3.98,7.5 4.54,7.5Z" /></svg>, prompt: 'Beautify the person in the image' },
        { name: 'Reality Expansion', description: 'Expand the canvas with AI', icon: <svg viewBox="0 0 24 24"><path d="M3,3H5V5H3V3M7,3H9V5H7V3M11,3H13V5H11V3M15,3H17V5H15V3M19,3H21V5H19V3M3,7H5V9H3V7M19,7H21V9H19V7M3,11H5V13H3V11M19,11H21V13H19V11M3,15H5V17H3V15M19,15H21V17H19V15M3,19H5V21H3V19M7,19H9V21H7V19M11,19H13V21H11V19M15,19H17V21H15V19M19,19H21V21H19V19Z" /></svg>, prompt: 'Generatively expand the image beyond its original borders, intelligently filling in the new space.' },
        { name: 'Retro Filter', description: 'Apply a vintage/retro filter', icon: <svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20V4Z" /></svg>, prompt: 'Apply a grainy, retro, 1980s film filter' },
    ];
    
    const menuOrder = ['File', 'Edit', 'Image', 'Layer', 'Select', 'Adjustment', 'Filter', 'View', 'Help'];
    const menus: { [key: string]: { name: string; action: () => void; disabled?: boolean }[] } = {
        File: [
            { name: 'New Project', action: handleNewProject },
            { name: 'Open Image...', action: handleUploadClick },
            { name: 'Export as PNG', action: handleDownload, disabled: !currentImage },
        ],
        Edit: [
            { name: 'Undo', action: handleUndo, disabled: historyIndex <= 0 },
            { name: 'Redo', action: handleRedo, disabled: historyIndex >= history.length - 1 },
        ],
        Image: [
            { name: 'Resize...', action: () => {}, disabled: true },
            { name: 'Crop...', action: () => {}, disabled: true },
            { name: 'Canvas Size...', action: () => {}, disabled: true },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Rotate 90° Clockwise', action: () => handleRotate(90), disabled: !currentImage },
            { name: 'Rotate 180°', action: () => handleRotate(180), disabled: !currentImage },
            { name: 'Rotate 90° Counter-Clockwise', action: () => handleRotate(-90), disabled: !currentImage },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Flip Horizontal', action: () => handleFlip('horizontal'), disabled: !currentImage },
            { name: 'Flip Vertical', action: () => handleFlip('vertical'), disabled: !currentImage },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Image Info', action: handleShowImageInfo, disabled: !currentImage },
            { name: '--- AI Tools ---', action: () => {}, disabled: true },
            { name: 'Auto Enhance', action: () => handleAiEdit('Auto Enhance: improve lighting, colors, and sharpness.'), disabled: !currentImage || isLoading },
            { name: 'Replace Background', action: () => handleAiEdit('Detect the main subject and replace the background with a professional-looking, blurred office setting.'), disabled: !currentImage || isLoading },
            { name: 'AI Upscale (2x)', action: () => handleAiEdit('Upscale this image to twice its original resolution, enhancing details clearly.'), disabled: !currentImage || isLoading },
            { name: 'AI Upscale (4x)', action: () => handleAiEdit('Upscale this image to four times its original resolution, enhancing details clearly.'), disabled: !currentImage || isLoading },
        ],
        Layer: [
            { name: 'New Layer (Blank / Image / Text)', action: () => {}, disabled: true },
            { name: 'Duplicate Layer', action: () => {}, disabled: true },
            { name: 'Merge Layers', action: () => {}, disabled: true },
            { name: 'Delete Layer', action: () => {}, disabled: true },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Layer Lock / Unlock', action: () => {}, disabled: true },
            { name: 'Layer Opacity Control', action: () => {}, disabled: true },
            { name: 'Layer Effects (Shadow, Glow, Outline)', action: () => {}, disabled: true },
            { name: 'Adjustment Layer (Brightness, Hue, Curves)', action: () => {}, disabled: true },
            { name: '--- AI Tools ---', action: () => {}, disabled: true },
            { name: 'AI Smart Layer (Detect subject and auto-separate)', action: () => handleAiEdit('Detect the main subject and place it on a transparent layer, removing the background.'), disabled: !currentImage || isLoading },
        ],
        Select: [
            { name: 'Rectangle Select', action: () => {}, disabled: true },
            { name: 'Lasso Select', action: () => {}, disabled: true },
            { name: 'Magic Wand (AI Smart Select)', action: () => handleAiEdit('Create a version of this image where the main subject is sharply in focus and the background is heavily blurred, as if selected with a magic wand.'), disabled: !currentImage || isLoading },
            { name: 'Invert Selection', action: () => {}, disabled: true },
            { name: 'Select All / Deselect', action: () => {}, disabled: true },
            { name: 'Feather (Soft edge)', action: () => {}, disabled: true },
            { name: 'Expand / Contract Selection', action: () => {}, disabled: true },
            { name: '--- AI Tools ---', action: () => {}, disabled: true },
            { name: 'AI Object Select (Auto-detect person/object)', action: () => handleAiEdit('Select the main object in the photo by highlighting it with a glowing outline.'), disabled: !currentImage || isLoading },
            { name: 'Mask Selection (Hide background)', action: () => handleAiEdit('Create a mask for the main subject, making the background transparent.'), disabled: !currentImage || isLoading },
        ],
        Adjustment: [
            { name: 'Brightness / Contrast', action: () => {}, disabled: true },
            { name: 'Saturation / Vibrance', action: () => {}, disabled: true },
            { name: 'Shadows / Highlights', action: () => {}, disabled: true },
            { name: 'Hue / Temperature', action: () => {}, disabled: true },
            { name: 'Exposure / Gamma', action: () => {}, disabled: true },
            { name: 'Color Balance', action: () => {}, disabled: true },
            { name: 'Curves / Levels', action: () => {}, disabled: true },
            { name: '---', action: () => {}, disabled: true },
            { name: 'AI Auto Tone (Smart color correction)', action: () => handleAiEdit('Perform an AI auto-tone adjustment to balance colors and exposure perfectly.'), disabled: !currentImage || isLoading },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Reset to Original', action: handleResetToOriginal, disabled: historyIndex <= 0 },
        ],
        Filter: [
            { name: 'Custom Filter Intensity Slider', action: () => {}, disabled: true },
            { name: '--- Manual Filters ---', action: () => {}, disabled: true },
            { name: 'Blur (Gaussian, Motion, Radial)', action: () => {}, disabled: true },
            { name: 'Sharpen', action: () => {}, disabled: true },
            { name: 'Noise (Add / Reduce)', action: () => {}, disabled: true },
            { name: '--- AI Artistic Filters ---', action: () => {}, disabled: true },
            { name: 'AI Oil Painting', action: () => handleAiEdit('Apply a realistic oil painting filter to the image.'), disabled: !currentImage || isLoading },
            { name: 'AI Watercolor', action: () => handleAiEdit('Apply a realistic watercolor painting filter to the image.'), disabled: !currentImage || isLoading },
            { name: 'AI Sketch', action: () => handleAiEdit('Apply a realistic pencil sketch filter to the image.'), disabled: !currentImage || isLoading },
            { name: 'AI Cartoon / 3D Render', action: () => handleAiEdit('Turn this photo into a cartoon.'), disabled: !currentImage || isLoading },
            { name: '--- AI Effect Filters ---', action: () => {}, disabled: true },
            { name: 'Glitch / Neon / Pixelate', action: () => handleAiEdit('Apply a digital glitch effect to the image.'), disabled: !currentImage || isLoading },
            { name: 'HDR / Vignette / Lens Flare', action: () => handleAiEdit('Apply a dramatic HDR (High Dynamic Range) effect to the image.'), disabled: !currentImage || isLoading },
            { name: '--- Advanced AI ---', action: () => {}, disabled: true },
            { name: 'AI Style Transfer (Apply artistic styles)', action: () => handleAiEdit("Transfer the artistic style of Van Gogh's \"Starry Night\" to this image."), disabled: !currentImage || isLoading },
        ],
        View: [
            { name: 'Zoom In', action: () => handleZoom('in'), disabled: !currentImage },
            { name: 'Zoom Out', action: () => handleZoom('out'), disabled: !currentImage },
            { name: 'Fit to Screen', action: () => { handleFitToScreen(); setActiveMenu(null); }, disabled: !currentImage },
            { name: 'Fullscreen Mode', action: handleToggleFullscreen, disabled: !currentImage },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Grid Lines Toggle', action: () => {}, disabled: true },
            { name: 'Ruler / Guides', action: () => {}, disabled: true },
            { name: '---', action: () => {}, disabled: true },
            { name: 'Show/Hide Layers Panel', action: () => { setIsLayersVisible(v => !v); setActiveMenu(null); } },
            { name: 'Split View (Before / After)', action: () => {}, disabled: true },
            { name: 'Dark / Light Mode', action: () => { setTheme(t => t === 'dark' ? 'light' : 'dark'); setActiveMenu(null); } },
            { name: 'Preview Render Mode', action: () => {}, disabled: true },
        ],
        Help: [{ name: 'About PixShop AI', action: () => alert('This editor uses the Gemini API for all image manipulations.') }]
    };
    
    const filterCategories = [
        {
            name: 'AI Scene Effects',
            items: [
                { name: 'TimeShift: Day \u2192 Night', prompt: 'Transform this daytime photo into a realistic nighttime scene, complete with moonlight and artificial lights where appropriate.' },
                { name: 'TimeShift: Add Winter', prompt: 'Transform this photo into a winter scene, adding a realistic layer of snow on surfaces and a cold, wintery atmosphere.' },
                { name: 'Mirror World', prompt: 'Create a surreal "mirror world" version of this image. It should not be a simple flip, but an alternate reality where elements are creatively inverted or mirrored.' },
                { name: 'Imagination: Futuristic', prompt: 'Reimagine this photo as if it were taken in a futuristic, cyberpunk city in the year 2077.' },
            ]
        },
        {
            name: 'AI Portrait Studio',
            items: [
                { name: 'Expression: Make Smile', prompt: 'Subtly and realistically alter the facial expression of the main person in this photo to a gentle, happy smile.' },
                { name: 'Avatar: Anime', prompt: 'Transform the person in this photo into a high-quality anime character, capturing their key features.' },
                { name: 'Avatar: 3D Cartoon', prompt: 'Convert the person in this photo into a 3D cartoon character, similar to modern animated movies.' },
                { name: 'Avatar: Cyberpunk', prompt: 'Morph the person in this photo into a cyberpunk-style avatar, adding futuristic cybernetic enhancements and a neon-lit aesthetic.' },
            ]
        },
        {
            name: 'AI MoodSense',
            items: [
                { name: 'Happy & Bright', prompt: 'Apply a filter that enhances the mood of the photo to be happy and bright, with vibrant colors and warm light.' },
                { name: 'Sad & Cool', prompt: 'Apply a filter that enhances the mood of the photo to be sad and contemplative, using cool blue tones and soft focus.' },
                { name: 'Romantic Glow', prompt: 'Apply a filter that gives the photo a romantic and dreamy mood, with a soft glow, warm pinkish tones, and slightly lowered contrast.' },
                { name: 'Dark & Moody', prompt: 'Apply a filter that makes the photo feel dark and moody, with deep shadows, high contrast, and desaturated colors.' },
            ]
        }
    ];

    return (
        <div className={`pixshop-editor theme-${theme}`} ref={editorContainerRef}>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
            <header className="pixshop-header">
                <div className="pixshop-logo">Ps</div>
                <nav className="pixshop-menu" ref={menuContainerRef}>
                    {menuOrder.map(menuName => (
                        <div className="pixshop-menu-item" key={menuName}>
                            <button onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}>{menuName}</button>
                            {activeMenu === menuName && menus[menuName] && (
                                <div className="pixshop-dropdown-menu">
                                    {menus[menuName].map((item, index) => {
                                        if (item.name.startsWith('---') && item.name.length > 3) {
                                            return <div key={item.name + index} className="pixshop-menu-divider">{item.name.replace(/-/g, '').trim()}</div>;
                                        }
                                        if (item.name === '---') {
                                            return <div key={item.name + index} className="pixshop-menu-separator" />;
                                        }
                                        return <button key={item.name} onClick={() => { if (!item.disabled) { item.action(); } }} disabled={item.disabled}>{item.name}</button>;
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </header>
            
            <div className="pixshop-body">
                <aside className="pixshop-left-toolbar">
                    {tools.map(tool => (
                        <button key={tool.name} className="pixshop-tool-btn" data-tooltip-name={tool.name} data-tooltip-desc={tool.description} onClick={() => currentImage && handleToolClick(tool.prompt)} disabled={!currentImage || isLoading}>
                            {tool.icon}
                        </button>
                    ))}
                </aside>
                <main 
                    className={`pixshop-main-content ${isPanning ? 'is-panning' : ''}`}
                    ref={mainContentRef}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {isLoading && (
                        <div className="pixshop-loader-overlay">
                            <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                            <p>Gemini is working its magic...</p>
                        </div>
                    )}
                    {currentImage ? (
                        <>
                            <canvas ref={visibleCanvasRef} className="pixshop-canvas-image" />
                             <div className="pixshop-zoom-indicator">
                                {Math.round(zoom * 100)}%
                            </div>
                        </>
                    ) : (
                        <div className="pixshop-upload-prompt">
                            <ImageIcon />
                            <h3>AI-Powered Photo Editing</h3>
                            <button onClick={handleUploadClick}>Upload an Image to Start</button>
                        </div>
                    )}
                    {currentImage && (
                        <form className="pixshop-prompt-bar" onSubmit={handlePromptSubmit}>
                            <input type="text" placeholder="Describe your edit (e.g., 'make the sky dramatic and moody')" value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isLoading} />
                            <button type="submit" disabled={isLoading || !prompt.trim()}><SendIcon /></button>
                        </form>
                    )}
                </main>
                <aside className={`pixshop-right-sidebar ${!isLayersVisible ? 'hidden' : ''}`}>
                    <div className="pixshop-panel">
                        <div className="pixshop-panel-header">
                            <span>Navigator</span>
                            {currentImage && <button onClick={handleDownload} className="pixshop-download-btn" title="Download Image"><DownloadIcon /></button>}
                        </div>
                        <div className="pixshop-panel-content">
                            <div className="navigator-preview">
                                {currentImage ? <img src={currentImage.preview} alt="Preview" /> : <div className="preview-placeholder"></div>}
                            </div>
                        </div>
                    </div>
                    <div className="pixshop-panel">
                        <div className="pixshop-panel-header"><span>History</span></div>
                        <div className="pixshop-panel-content history">
                             {history.length === 0 && <span className="history-placeholder">Your edits will appear here.</span>}
                             {[...history].reverse().map((item, index) => {
                                const originalIndex = history.length - 1 - index;
                                return (
                                    <button 
                                        key={`${item.action}-${originalIndex}`}
                                        className={`history-item ${originalIndex === historyIndex ? 'active' : ''}`}
                                        onClick={() => { setHistoryIndex(originalIndex); setCurrentImage(history[originalIndex]); }}
                                    >
                                        {item.action}
                                    </button>
                                )
                             })}
                        </div>
                    </div>
                     <div className="pixshop-panel">
                        <div className="pixshop-panel-header"><span>AI Creative Suite</span></div>
                        <div className="pixshop-panel-content filters">
                           {filterCategories.map(category => (
                               <div key={category.name} className="filter-category">
                                   <button 
                                       className={`filter-category-header ${activeFilterCategory === category.name ? 'active' : ''}`}
                                       onClick={() => setActiveFilterCategory(activeFilterCategory === category.name ? '' : category.name)}
                                   >
                                       <span>{category.name}</span>
                                       <ChevronDownIcon />
                                   </button>
                                   {activeFilterCategory === category.name && (
                                       <div className="filter-items">
                                           {category.items.map(filter => (
                                               <button 
                                                   key={filter.name} 
                                                   className="filter-item-btn"
                                                   onClick={() => handleAiEdit(filter.prompt)}
                                                   disabled={!currentImage || isLoading}
                                                >
                                                   {filter.name}
                                               </button>
                                           ))}
                                       </div>
                                   )}
                               </div>
                           ))}
                        </div>
                    </div>
                     {error && <div className="pixshop-error-panel">{error}</div>}
                </aside>
            </div>
        </div>
    );
};


// --- AI Headshot View Component ---
const AIHeadshotView: React.FC = () => {
    const [selfie, setSelfie] = useState<{ file: File, preview: string, data: string, mimeType: string } | null>(null);
    const [customChanges, setCustomChanges] = useState("");
    const [backgroundOption, setBackgroundOption] = useState<'default' | 'image' | 'color'>('default');
    const [backgroundImage, setBackgroundImage] = useState<{ file: File, preview: string, data: string, mimeType: string } | null>(null);
    const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgFileInputRef = useRef<HTMLInputElement>(null);

    const styles = [
        { name: 'Corporate Grey', prompt: 'a professional corporate headshot with a solid light grey background, sharp lighting, wearing a formal business suit.' },
        { name: 'Modern Tech Office', prompt: 'a professional headshot in a modern, slightly blurred tech office background with natural light, wearing smart casual attire.' },
        { name: 'Outdoor Natural', prompt: 'a friendly, approachable headshot taken outdoors with a soft, natural, blurred green background, wearing casual clothing.' },
        { name: 'Classic Dark', prompt: 'a dramatic, classic headshot with a dark, moody background, studio lighting, looking confident and professional.' },
        { name: 'Creative & Vibrant', prompt: 'a creative and vibrant headshot with a colorful, abstract background, expressing a friendly and energetic personality.' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setSelfie({
                    file: file,
                    preview: URL.createObjectURL(file),
                    data: result.split(',')[1],
                    mimeType: file.type,
                });
                setGeneratedImage(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setBackgroundImage({
                    file: file,
                    preview: URL.createObjectURL(file),
                    data: result.split(',')[1],
                    mimeType: file.type,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropzoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleGenerate = async () => {
        if (!selfie || !selectedStyle) {
            setError("Please upload a selfie and select a style.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        const selectedStyleData = styles.find(s => s.name === selectedStyle);
        if (!selectedStyleData) {
            setError("Invalid style selected.");
            setIsLoading(false);
            return;
        }

        const parts: any[] = [{ inlineData: { data: selfie.data, mimeType: selfie.mimeType } }];
        let finalPrompt = selectedStyleData.prompt;

        if (backgroundOption === 'image' && backgroundImage) {
            parts.push({ inlineData: { data: backgroundImage.data, mimeType: backgroundImage.mimeType } });
            finalPrompt = `Take the person from the first image and place them onto the background from the second image. The final image should be a professional headshot. Apply the style attributes from this description, but use the provided background image instead of the one described: "${selectedStyleData.prompt}".`;
        } else if (backgroundOption === 'color') {
            finalPrompt += ` IMPORTANT: Override any background described in the style and use a solid color background with the hex code ${backgroundColor}.`;
        }

        if (customChanges.trim()) {
            finalPrompt += ` Also apply these custom changes, which take priority over the base style: "${customChanges.trim()}".`;
        }
        
        parts.push({ text: finalPrompt });
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const mimeType = imagePart.inlineData.mimeType;
                setGeneratedImage(`data:${mimeType};base64,${base64ImageBytes}`);
            } else {
                let detailedError = "The AI did not return an image.";
                const blockReason = response.promptFeedback?.blockReason;
                const finishReason = response.candidates?.[0]?.finishReason;
                const textResponse = response.text?.trim();

                if (blockReason) {
                    detailedError = `Request blocked due to '${blockReason}'.`;
                    if (response.promptFeedback.blockReasonMessage) {
                        detailedError += ` Details: ${response.promptFeedback.blockReasonMessage}`;
                    }
                } else if (finishReason && finishReason !== 'STOP') {
                    detailedError = `Generation failed. Reason: ${finishReason}. Please adjust your prompt or image.`;
                } else if (textResponse) {
                    detailedError = `The AI returned a text message instead of an image: "${textResponse}"`;
                } else {
                    detailedError += " It might be due to a safety policy or a prompt that is too complex. Please try a different image or style.";
                }
                throw new Error(detailedError);
            }
        } catch (err) {
            console.error("AI Headshot Generation Error:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="ai-headshot-view">
                <div className="headshot-loading-container">
                    <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                    <h2>Generating your professional headshot...</h2>
                    <p>This may take a moment. Please don't close this window.</p>
                </div>
            </div>
        );
    }

    if (generatedImage) {
        return (
            <div className="ai-headshot-view">
                <div className="headshot-results-container">
                    <h2>Your AI Headshot is Ready!</h2>
                    <div className="generated-image-wrapper">
                        <img src={generatedImage} alt="Generated AI Headshot" />
                    </div>
                    <div className="results-actions">
                        <a href={generatedImage} download="ai-headshot.png" className="generate-headshot-btn">
                            <DownloadIcon /> Download
                        </a>
                        <button onClick={() => { 
                            setGeneratedImage(null); 
                            setSelfie(null); 
                            setSelectedStyle(null);
                            setCustomChanges("");
                            setBackgroundOption('default');
                            setBackgroundImage(null);
                            setBackgroundColor('#ffffff');
                         }} className="start-over-btn">
                            <PlusIcon /> Create Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-headshot-view">
            <div className="headshot-container">
                <header className="headshot-header">
                    <div className="headshot-logo"><ExploreIcon /></div>
                    <h1>AI Headshot Photographer</h1>
                    <p>Transform your selfie into a professional headshot in three easy steps.</p>
                </header>

                <section className="headshot-step">
                    <div className="step-number">1</div>
                    <h2>Upload a Selfie</h2>
                    <div 
                        className={`upload-dropzone ${selfie ? 'has-image' : ''}`} 
                        onClick={handleDropzoneClick}
                        role="button"
                        aria-label="Upload selfie"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                        {selfie ? (
                            <>
                                <img src={selfie.preview} alt="Selfie preview" className="selfie-preview" />
                                <div className="change-image-overlay">
                                    <p>{selfie.file.name}</p>
                                    <span>Click to change image</span>
                                </div>
                            </>
                        ) : (
                            <div className="upload-prompt">
                                <ImageIcon />
                                <p>Drag & drop or click to upload</p>
                                <span>PNG, JPG, or WEBP</span>
                            </div>
                        )}
                    </div>
                    <div className="headshot-options">
                        <label htmlFor="custom-changes">Optional: Describe any custom changes</label>
                        <textarea 
                            id="custom-changes"
                            placeholder="e.g., 'Change my t-shirt to a dark blue suit', 'Make the background a modern library'..."
                            value={customChanges}
                            onChange={(e) => setCustomChanges(e.target.value)}
                        />
                    </div>
                    <div className="headshot-options">
                         <label>Optional: Customize the background</label>
                         <div className="background-toggle">
                             <button className={backgroundOption === 'default' ? 'active' : ''} onClick={() => setBackgroundOption('default')}>Default</button>
                             <button className={backgroundOption === 'image' ? 'active' : ''} onClick={() => setBackgroundOption('image')}>Image</button>
                             <button className={backgroundOption === 'color' ? 'active' : ''} onClick={() => setBackgroundOption('color')}>Color</button>
                         </div>
                         {backgroundOption === 'image' && (
                            <div className="background-uploader" role="button" onClick={() => bgFileInputRef.current?.click()}>
                                <input type="file" ref={bgFileInputRef} onChange={handleBackgroundImageChange} accept="image/*" style={{ display: 'none' }} />
                                {backgroundImage ? (
                                    <img src={backgroundImage.preview} alt="Background preview" className="background-preview" />
                                ) : (
                                    <span>Click to upload background image</span>
                                )}
                            </div>
                        )}
                        {backgroundOption === 'color' && (
                            <div className="background-color-picker">
                                <label htmlFor="bg-color">Select background color:</label>
                                <input 
                                    type="color" 
                                    id="bg-color" 
                                    value={backgroundColor} 
                                    onChange={(e) => setBackgroundColor(e.target.value)} 
                                />
                                <span>{backgroundColor}</span>
                            </div>
                        )}
                    </div>
                </section>

                <section className="headshot-step">
                    <div className="step-number">2</div>
                    <h2>Select a Style</h2>
                    <div className="style-grid">
                        {styles.map(style => (
                            <div 
                                key={style.name} 
                                className={`style-card ${selectedStyle === style.name ? 'selected' : ''}`}
                                onClick={() => setSelectedStyle(style.name)}
                                role="button"
                                aria-pressed={selectedStyle === style.name}
                                tabIndex={0}
                            >
                                <div className="style-card-image">
                                    <PersonIcon /> 
                                </div>
                                <p>{style.name}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="headshot-step">
                    <div className="step-number">3</div>
                    <h2>Generate Your Headshot</h2>
                     {error && <p className="headshot-error">{error}</p>}
                    <button 
                        className="generate-headshot-btn"
                        onClick={handleGenerate}
                        disabled={!selfie || !selectedStyle || isLoading}
                    >
                        <ExploreIcon /> Generate Headshot
                    </button>
                    {(!selfie || !selectedStyle) && <p className="generate-status">Upload an image and select a style to continue.</p>}
                </section>
                
                <footer className="headshot-footer">
                    Powered by Gemini
                </footer>
            </div>
        </div>
    );
};

// --- AI Animated Logo Designer ---
const AIAnimatedLogoDesignerView: React.FC = () => {
    const [description, setDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    const aspectRatios = ['1:1', '4:3', '3:4', '16:9', '9:16'];

    const handleGenerate = async () => {
        if (!description.trim()) {
            setError("Please describe your company and logo idea first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setIsRevealed(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Step 1: Generate a detailed prompt for the image model
            const creativePrompt = `Based on the following company description, create a single, detailed, and effective prompt for an AI image generator to design a professional logo. The prompt should specify a modern, minimalist, vector-style logo that is simple, memorable, and visually appealing. Do not include any text in the logo itself. Company Description: "${description.trim()}" The generated prompt should be a single paragraph.`;

            // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
            const promptGenResponse: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: creativePrompt,
            });

            const detailedPrompt = promptGenResponse.text;
            if (!detailedPrompt) {
                throw new Error("The AI failed to generate a creative prompt from your description. Please try wording it differently.");
            }
            
            // Step 2: Generate the image using the detailed prompt
            const imageGenResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: detailedPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "9:16",
                },
            });

            const base64ImageBytes = imageGenResponse?.generatedImages?.[0]?.image?.imageBytes;
            if (!base64ImageBytes) {
                throw new Error("Image generation failed. The AI did not return an image. This might be due to a safety policy or an issue with the prompt. Please try again.");
            }

            setGeneratedImage(`data:image/png;base64,${base64ImageBytes}`);
            
        } catch (err) {
            console.error("Logo Generation Error:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred. Please try again later.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (generatedImage) {
            const timer = setTimeout(() => setIsRevealed(true), 100);
            return () => clearTimeout(timer);
        }
    }, [generatedImage]);

    return (
        <div className="ai-logo-designer-view">
            <div className="logo-designer-container">
                <header className="logo-designer-header">
                    <h1>AI Animated Logo Designer</h1>
                    <p>Turn your vision into a stunning, animated logo in seconds.</p>
                </header>

                <main className="logo-designer-form">
                    <div className="logo-form-group">
                        <label htmlFor="logo-description">1. Describe your company & logo idea</label>
                        <textarea
                            id="logo-description"
                            rows={4}
                            placeholder="e.g., 'A coffee shop named Cosmic Brew, using a planet with a coffee ring like Saturn. Minimalist, modern, with a touch of blue.'"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="logo-form-group">
                        <label>2. Choose an aspect ratio</label>
                        <div className="logo-aspect-ratios">
                            {aspectRatios.map(ratio => (
                                <button
                                    key={ratio}
                                    className={aspectRatio === ratio ? 'active' : ''}
                                    onClick={() => setAspectRatio(ratio)}
                                    disabled={isLoading}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button className="generate-logo-btn" onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <LoadingSpinnerIcon />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <ExploreIcon />
                                <span>Generate Logo</span>
                            </>
                        )}
                    </button>
                </main>

                {error && (
                    <div className="logo-error-message">
                        <strong>Error:</strong> {error}
                    </div>
                )}
                
                {generatedImage && !isLoading && (
                    <section className="logo-result-container">
                        <h2>Your Animated Logo!</h2>
                        <div className="logo-result-image-wrapper">
                             <img 
                                src={generatedImage} 
                                alt="Generated AI Logo" 
                                className={isRevealed ? 'revealed' : ''}
                            />
                        </div>
                        <div className="logo-result-actions">
                            <a
                                href={generatedImage}
                                download="ai-generated-logo.png"
                                className="download-logo-btn"
                            >
                                <DownloadIcon />
                                <span>Download Logo</span>
                            </a>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

// --- Reality Portal View Component ---
const RealityPortalView: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<{ file: File, preview: string, data: string, mimeType: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [hasSelectedApiKey, setHasSelectedApiKey] = useState(true);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkApiKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setHasSelectedApiKey(hasKey);
            return hasKey;
        }
        setHasSelectedApiKey(true);
        return true;
    };

    useEffect(() => { checkApiKey(); }, []);

    const handleSelectApiKey = async () => {
      await window.aistudio.openSelectKey();
      await checkApiKey();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setSourceImage({
                    file: file,
                    preview: URL.createObjectURL(file),
                    data: result.split(',')[1],
                    mimeType: file.type,
                });
                setGeneratedVideoUri(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = async () => {
        if (!sourceImage) {
            setError("Please upload an image first.");
            return;
        }

        const hasKey = await checkApiKey();
        if (!hasKey) return;

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUri(null);
        setProgressMessage("Initializing Reality Portal...");

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            setProgressMessage("Analyzing image depth and structure...");
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: 'Create a short, cinematic video with a slow, gentle parallax effect, as if moving through this image in 3D. The movement should be smooth, subtle, and create a sense of depth.',
                image: { imageBytes: sourceImage.data, mimeType: sourceImage.mimeType },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9', // VEO models work best with standard aspect ratios
                }
            });

            setProgressMessage("Rendering the 3D world... This may take a few minutes.");

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) throw new Error(operation.error.message);
            
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation succeeded but no URI was returned.");
            
            setProgressMessage("Finalizing the portal...");
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) throw new Error(`Failed to fetch video file: ${videoResponse.statusText}`);
            
            const videoBlob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoUri(videoUrl);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage.includes("Requested entity was not found")) {
                setError("Your API Key is invalid. Please select a valid project API key.");
                setHasSelectedApiKey(false);
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };

    return (
        <div className="reality-portal-view">
            <div className="rp-container">
                <header className="rp-header">
                    <h1>Reality Portal</h1>
                    <p>Step inside your photos — explore them like a 3D world.</p>
                </header>

                {!generatedVideoUri && !isLoading && (
                    <section className="rp-upload-section">
                        <div className="rp-upload-area" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                            {sourceImage ? (
                                <>
                                    <img src={sourceImage.preview} alt="Uploaded preview" className="rp-image-preview" />
                                    <div className="rp-change-image-overlay"><span>Click to change image</span></div>
                                </>
                            ) : (
                                <div className="rp-upload-prompt">
                                    <UploadIcon />
                                    <p>Click to upload an image</p>
                                    <span>and transform it into a 3D experience</span>
                                </div>
                            )}
                        </div>
                        {error && <p className="rp-error">{error}</p>}
                        {!hasSelectedApiKey ? (
                            <div className="api-key-prompt rp-api-key-prompt">
                                <h3>Project API Key Required</h3>
                                <p>To use this feature, please select a project with the Gemini API enabled. For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">billing docs</a>.</p>
                                <button onClick={handleSelectApiKey}>Select Project API Key</button>
                            </div>
                        ) : (
                            <button className="rp-generate-btn" onClick={handleGenerate} disabled={!sourceImage || isLoading}>
                                <ExploreIcon /> Enter the Portal
                            </button>
                        )}
                    </section>
                )}

                {isLoading && (
                    <div className="rp-loading-view">
                         <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                         <h2>{progressMessage}</h2>
                    </div>
                )}
                
                {generatedVideoUri && (
                    <section className="rp-result-section">
                        <h2>Portal Opened!</h2>
                        <div className="rp-video-wrapper">
                            <video src={generatedVideoUri} controls autoPlay loop muted />
                        </div>
                        <div className="rp-result-actions">
                             <a href={generatedVideoUri} download="reality-portal.mp4" className="rp-action-btn"><DownloadIcon /> Download</a>
                             <button className="rp-action-btn" onClick={() => { setSourceImage(null); setGeneratedVideoUri(null); }}><PlusIcon /> Create Another</button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

// --- AI Calm Room View Component ---
const AICalmRoomView: React.FC = () => {
    type Step = 'mood' | 'generating' | 'room';
    const [step, setStep] = useState<Step>('mood');
    const [mood, setMood] = useState('');
    const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
    const [affirmations, setAffirmations] = useState<string[]>([]);
    const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [hasSelectedApiKey, setHasSelectedApiKey] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const moods = ['Calm', 'Focus', 'Joy', 'Creative', 'Tired', 'Anxious'];
    const moodPrompts = {
        'Calm': { video: 'A serene, endless loop of gentle ocean waves softly lapping on a sandy beach under a calm, cloudy sky. Peaceful and relaxing.', affirmations: 'calm, reassurance, and safety' },
        'Focus': { video: 'A mesmerizing, slow-motion loop of geometric lines and patterns shifting and evolving with a dark background. Minimalist and hypnotic.', affirmations: 'focus, clarity, and productivity' },
        'Joy': { video: 'An endless loop of a sun-drenched meadow with gently swaying wildflowers and soft light particles floating in the air. Warm, happy, and uplifting.', affirmations: 'joy, gratitude, and positivity' },
        'Creative': { video: 'An abstract, slowly swirling nebula of vibrant, dream-like colors. A cosmic dance of paint and light, inspiring imagination.', affirmations: 'creativity, inspiration, and new ideas' },
        'Tired': { video: 'An endless loop of a cozy, dimly lit room with a crackling fireplace and gentle rain tapping on the window. Warm and comforting.', affirmations: 'rest, relaxation, and rejuvenation' },
        'Anxious': { video: 'A peaceful, endless loop of looking up through a canopy of lush green forest leaves, with gentle sunlight filtering through. Grounding and stable.', affirmations: 'peace, security, and releasing worry' },
    };

    const checkApiKey = async () => { /* Similar to RealityPortalView */ return true; };
    useEffect(() => { checkApiKey(); }, []);

    const handleSelectApiKey = async () => {
        await window.aistudio.openSelectKey();
        await checkApiKey();
    };

    const handleMoodSelect = async (selectedMood: string) => {
        const hasKey = await checkApiKey();
        if (!hasKey) {
            setError("Please select a Project API Key to create your Calm Room.");
            return;
        }
        setMood(selectedMood);
        setStep('generating');
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const videoPromise = (async () => {
                setProgressMessage("Creating a calming visual...");
                const prompt = moodPrompts[selectedMood as keyof typeof moodPrompts].video;
                let op = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
                while (!op.done) {
                    await new Promise(r => setTimeout(r, 5000));
                    op = await ai.operations.getVideosOperation({ operation: op });
                }
                if (op.error) throw new Error(op.error.message);
                const link = op.response?.generatedVideos?.[0]?.video?.uri;
                if (!link) throw new Error("Video generation failed to return a link.");
                const res = await fetch(`${link}&key=${process.env.API_KEY}`);
                return URL.createObjectURL(await res.blob());
            })();
            
            const affirmationPromise = (async () => {
                setProgressMessage("Writing positive affirmations...");
                const prompt = `Generate a JSON array of 5 short, comforting affirmations related to the feeling of ${moodPrompts[selectedMood as keyof typeof moodPrompts].affirmations}. The response must be only the JSON array.`;
                // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
                const res: GenerateContentResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
                });
                return JSON.parse(res.text);
            })();

            const [videoResult, affirmationResult] = await Promise.all([videoPromise, affirmationPromise]);
            
            setGeneratedVideoUri(videoResult);
            setAffirmations(affirmationResult);
            setStep('room');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage.includes("Requested entity was not found")) {
                 setError("Your API Key is invalid. Please select a valid project API key.");
                 setHasSelectedApiKey(false);
            } else {
                 setError(errorMessage);
            }
            setStep('mood');
        }
    };

    useEffect(() => {
        if (step === 'room' && affirmations.length > 0) {
            const interval = setInterval(() => {
                setCurrentAffirmationIndex(prev => (prev + 1) % affirmations.length);
            }, 6000);
            return () => clearInterval(interval);
        }
    }, [step, affirmations]);

    const handlePlayAffirmations = async () => {
        if (isSpeaking) {
            audioSourcesRef.current.forEach(source => source.stop());
            audioSourcesRef.current.clear();
            setIsSpeaking(false);
            return;
        }

        setIsSpeaking(true);
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            for (const text of affirmations) {
                // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
                const response: GenerateContentResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text }] }],
                    config: { responseModalities: [Modality.AUDIO] },
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const outputCtx = outputAudioContextRef.current!;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                }
            }
        } catch (err) {
            console.error("TTS error:", err);
            setError("Could not play affirmations.");
        } finally {
            setTimeout(() => setIsSpeaking(false), nextStartTimeRef.current * 1000 - outputAudioContextRef.current.currentTime * 1000);
        }
    };
    
    if (step === 'generating') {
        return (
            <div className="calm-loading-view">
                <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                <h2>{progressMessage}</h2>
            </div>
        );
    }
    
    if (step === 'room') {
        return (
            <div className="calm-room-view">
                <video className="calm-video-bg" src={generatedVideoUri!} autoPlay loop muted />
                <div className="calm-overlay">
                    <div className="affirmation-container">
                        <p key={currentAffirmationIndex}>{affirmations[currentAffirmationIndex]}</p>
                    </div>
                    <div className="calm-controls">
                        <button onClick={handlePlayAffirmations} disabled={isSpeaking}>
                            {isSpeaking ? <StopIcon/> : <ListenIcon/>}
                            <span>{isSpeaking ? 'Speaking...' : 'Listen to Affirmations'}</span>
                        </button>
                         <button onClick={() => setStep('mood')}>
                            <PlusIcon/>
                            <span>Change Mood</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-calm-room-view">
            <header>
                <h1>AI Calm Room</h1>
                <p>Relax your mind with AI-powered visuals and sound.</p>
            </header>
            <h2>How are you feeling right now?</h2>
            <div className="mood-selection-grid">
                {moods.map(m => (
                    <button key={m} className="mood-btn" onClick={() => handleMoodSelect(m)}>{m}</button>
                ))}
            </div>
             {error && <p className="rp-error">{error}</p>}
             {!hasSelectedApiKey && (
                 <div className="api-key-prompt rp-api-key-prompt">
                     <p>A Project API Key is required to generate visuals.</p>
                     <button onClick={handleSelectApiKey}>Select Project API Key</button>
                 </div>
             )}
        </div>
    );
};


const App: React.FC = () => {
  const [chats, setChats] = useState<{ [id: string]: ChatSession }>({});
  const [chatOrder, setChatOrder] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('chat');

  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isImageGenMode, setIsImageGenMode] = useState<boolean>(false);
  const [isVideoGenMode, setIsVideoGenMode] = useState<boolean>(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [isDeepResearchMode, setIsDeepResearchMode] = useState<boolean>(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [feedback, setFeedback] = useState<{ [chatId: string]: { [messageIndex: number]: 'liked' | 'disliked' | null } }>({});
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [moreOptionsMenuIndex, setMoreOptionsMenuIndex] = useState<number | null>(null);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [historyMenuChatId, setHistoryMenuChatId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasSelectedApiKey, setHasSelectedApiKey] = useState<boolean>(false);
  
  // Live Chat State
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'ended'>('idle');
  const [transcripts, setTranscripts] = useState<{ speaker: 'user' | 'model', text: string }[]>([]);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  
  // Live Chat Refs
  const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const currentInputTranscriptionRef = useRef<string>("");
  const currentOutputTranscriptionRef = useRef<string>("");

  const modelDisplayNames: { [key in ModelType]: string } = {
    'gemini-2.5-flash': '2.5 Flash',
    'gemini-2.5-pro': '2.5 Pro',
  };

  const viewTitles: { [key in ActiveView]: string } = {
    chat: 'Gemini',
    pixshop: 'PixShop AI Editor',
    'ai-headshot': 'AI Headshot Photographer',
    'logo-design': 'AI Animated Logo Designer',
    'visigen-ai': 'VisiGen AI',
    explore: 'Explore',
    'live-chat': 'Live Conversation',
    'reality-portal': 'Reality Portal',
    'ai-calm-room': 'AI Calm Room',
  };


  const getConfigForModel = (model: ModelType) => {
    const baseConfig = { systemInstruction: "You are a helpful and creative assistant." };
    if (model === 'gemini-2.5-pro') {
      return {
        ...baseConfig,
        thinkingConfig: { thinkingBudget: 32768 }
      };
    }
    return baseConfig;
  };

  const createNewChat = (model: ModelType = 'gemini-2.5-flash'): ChatSession => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    return {
      title: "New Chat",
      messages: [],
      model: model,
      chatInstance: ai.chats.create({
        model: model,
        config: getConfigForModel(model),
      })
    };
  };

  const handleNewChat = () => {
    setActiveView('chat');
    const newId = Date.now().toString();
    setChats(prev => ({ ...prev, [newId]: createNewChat() }));
    setChatOrder(prev => [newId, ...prev]);
    setActiveChatId(newId);
    setPrompt("");
    setIsImageGenMode(false);
    setIsDeepResearchMode(false);
    setIsVideoGenMode(false);
    setUploadedImage(null);
    return newId;
  };

  const handleStartNewToolChat = (tool: 'book-writer') => {
    setActiveView('chat');
    const newId = Date.now().toString();
    
    let initialMessage: ChatMessage;
    let chatTitle: string;

    if (tool === 'book-writer') {
        chatTitle = "AI Book Writing";
        initialMessage = {
            role: 'model',
            type: 'tool-intro',
            parts: [{ text: `
                <div class="book-writer-intro-content">
                    <div class="book-writer-icon-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
                    </div>
                    <h2>AI Book Writing</h2>
                    <p>Helping you write your book, from idea to publication.</p>
                    <div class="prompt-starters">
                        <button class="prompt-starter-btn" data-prompt="Let's start my book! Ask me for the initial details like title, genre, characters, and tone.">Let's start my book! Ask for the initial details...</button>
                        <button class="prompt-starter-btn" data-prompt="Can you help me write the first chapter of a sci-fi mystery?">Help me write a chapter</button>
                        <button class="prompt-starter-btn" data-prompt="What are the essential steps to publishing a book?">Steps to publish a book</button>
                        <button class="prompt-starter-btn" data-prompt="Give me some creative ideas for a fantasy novel.">Brainstorm fantasy ideas</button>
                    </div>
                </div>
            ` }]
        };
    } else {
        return;
    }

    const newChatSession = createNewChat();
    newChatSession.messages = [initialMessage];
    newChatSession.title = chatTitle;

    setChats(prev => ({ ...prev, [newId]: newChatSession }));
    setChatOrder(prev => [newId, ...prev]);
    setActiveChatId(newId);
    setPrompt("");
    setIsImageGenMode(false);
    setIsDeepResearchMode(false);
    setIsVideoGenMode(false);
    setUploadedImage(null);
};

  const checkApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasSelectedApiKey(hasKey);
    } else {
        setHasSelectedApiKey(true);
    }
  };

  const handleSelectApiKey = async () => {
      await window.aistudio.openSelectKey();
      setHasSelectedApiKey(true);
  };

  useEffect(() => {
    try {
      checkApiKey();
      const storedChatsJSON = localStorage.getItem('gemini_chats');
      const storedChatOrderJSON = localStorage.getItem('gemini_chat_order');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      if (storedChatsJSON && storedChatOrderJSON) {
        const storedChats = JSON.parse(storedChatsJSON);
        const restoredChats: { [id: string]: ChatSession } = {};

        for (const id in storedChats) {
          const chatData = storedChats[id];
          restoredChats[id] = {
            ...chatData,
            chatInstance: ai.chats.create({
              model: chatData.model,
              config: getConfigForModel(chatData.model),
              history: chatData.messages,
            }),
          };
        }
        
        const restoredChatOrder = JSON.parse(storedChatOrderJSON);

        if (restoredChatOrder.length > 0) {
            setChats(restoredChats);
            setChatOrder(restoredChatOrder);
            setActiveChatId(restoredChatOrder[0]);
        } else {
            handleNewChat();
        }
      } else {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to load chats from localStorage:", error);
      handleNewChat();
    } finally {
        isInitialLoad.current = false;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => setPrompt(Array.from(event.results).map((r: any) => r[0].transcript).join(''));
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) return;

    try {
        const serializableChats: { [id: string]: Omit<ChatSession, 'chatInstance'> } = {};
        for (const id in chats) {
            if (Object.prototype.hasOwnProperty.call(chats, id)) {
                const { chatInstance, ...rest } = chats[id];
                serializableChats[id] = rest;
            }
        }
        localStorage.setItem('gemini_chats', JSON.stringify(serializableChats));
        localStorage.setItem('gemini_chat_order', JSON.stringify(chatOrder));
    } catch (error) {
        console.error("Failed to save chats to localStorage:", error);
    }
  }, [chats, chatOrder]);


  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
    }
  }, [chats[activeChatId || '']?.messages, transcripts]);
  
  const handleToggleLiveSession = async () => {
    if (isLiveActive) {
      if (liveSessionPromiseRef.current) {
        liveSessionPromiseRef.current.then(session => session.close());
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
      }
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
      }
      setIsLiveActive(false);
      setLiveStatus('ended');
      liveSessionPromiseRef.current = null;
    } else {
      setLiveStatus('connecting');
      setTranscripts([]);
      currentInputTranscriptionRef.current = '';
      currentOutputTranscriptionRef.current = '';

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
        audioSourcesRef.current.clear();
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;

        liveSessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setIsLiveActive(true);
              setLiveStatus('connected');
              const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;
              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                liveSessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message) => {
              if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              }
              if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current;
                const fullOutput = currentOutputTranscriptionRef.current;
                setTranscripts(prev => {
                    const newTranscripts = [...prev];
                    if (fullInput.trim()) newTranscripts.push({ speaker: 'user', text: fullInput });
                    if (fullOutput.trim()) newTranscripts.push({ speaker: 'model', text: fullOutput });
                    return newTranscripts;
                });
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
              }
              
              const modelTurnPart = message.serverContent?.modelTurn?.parts?.[0];
              // FIX: Safely access audio data. A server message can contain transcription updates
              // or other metadata without any audio. This check ensures we only process audio
              // when the 'inlineData' property actually exists on a message part.
              if (modelTurnPart?.inlineData) {
                  const base64Audio = modelTurnPart.inlineData.data;
                  if (base64Audio) {
                    const outputCtx = outputAudioContextRef.current!;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                  }
              }

              if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                  source.stop();
                }
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => {
              console.error('Live session error:', e);
              setLiveStatus('error');
              if (isLiveActive) handleToggleLiveSession();
            },
            onclose: () => {
              if (isLiveActive) handleToggleLiveSession();
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        });
      } catch (error) {
        console.error("Failed to start live session:", error);
        setLiveStatus('error');
        setIsLiveActive(false);
      }
    }
  };
  
  useEffect(() => {
      if (activeView !== 'live-chat' && isLiveActive) {
          handleToggleLiveSession();
      }
  }, [activeView]);


  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target as Node) &&
        modelBtnRef.current &&
        !modelBtnRef.current.contains(event.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(event.target as Node) &&
        toolsBtnRef.current &&
        !toolsBtnRef.current.contains(event.target as Node)
      ) {
        setIsToolsMenuOpen(false);
      }
      if (moreOptionsMenuIndex !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.more-options-container')) {
            setMoreOptionsMenuIndex(null);
        }
      }
      if (historyMenuChatId !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.history-item-menu-container')) {
            setHistoryMenuChatId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [moreOptionsMenuIndex, historyMenuChatId]);


  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(adjustTextareaHeight, [prompt]);

  const getFriendlyErrorMessage = (error: unknown): { message: string, resetKey: boolean } => {
    // FIX: The caught error `error` is of type `unknown` and must be converted to a string
    // before being used in string operations.
    const errorString = error instanceof Error ? error.message : String(error);

    if (errorString.includes('resourcemanager.projects.get')) {
        return {
            message: marked(`
### Permission Denied
It looks like there's a permission issue with your Google Cloud project.
**Error Details:** You are missing the \`resourcemanager.projects.get\` permission.
**How to fix this:**
*   **Check IAM Roles:** Ensure your account has a role like "Project Viewer" or a custom role that includes the required permission for the selected project.
*   **Enable API:** Make sure the Gemini API is enabled in your Google Cloud project.
*   **Select a Different Project:** If you have access to other projects, you can try selecting a different one.
You can use the [Google Cloud IAM Troubleshooter](https://console.cloud.google.com/iam-admin/troubleshooter) to diagnose the issue further.
            `) as string,
            resetKey: false,
        };
    }

    if (errorString.includes("Requested entity was not found.") || errorString.toLowerCase().includes("api key not valid")) {
         return {
            message: marked(`
### API Key Invalid
The API key you've selected is either invalid or the associated project could not be found.
Please click the "Select Project API Key" button below to choose a valid project.
            `) as string,
            resetKey: true,
        };
    }
    
    // Default generic error
    return {
        message: marked('An unexpected error occurred.\n\n**Details:**\n```\n' + errorString + '\n```') as string,
        resetKey: false
    };
  };

  const handleApiError = (
    err: unknown,
    chatId: string,
    messagesBeforeRequest: ChatMessage[],
    userMessage: ChatMessage
  ) => {
    const { message, resetKey } = getFriendlyErrorMessage(err);
    if (resetKey) {
      setHasSelectedApiKey(false);
    }
    
    const errorResponseMessage: ChatMessage = { role: 'model', parts: [{ text: message }] };
    const finalMessages = [...messagesBeforeRequest, userMessage, errorResponseMessage];
    setChats(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        messages: finalMessages
      }
    }));
  };

  const handleSendMessage = async (currentPrompt: string, optionalChatId?: string, optionalChatSession?: ChatSession) => {
    const chatId = optionalChatId || activeChatId;
    if (isLoading || (!currentPrompt.trim() && !uploadedImage) || !chatId) return;

    setIsLoading(true);
    const currentChat = optionalChatSession || chats[chatId];

    if (!currentChat) {
      console.error(`handleSendMessage: chat session not found for ID "${chatId}"`);
      setIsLoading(false);
      return;
    }

    const userMessageParts: MessagePart[] = [];
    if (uploadedImage && !isDeepResearchMode && !isImageGenMode && !isVideoGenMode) {
      userMessageParts.push({
        inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType }
      });
    }
    if (currentPrompt.trim()) {
      userMessageParts.push({ text: currentPrompt });
    }

    const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
    const loadingMessageText = isVideoGenMode ? 'Hold tight, your masterpiece is being created... This can take a few minutes. ⏳' : isImageGenMode ? 'Generating your image...' : 'loading';
    const loadingMessage: ChatMessage = { role: 'model', parts: [{ text: loadingMessageText }] };
    
    // If the chat has a tool-intro message, replace it instead of appending
    const messagesBeforeRequest = currentChat.messages[0]?.type === 'tool-intro'
        ? []
        : currentChat.messages;
    
    const updatedMessages = [...messagesBeforeRequest, userMessage, loadingMessage];

    setChats(prev => ({ ...prev, [chatId]: { ...currentChat, messages: updatedMessages } }));
    setPrompt("");
    setUploadedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
      let response: GenerateContentResponse;
      let modelResponseParts: MessagePart[] = [];
      let modelResponseSources: GroundingSource[] | undefined = undefined;

      if (isImageGenMode) {
        const imageGenResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: currentPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: imageAspectRatio,
            },
        });
        const base64ImageBytes = imageGenResponse?.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
          throw new Error("Image generation failed or returned no image data.");
        }
        modelResponseParts = [{
            inlineData: {
                mimeType: 'image/png',
                data: base64ImageBytes
            }
        }];
      } else if (isVideoGenMode) {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: currentPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: videoAspectRatio,
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) throw new Error(operation.error.message);
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation succeeded but no URI was returned.");
        
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video file: ${videoResponse.statusText}`);
        
        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        
        modelResponseParts = [{
            videoData: {
                uri: videoUrl,
                mimeType: videoBlob.type || 'video/mp4',
            }
        }];
      } else if (isDeepResearchMode) {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: currentPrompt,
          config: { tools: [{ googleSearch: {} }] },
        });
        modelResponseParts = [{ text: marked(response.text || "") as string }];
        modelResponseSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingSource[] | undefined;
      } else {
        response = await currentChat.chatInstance.sendMessage({ message: userMessageParts });
        modelResponseParts = [{ text: marked(response.text || "") as string }];
      }

      const modelResponseMessage: ChatMessage = { role: 'model', parts: modelResponseParts, sources: modelResponseSources };
      const finalMessages = [...messagesBeforeRequest, userMessage, modelResponseMessage];
      
      const newTitle = messagesBeforeRequest.length === 0 && currentChat.title === "New Chat"
        ? currentPrompt.substring(0, 35) + (currentPrompt.length > 35 ? '...' : '')
        : currentChat.title;

      setChats(prev => ({ ...prev, [chatId]: { ...prev[chatId], title: newTitle, messages: finalMessages } }));

    } catch (err) {
      handleApiError(err, chatId, messagesBeforeRequest, userMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage(prompt);
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return alert("Speech recognition is not supported.");
    isRecording ? recognitionRef.current.stop() : recognitionRef.current.start();
  };
  
  const handleToggleDeepResearchMode = () => {
    const willBeOn = !isDeepResearchMode;
    setIsDeepResearchMode(willBeOn);
    if (willBeOn) {
      setIsImageGenMode(false);
      setIsVideoGenMode(false);
      setUploadedImage(null);
    }
    setIsToolsMenuOpen(false);
  };
  
  const handleToggleImageGenMode = () => {
    const willBeOn = !isImageGenMode;
    setIsImageGenMode(willBeOn);
    if (willBeOn) {
      setIsDeepResearchMode(false);
      setIsVideoGenMode(false);
      setUploadedImage(null);
    }
    setIsToolsMenuOpen(false);
  };

  const handleToggleVideoGenMode = () => {
    const willBeOn = !isVideoGenMode;
    setIsVideoGenMode(willBeOn);
    if (willBeOn) {
      setIsImageGenMode(false);
      setIsDeepResearchMode(false);
      setUploadedImage(null);
      checkApiKey();
    }
    setIsToolsMenuOpen(false);
  };


  const handleModelChange = (newModel: ModelType) => {
    if (!activeChatId) return;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const currentChat = chats[activeChatId];
    if (currentChat.model === newModel) {
      setIsModelMenuOpen(false);
      return;
    }

    const newChatInstance = ai.chats.create({
      model: newModel,
      config: getConfigForModel(newModel),
      history: currentChat.messages,
    });

    setChats(prev => ({
      ...prev,
      [activeChatId]: {
        ...currentChat,
        model: newModel,
        chatInstance: newChatInstance,
      }
    }));
    setIsModelMenuOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.includes(',')) {
            setUploadedImage({
              data: result.split(',')[1],
              mimeType: file.type,
              name: file.name,
            });
            setIsImageGenMode(false);
            setIsDeepResearchMode(false);
            setIsVideoGenMode(false);
        } else {
            console.error('File could not be read as a Base64 string.');
            alert('There was an error uploading the image. Please try another file.');
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleStartEdit = (index: number) => {
    if (!activeChatId) return;
    const messageToEdit = chats[activeChatId].messages[index];
    const textPart = messageToEdit.parts.find(p => p.text)?.text || "";
    setEditingMessageIndex(index);
    setEditingText(textPart);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (editingMessageIndex === null || !activeChatId) return;

    setIsLoading(true);
    const currentChat = chats[activeChatId];
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const originalMessage = currentChat.messages[editingMessageIndex];
    const updatedParts: MessagePart[] = originalMessage.parts
      .filter(p => p.inlineData)
      .concat([{ text: editingText }]); 

    const updatedUserMessage: ChatMessage = { role: 'user', parts: updatedParts };
    const truncatedMessages = currentChat.messages.slice(0, editingMessageIndex);
    const newHistory = [...truncatedMessages, updatedUserMessage];

    const loadingMessage: ChatMessage = { role: 'model', parts: [{ text: 'loading' }] };
    setChats(prev => ({
      ...prev,
      [activeChatId]: {
        ...currentChat,
        messages: [...newHistory, loadingMessage],
      }
    }));

    setEditingMessageIndex(null);
    setEditingText("");

    try {
      const newChatInstance = ai.chats.create({
        model: currentChat.model,
        config: getConfigForModel(currentChat.model),
        history: truncatedMessages,
      });

      // FIX: Add GenerateContentResponse type hint to ensure correct type inference.
      const response: GenerateContentResponse = await newChatInstance.sendMessage({ message: updatedUserMessage.parts });
      const modelResponseParts: MessagePart[] = [{ text: marked(response.text || "") as string }];
      const modelResponseMessage: ChatMessage = { role: 'model', parts: modelResponseParts };
      const finalMessages = [...newHistory, modelResponseMessage];

      setChats(prev => ({
        ...prev,
        [activeChatId]: {
          ...prev[activeChatId],
          messages: finalMessages,
          chatInstance: newChatInstance,
        }
      }));
    } catch (err) {
      handleApiError(err, activeChatId, truncatedMessages, updatedUserMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (index: number, type: 'liked' | 'disliked') => {
    if (!activeChatId) return;
    setFeedback(prev => {
      const currentChatFeedback = prev[activeChatId] || {};
      const newFeedback = currentChatFeedback[index] === type ? null : type;
      return {
        ...prev,
        [activeChatId]: {
          ...currentChatFeedback,
          [index]: newFeedback
        }
      };
    });
  };

  const handleCopy = (textToCopy: string, index: number) => {
    const plainText = textToCopy.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text.');
    });
  };

  const handleShare = async (textToShare: string) => {
    const plainText = textToShare.replace(/<[^>]*>?/gm, '');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gemini Response',
          text: plainText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Web Share API is not supported in your browser.');
    }
  };

  const handleListen = (textToSpeak: string, index: number) => {
    const plainText = textToSpeak.replace(/<[^>]*>?/gm, '');
    const synth = window.speechSynthesis;

    if (speakingMessageIndex === index) {
      synth.cancel();
      setSpeakingMessageIndex(null);
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.onend = () => {
      setSpeakingMessageIndex(null);
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setSpeakingMessageIndex(null);
    };

    synth.speak(utterance);
    setSpeakingMessageIndex(index);
    setMoreOptionsMenuIndex(null);
  };

  const handleHistoryMenuToggle = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setHistoryMenuChatId(prev => (prev === chatId ? null : chatId));
  };

  const handleStartRename = (chatId: string) => {
    setRenamingChatId(chatId);
    setRenameText(chats[chatId].title);
    setHistoryMenuChatId(null);
  };

  const handleCancelRename = () => {
    setRenamingChatId(null);
    setRenameText("");
  };

  const handleSaveRename = (chatId: string) => {
    if (!renameText.trim()) return;
    setChats(prev => ({
      ...prev,
      [chatId]: { ...prev[chatId], title: renameText.trim() }
    }));
    setRenamingChatId(null);
    setRenameText("");
  };

  const handleShareChat = async (chatId: string) => {
    const chat = chats[chatId];
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Gemini Chat: ${chat.title}`,
          text: `Check out this conversation: ${chat.title}`,
        });
      } catch (error) { console.error('Error sharing chat:', error); }
    } else {
      alert('Sharing is not supported on this browser.');
    }
    setHistoryMenuChatId(null);
  };

  const handleDeleteChat = (chatIdToDelete: string) => {
    if (window.confirm("Are you sure you want to delete this chat?")) {
      setChats(prev => {
        const newChats = { ...prev };
        delete newChats[chatIdToDelete];
        return newChats;
      });
      const newChatOrder = chatOrder.filter(id => id !== chatIdToDelete);
      setChatOrder(newChatOrder);

      if (activeChatId === chatIdToDelete) {
        if (newChatOrder.length > 0) {
          setActiveChatId(newChatOrder[0]);
        } else {
          const newId = handleNewChat();
          setActiveChatId(newId);
        }
      }
    }
    setHistoryMenuChatId(null);
  };

  const handleExplorePromptClick = (promptText: string) => {
    // This logic is similar to handleNewChat, but we need the newChat object
    // immediately to prevent a race condition with state updates.
    setActiveView('chat');
    const newId = Date.now().toString();
    const newChat = createNewChat();

    setChats(prev => ({ ...prev, [newId]: newChat }));
    setChatOrder(prev => [newId, ...prev]);
    setActiveChatId(newId);
    setPrompt("");
    setIsImageGenMode(false);
    setIsDeepResearchMode(false);
    setIsVideoGenMode(false);
    setUploadedImage(null);

    handleSendMessage(promptText, newId, newChat);
  };
  
  const handleMainContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('.prompt-starter-btn');
    if (button && button.getAttribute('data-prompt')) {
        const promptText = button.getAttribute('data-prompt');
        if (promptText) {
            handleSendMessage(promptText);
        }
    }
};


  const renderMessageContent = (msg: ChatMessage, index: number) => {
    const isEditingThisMessage = editingMessageIndex === index;
    const isToolIntro = msg.type === 'tool-intro';

    return (
      <div key={index} className={`message ${msg.role} ${isEditingThisMessage ? 'editing' : ''} ${isToolIntro ? 'tool-intro-message' : ''}`}>
        <div className="message-content">
          {isEditingThisMessage ? (
            <>
              <textarea
                className="edit-textarea"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="edit-actions">
                <button onClick={handleSaveEdit} className="icon-btn save-btn" aria-label="Save changes" disabled={isLoading}><SaveIcon /></button>
                <button onClick={handleCancelEdit} className="icon-btn cancel-btn" aria-label="Cancel editing" disabled={isLoading}><CancelIcon /></button>
              </div>
            </>
          ) : (
            <>
              {msg.parts.map((part, partIndex) => {
                if (part.text === 'loading' || part.text?.includes('masterpiece is being created') || part.text === 'Generating your image...') {
                  return (
                    <div key={partIndex} className="loader-container">
                      { part.text !== 'loading' && <p>{part.text}</p> }
                      <div className="loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                    </div>
                  );
                }
                if (part.text) {
                  return <div key={partIndex} dangerouslySetInnerHTML={{ __html: part.text }}></div>;
                }
                if (part.inlineData) {
                  const altText = msg.role === 'user' ? "User uploaded content" : "Generated content";
                  const isGeneratedImage = msg.role === 'model';
                  const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  const fileExtension = part.inlineData.mimeType.split('/')[1]?.split('+')[0] || 'png';

                  return (
                    <div key={partIndex} className="image-wrapper">
                      <img src={imageUrl} alt={altText} />
                      {isGeneratedImage && (
                        <a
                          href={imageUrl}
                          download={`gemini-generated-image.${fileExtension}`}
                          className="icon-btn download-btn"
                          aria-label="Download image"
                          title="Download image"
                        >
                          <DownloadIcon />
                        </a>
                      )}
                    </div>
                  );
                }
                if (part.videoData) {
                    return (
                        <div key={partIndex} className="video-wrapper">
                            <video
                                src={part.videoData.uri}
                                controls
                                className="generated-video"
                                style={{ aspectRatio: videoAspectRatio }}
                            />
                            <a
                                href={part.videoData.uri}
                                download={`gemini-generated-video.mp4`}
                                className="icon-btn download-btn"
                                aria-label="Download video"
                                title="Download video"
                            >
                                <DownloadIcon />
                            </a>
                        </div>
                    );
                }
                return null;
              })}

              {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                <div className="sources-container">
                  <h4>Sources</h4>
                  <ul>
                    {/* FIX: Check for the existence of source.web.uri before rendering the link to prevent rendering empty links. */}
                    {msg.sources.map((source, i) => source.web && source.web.uri && (
                      <li key={i}>
                        <a href={source.web.uri} target="_blank" rel="noopener noreferrer">
                          {source.web.title || source.web.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {msg.role === 'user' && !isLoading && editingMessageIndex === null && (
                <button className="icon-btn edit-btn" onClick={() => handleStartEdit(index)} aria-label="Edit message">
                  <EditIcon />
                </button>
              )}
              {msg.role === 'model' && !isToolIntro && msg.parts[0]?.text !== 'loading' && !msg.parts[0]?.text?.includes('### ') && (
                <div className="message-actions">
                  <button
                    className={`icon-btn feedback-btn ${feedback[activeChatId || '']?.[index] === 'liked' ? 'active' : ''}`}
                    onClick={() => handleFeedback(index, 'liked')}
                    aria-label="Like response"
                  >
                    <ThumbsUpIcon />
                  </button>
                  <button
                    className={`icon-btn feedback-btn ${feedback[activeChatId || '']?.[index] === 'disliked' ? 'active' : ''}`}
                    onClick={() => handleFeedback(index, 'disliked')}
                    aria-label="Dislike response"
                  >
                    <ThumbsDownIcon />
                  </button>
                  <button className="icon-btn" onClick={() => handleShare(msg.parts.map(p => p.text || '').join('\n'))} aria-label="Share response">
                    <ShareIcon />
                  </button>
                  <button className="icon-btn" onClick={() => handleCopy(msg.parts.map(p => p.text || '').join('\n'), index)} aria-label="Copy response">
                    {copiedMessageIndex === index ? <CheckmarkIcon /> : <CopyIcon />}
                  </button>
                  <div className="more-options-container">
                    <button className="icon-btn" onClick={() => setMoreOptionsMenuIndex(moreOptionsMenuIndex === index ? null : index)} aria-label="More options">
                      <MoreIcon />
                    </button>
                    {moreOptionsMenuIndex === index && (
                      <div className="dropdown-menu more-options-menu">
                        <button type="button" className="menu-item" onClick={() => handleListen(msg.parts.map(p => p.text || '').join('\n'), index)}>
                           {speakingMessageIndex === index ? <StopIcon /> : <ListenIcon />}
                           <span>{speakingMessageIndex === index ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const activeChatMessages = activeChatId ? chats[activeChatId]?.messages || [] : [];
  const isChatActive = activeChatId ? (chats[activeChatId]?.messages.length > 0) : false;
  const activeModel = activeChatId ? chats[activeChatId]?.model || 'gemini-2.5-flash' : 'gemini-2.5-flash';
  const filteredChatOrder = chatOrder.filter(id => 
    chats[id]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exploreViewContent = (
    <div className="explore-view">
        <h2>What can I help you with today?</h2>
        <div className="explore-grid">
            <div className="explore-card" onClick={() => handleExplorePromptClick('Write a short story about a brave knight and a friendly dragon.')}>
                <div className="card-icon"><EditIcon /></div>
                <h3>Write a story</h3>
                <p>about a brave knight and a friendly dragon.</p>
            </div>
            <div className="explore-card" onClick={() => handleExplorePromptClick('Explain quantum computing in simple terms.')}>
                <div className="card-icon"><SearchIcon /></div>
                <h3>Explain a concept</h3>
                <p>like quantum computing in simple terms.</p>
            </div>
            <div className="explore-card" onClick={() => handleExplorePromptClick('Help me debug this Python script that is supposed to scrape a website but is failing.')}>
                <div className="card-icon"><LogoIcon /></div>
                <h3>Help me debug</h3>
                <p>a Python script for web scraping.</p>
            </div>
            <div className="explore-card" onClick={() => handleExplorePromptClick('Plan a 5-day trip to the Japanese alps, focusing on hiking and nature.')}>
                <div className="card-icon"><PlusIcon /></div>
                <h3>Plan a trip</h3>
                <p>to the Japanese alps, focus on hiking and nature.</p>
            </div>
             <div className="explore-card" onClick={() => setActiveView('visigen-ai')}>
                <div className="card-icon"><VisiGenAIIcon /></div>
                <h3>VisiGen AI</h3>
                <p>Generate and edit images with powerful AI tools.</p>
            </div>
            <div className="explore-card" onClick={() => setActiveView('pixshop')}>
                <div className="card-icon"><CanvasIcon /></div>
                <h3>PixShop AI Editor</h3>
                <p>Edit your photos with powerful AI commands.</p>
            </div>
            <div className="explore-card" onClick={() => setActiveView('ai-headshot')}>
                <div className="card-icon"><PersonIcon /></div>
                <h3>AI Headshot</h3>
                <p>Generate a professional headshot from a photo.</p>
            </div>
             <div className="explore-card" onClick={() => setActiveView('logo-design')}>
                <div className="card-icon"><LogoIcon /></div>
                <h3>Logo Design</h3>
                <p>Create a stunning animated logo for your brand.</p>
            </div>
            <div className="explore-card" onClick={() => handleStartNewToolChat('book-writer')}>
                <div className="card-icon"><GuidedLearningIcon /></div>
                <h3>AI Book Writer</h3>
                <p>Co-create a book from idea to final draft with an AI partner.</p>
            </div>
            <div className="explore-card" onClick={() => setActiveView('reality-portal')}>
                <div className="card-icon"><RealityPortalIcon /></div>
                <h3>Reality Portal</h3>
                <p>Step inside your photos and explore them like living 3D worlds.</p>
            </div>
            <div className="explore-card" onClick={() => setActiveView('ai-calm-room')}>
                <div className="card-icon"><AICalmRoomIcon /></div>
                <h3>AI Calm Room</h3>
                <p>Relax, breathe, and heal your mind with AI-powered visuals & sounds.</p>
            </div>
        </div>
    </div>
  );

  return (
    <>
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <button className="sidebar-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} aria-label="Toggle sidebar">
            <MenuIcon />
          </button>
          <button className="sidebar-btn" onClick={handleNewChat}>
            <NewChatIcon /> <span>New Chat</span>
          </button>
          <button className="sidebar-btn" onClick={() => setActiveView('explore')}>
            <ExploreIcon /> <span>Explore</span>
          </button>
          <button className="sidebar-btn" onClick={() => setActiveView('live-chat')}>
            <LiveIcon /> <span>Live Conversation</span>
          </button>
           <div className="search-bar-container">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredChatOrder.map(id => (
            <div key={id} className={`history-item-wrapper ${id === activeChatId ? 'active' : ''}`}>
              <div
                role="button"
                tabIndex={0}
                className={`sidebar-btn history-item`}
                onClick={() => { if (renamingChatId !== id) { setActiveChatId(id); setActiveView('chat'); } }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (renamingChatId !== id) { setActiveChatId(id); setActiveView('chat'); }
                    }
                }}
                title={chats[id]?.title}
              >
                {renamingChatId === id ? (
                  <div className="rename-container">
                    <input
                      type="text"
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(id);
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      autoFocus
                    />
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleSaveRename(id); }}><SaveIcon /></button>
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleCancelRename(); }}><CancelIcon /></button>
                  </div>
                ) : (
                  <>
                    <span>{chats[id]?.title}</span>
                    <div className="history-item-menu-container">
                      <button className="icon-btn more-btn" onClick={(e) => handleHistoryMenuToggle(e, id)} aria-label="Chat options">
                          <MoreIcon />
                      </button>
                      {historyMenuChatId === id && (
                        <div className="dropdown-menu history-menu">
                          <button type="button" className="menu-item" onClick={(e) => { e.stopPropagation(); handleShareChat(id); }}>
                            <ShareIcon /><span>Share</span>
                          </button>
                          <button type="button" className="menu-item" onClick={(e) => { e.stopPropagation(); handleStartRename(id); }}>
                            <EditIcon /><span>Rename</span>
                          </button>
                          <button type="button" className="menu-item" onClick={(e) => { e.stopPropagation(); handleDeleteChat(id); }}>
                            <TrashIcon /><span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-btn" aria-label="Settings">
            <SettingsIcon /> <span>Settings</span>
          </button>
        </div>
      </aside>
      <div className="main-wrapper">
        <header className="header">
          <div className="header-left">
            <h1>{viewTitles[activeView]}</h1>
          </div>
          <div className="header-right">
            <button className="upgrade-btn"><UpgradeIcon /> <span>Upgrade</span></button>
            <div className="user-avatar">
              M
              <div className="notification-dot"></div>
            </div>
          </div>
        </header>
        <main className={`main-content ${['pixshop', 'ai-headshot', 'logo-design', 'visigen-ai', 'reality-portal', 'ai-calm-room'].includes(activeView) ? 'tool-view' : ''}`} ref={mainContentRef} onClick={handleMainContentClick}>
          {activeView === 'explore' ? (
            exploreViewContent
          ) : activeView === 'chat' ? (
            !isChatActive ? (
              <div className="initial-view">
                <h2><span>Hello, Manish</span></h2>
              </div>
            ) : (
              <div className="chat-view">
                {activeChatMessages.map((msg, index) => renderMessageContent(msg, index))}
              </div>
            )
          ) : activeView === 'pixshop' ? (
              <PixShopView />
          ) : activeView === 'ai-headshot' ? (
              <AIHeadshotView />
          ) : activeView === 'logo-design' ? (
              <AIAnimatedLogoDesignerView />
          ) : activeView === 'visigen-ai' ? (
              <VisiGenView />
          ) : activeView === 'reality-portal' ? (
              <RealityPortalView />
          ) : activeView === 'ai-calm-room' ? (
              <AICalmRoomView />
          ) : activeView === 'live-chat' ? (
            <div className="live-chat-view">
                <div className="live-status-indicator">
                    <span className={`status-dot ${liveStatus}`}></span>
                    <span className="status-text">{liveStatus.charAt(0).toUpperCase() + liveStatus.slice(1)}</span>
                </div>
                <div className="live-transcript-container">
                    {transcripts.length === 0 && (liveStatus === 'idle' || liveStatus === 'ended') && (
                        <div className="live-intro">
                            <LiveIcon />
                            <h2>Start a conversation</h2>
                            <p>Click the button below to talk with Gemini in real-time.</p>
                        </div>
                    )}
                     {transcripts.map((t, i) => (
                        <div key={i} className={`transcript-entry ${t.speaker}`}>
                            <span className="speaker-label">{t.speaker === 'user' ? 'You' : 'Gemini'}:</span>
                            <p>{t.text}</p>
                        </div>
                    ))}
                    {liveStatus === 'error' && (
                         <div className="live-error">
                            <p>Something went wrong. Please check your microphone permissions and try again.</p>
                        </div>
                    )}
                </div>
                <div className="live-controls">
                    <button 
                        className={`live-session-btn ${isLiveActive ? 'active' : ''}`}
                        onClick={handleToggleLiveSession}
                        disabled={liveStatus === 'connecting'}
                    >
                        {isLiveActive ? <StopLiveIcon /> : <LiveIcon />}
                        <span>{isLiveActive ? 'End Session' : liveStatus === 'connecting' ? 'Connecting...' : 'Start Session'}</span>
                    </button>
                </div>
            </div>
          ) : null}
        </main>
        {activeView === 'chat' && (
          <div className="input-area-wrapper">
            <div className="input-area-container">
                {isVideoGenMode && !hasSelectedApiKey && (
                    <div className="api-key-prompt">
                        <h3>Project API Key Required for VEO</h3>
                        <p>To generate videos, please select a project with the Gemini API enabled. For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">billing documentation</a>.</p>
                        <button onClick={handleSelectApiKey}>Select Project API Key</button>
                    </div>
                )}
              <form className="input-form" onSubmit={handleFormSubmit}>
                <div className="input-form-top">
                    {uploadedImage && (
                        <div className="image-chip-container">
                            <div className="image-chip">
                                <ImageIcon />
                                <span>{uploadedImage.name}</span>
                                <button type="button" onClick={() => setUploadedImage(null)}>&times;</button>
                            </div>
                        </div>
                    )}
                    {isDeepResearchMode && (
                         <div className="image-chip-container">
                            <div className="research-chip">
                                <SearchIcon />
                                <span>Deep Research Mode</span>
                                <button type="button" onClick={handleToggleDeepResearchMode}>&times;</button>
                            </div>
                        </div>
                    )}
                    {isImageGenMode && (
                         <div className="image-chip-container">
                            <div className="image-chip">
                                <ImageIcon />
                                <span>Image Generation Mode</span>
                                <button type="button" onClick={handleToggleImageGenMode}>&times;</button>
                            </div>
                            <div className="aspect-ratio-toggle">
                                {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ar => (
                                    <button type="button" key={ar} className={imageAspectRatio === ar ? 'active' : ''} onClick={() => setImageAspectRatio(ar)}>{ar}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {isVideoGenMode && (
                         <div className="video-chip-container">
                            <div className="image-chip">
                                <VideoIcon />
                                <span>Video Generation Mode</span>
                                <button type="button" onClick={handleToggleVideoGenMode}>&times;</button>
                            </div>
                            <div className="aspect-ratio-toggle">
                                {(['16:9', '9:16'] as const).map(ar => (
                                    <button type="button" key={ar} className={videoAspectRatio === ar ? 'active' : ''} onClick={() => setVideoAspectRatio(ar)}>{ar}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }}
                        placeholder={isImageGenMode ? "Describe the image you want to create..." : isVideoGenMode ? "Describe the video you want to create..." : "Enter a prompt here"}
                        rows={1}
                        disabled={isLoading}
                    ></textarea>
                </div>
                <div className="input-form-bottom">
                    <div className="bottom-left">
                        <div className="tools-menu-container">
                            <button ref={toolsBtnRef} className={`tools-btn ${isDeepResearchMode || isImageGenMode || isVideoGenMode ? 'active' : ''}`} onClick={() => setIsToolsMenuOpen(o => !o)} aria-label="Tools">
                                <ToolsIcon />
                            </button>
                             {isToolsMenuOpen && (
                                <div ref={toolsMenuRef} className="dropdown-menu tools-menu">
                                    <button type="button" className="menu-item" onClick={handleToggleDeepResearchMode}>
                                        <SearchIcon /> <span>Deep Research</span>
                                    </button>
                                     <button type="button" className="menu-item" onClick={handleToggleImageGenMode}>
                                        <ImageIcon /> <span>Generate Image</span>
                                    </button>
                                    <button type="button" className="menu-item" onClick={handleToggleVideoGenMode}>
                                        <VideoIcon /> <span>Generate Video</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="icon-btn" onClick={handleUploadClick} aria-label="Attach image" disabled={isImageGenMode || isDeepResearchMode || isVideoGenMode}>
                            <ImageIcon />
                        </button>
                    </div>

                    <div className="bottom-right">
                        <div className="model-selector-container">
                            <div ref={modelBtnRef} className="model-selector" onClick={() => setIsModelMenuOpen(o => !o)} role="button" tabIndex={0}>
                                <span>{modelDisplayNames[activeModel]}</span>
                                <DropdownIcon />
                            </div>
                            {isModelMenuOpen && (
                                <div ref={modelMenuRef} className="dropdown-menu model-menu">
                                    <button type="button" className="menu-item" onClick={() => handleModelChange('gemini-2.5-flash')}>2.5 Flash</button>
                                    <button type="button" className="menu-item" onClick={() => handleModelChange('gemini-2.5-pro')}>2.5 Pro</button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleMicClick} className={`icon-btn ${isRecording ? 'recording' : ''}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
                            <MicIcon />
                        </button>
                        <button type="submit" className="icon-btn" aria-label="Send prompt" disabled={isLoading || (!prompt.trim() && !uploadedImage)}>
                            <SendIcon />
                        </button>
                    </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);