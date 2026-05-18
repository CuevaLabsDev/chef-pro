import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

export function getModel(modelName = "gemini-2.0-flash") {
  return getGenAI().getGenerativeModel({ model: modelName });
}
