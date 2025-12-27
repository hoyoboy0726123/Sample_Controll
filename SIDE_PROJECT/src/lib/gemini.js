import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

export const initGemini = (apiKey) => {
  genAI = new GoogleGenerativeAI(apiKey);
};

// 向量化功能 (text-embedding-004)
export const getEmbedding = async (text) => {
  if (!genAI) throw new Error("Gemini 未初始化，請先輸入 API Key");
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
};

// 取得可用模型清單
export const fetchAvailableModels = async (apiKey) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) throw new Error('API Key 無效或網路錯誤');
    const data = await response.json();
    
    // 過濾出支援 'generateContent' 的模型 (即聊天模型)
    return data.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', '')); // 去掉前綴，只留名稱
  } catch (error) {
    throw new Error("無法取得模型清單: " + error.message);
  }
};

// 聊天功能 (動態模型)
export const chatWithGemini = async (modelName, prompt, contextChunks, history = []) => {
  if (!genAI) throw new Error("Gemini 未初始化");
  
  const model = genAI.getGenerativeModel({ model: modelName }); 

  // Format chunks
  const contextText = contextChunks.map(c => `[參考資訊]: ${c.content}`).join("\n\n");
  
  // Format history
  const historyText = history.slice(-6).map(msg => 
    `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
  ).join("\n");

  const fullPrompt = `
你是一個專業的 RAG 知識庫助手。請根據以下提供的[參考資訊]與[對話歷史]來回答[使用者問題]。

規則：
1. 請優先依據[參考資訊]回答。
2. 如果參考資訊不足以回答，請明確告知「知識庫中無相關資訊」，不要編造。
3. 請使用 Markdown 格式回答，若有數據請整理成表格。

[對話歷史]:
${historyText}

[參考資訊]:
${contextText}

[使用者問題]:
${prompt}
  `;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
};

// 聊天功能 (單檔全解析 - Inline Data)
export const chatWithInlineFile = async (modelName, prompt, fileBase64, mimeType, history = []) => {
  if (!genAI) throw new Error("Gemini 未初始化");
  
  const model = genAI.getGenerativeModel({ model: modelName }); 

  // Construct history for inline mode
  // Note: We need to be careful not to send the fileBase64 in every history turn if not needed, 
  // but for Gemini 1.5, usually the file is part of the system context or first user message.
  // Here we will attach the file to the current request for simplicity, 
  // or ideally, keep it in the chat session.
  
  // Strategy:
  // For the very first message or single-turn QA, we send [file, text].
  // For chat history, we normally use `startChat`. 
  // But to keep it simple and stateless here:
  // We will construct a 'parts' array.
  
  const parts = [
    {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType
      }
    },
    { text: prompt }
  ];

  // If there is history, we might need a more complex ChatSession approach.
  // But for "Ask Document", usually we treat the document as context for the current turn.
  // Let's use `startChat` for better multi-turn experience with the file.
  
  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  });

  const result = await chat.sendMessage(parts);
  const response = await result.response;
  return response.text();
};

// 意圖分析與查詢改寫 (使用 Flash 模型以求速度)
export const analyzeQueryIntent = async (query, history) => {
  if (!genAI) return { type: 'search', newQuery: query };
  
  // Use a fast model for routing
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const historyText = history.slice(-4).map(msg => 
    `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
  ).join("\n");

  const prompt = `
Analyzing the user's latest query in the context of the conversation history.

History:
${historyText}

User Query: "${query}"

Task:
1. Determine intent: 
   - 'search': Needs to retrieve new info from documents (e.g. asking for facts, numbers, specific content).
   - 'chat': General chat, greeting, or asking for clarification/summarization of *previous* answer without needing new docs.
2. If 'search', rewrite the User Query to be standalone and specific, resolving any pronouns (it, they, that) based on history.

Output JSON only: { "type": "search" | "chat", "newQuery": "..." }
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean up markdown code blocks if any
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Intent analysis failed:", e);
    return { type: 'search', newQuery: query }; // Fallback
  }
};
