
import { GoogleGenAI, Part, Content } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export async function* streamChatResponse(prompt: string, history: Content[], image?: File) {
    const currentUserMessageParts: Part[] = [];
    
    if (image) {
        const imagePart = await fileToGenerativePart(image);
        currentUserMessageParts.push(imagePart);
    }
    
    if (prompt) {
        currentUserMessageParts.push({ text: prompt });
    }

    if (currentUserMessageParts.length === 0) {
        return;
    }

    const contents: Content[] = [...history, { role: 'user', parts: currentUserMessageParts }];

    const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
    });

    for await (const chunk of result) {
        yield chunk.text;
    }
}
