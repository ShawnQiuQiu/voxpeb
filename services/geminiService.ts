import { GoogleGenAI } from "@google/genai";
import { FirmwareConfig } from "../types";

// Helper to get the AI client safely. 
// We initialize it lazily so the app doesn't crash on load if the key is missing.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates a Voxel/Minecraft style 2D concept image for the robot.
 * In a real app, this would feed into an Image-to-3D backend.
 */
export const generateRobotPreview = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const fullPrompt = `Design a 3D printable casing for an M5Stack Core S3 (54mm x 54mm square module).
    The casing should look like a cute pocket monster or Pokemon-style character.
    CRITICAL REQUIREMENT: The character MUST incorporate a clearly visible square 54mm x 54mm screen frame/cavity on its belly or face to embed the device.
    Style: Voxel Art, MagicaVoxel, Minecraft aesthetic. Cute, colorful, toy-like.
    Character Description: ${prompt}. 
    Render context: White background, studio lighting, isometric view, high definition 3D render.`;

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001', // Using Imagen for better adherence to specific art styles
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

/**
 * Generates the "System Prompt" (The Brain) for the AI coach.
 */
export const generateFirmwareSystemPrompt = async (config: FirmwareConfig): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
    You are an expert Prompt Engineer for an AI Education Agent.
    
    Task: Create a complex, structured "System Instruction" (System Prompt) for an embedded AI English Coach named "${config.name}".
    
    Configuration Parameters:
    - Role: Physical AI Robot (Stack-chan/M5Stack)
    - Personality: ${config.personalityType}
    - Voice/Tone: ${config.voice}
    - Teaching Focus: ${config.focusArea}
    - Error Correction Style: ${config.correctionStyle}
    - Language Mode: ${config.languageRatio}
    - CEFR Level: ${config.level}

    Requirements:
    1. The output must be the raw system prompt text that will be flashed into the firmware.
    2. Include specific instructions on how to behave physically (e.g., "When user makes a mistake, shake head slightly" - note: output text commands like [SHAKE_HEAD] for the hardware).
    3. Define how to encourage the user based on the "${config.personalityType}" personality.
    4. Keep the response concise but highly effective for an LLM context.
    
    Output ONLY the system prompt text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Failed to generate system prompt.";
  } catch (error) {
    console.error("Gemini Text Gen Error:", error);
    return "Error connecting to AI Brain service. Please check API Key.";
  }
};