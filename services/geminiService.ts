
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type, Content } from "@google/genai";
import { WardrobeItem, ChatMessage, Part } from "../types";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        let errorMessage = `Request was blocked by safety filters. Reason: ${blockReason}.`;
        if (blockReasonMessage) {
            errorMessage += ` ${blockReasonMessage}`;
        }
        // Provide guidance based on common block reasons
        if (blockReason === 'SAFETY') {
            errorMessage += ` Please try adjusting your prompt or image to be less ambiguous, less sensitive, or more specific.`;
        }
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings or resource limits. Please try a different prompt or image.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    let errorMessage = `The AI model did not return an image. This can happen due to safety filters, if the request is too complex, or if the model could not fulfill the request.`;
    if (textFeedback) {
        errorMessage += ` The model responded with text: "${textFeedback}".`;
    } else {
        errorMessage += ` Please try a different image or prompt.`;
    }
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const imageModel = 'gemini-2.5-flash-image';
const textModel = 'gemini-2.5-flash';

export const generateModelImage = async (userImage: File, expression: string): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = `You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for a virtual try-on application. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a natural and authentic ${expression.toLowerCase()} expression. Avoid a blank, 'doll-like', or overly neutral stare. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The model in the output image must be wearing simple, neutral-colored underwear (e.g. a simple bra and briefs). The final image must be photorealistic. Return ONLY the final image.`;
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, itemImage: File, itemCategory: WardrobeItem['category']): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const itemImagePart = await fileToPart(itemImage);

    const garmentPrompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Garment Placement:** Intelligently place the new garment from the 'garment image' onto the person in the 'model image'. If the new garment is a top (shirt, jacket, etc.), it should replace any existing top. If it's a bottom (pants, skirt), it should replace any existing bottom. The new garment should layer realistically over any existing clothing that would naturally be worn underneath (e.g., a jacket over a shirt).
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Preserve the Background:** The entire background from the 'model image' MUST be preserved perfectly.
4.  **Master-Level Digital Tailoring (Crucial)::** The final image must be indistinguishable from a real photograph. The garment's fit is paramount.
    *   **Fabric Physics Simulation:** Go beyond a simple drape. Simulate the specific weight, stiffness, and texture of the fabric. Denim should show its characteristic rigidity and seam puckering. Silk should have soft, flowing folds and specular highlights. Cotton should have fine, subtle wrinkles.
    *   **Anatomically Correct Conformance:** The garment must conform to the underlying human form with extreme precision. It should show tension where the fabric is stretched over the body (e.g., shoulders, chest, hips) and compression with realistic folds where the body bends (e.g., inside of elbows, waist).
    *   **Photorealistic Texture and Lighting:** The garment's texture must be perfectly preserved and mapped onto the draped form. Light must interact with this texture realistically—creating subtle shadows within the weave of a knit sweater or a sharp sheen on leather. Shadows cast by the body onto the garment, and by the garment's folds onto itself, must be soft, accurate, and perfectly consistent with the single light source of the original 'model image'.
5.  **Safety First:** The final image must be appropriate for a general audience and e-commerce. It must not contain nudity. If a garment is revealing, the person must still be depicted with appropriate coverage (e.g., wearing neutral underwear underneath).
6.  **Output:** Return ONLY the final, edited image. Do not include any text.`;
    
    const accessoryPrompt = `You are an expert virtual try-on AI. You will be given a 'model image' and an 'accessory image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the accessory from the 'accessory image'.

**Crucial Rules:**
1.  **Accessory Placement:** Intelligently and realistically place the accessory on the person. 
    *   Hats, beanies, or headwear go on the head.
    *   Sunglasses or eyewear go on the face, over the eyes.
    *   Bags or purses should be held in the hand or worn over the shoulder, in a manner that fits the model's pose.
    *   Jewelry (necklaces, earrings) should be placed appropriately.
2.  **ADD, DON'T REPLACE:** The accessory must be ADDED to the person. Do NOT replace any of the existing clothing. Layer the accessory realistically on top of the current outfit.
3.  **Preserve Everything Else:** The person's face, hair, body shape, pose, and all existing clothing from the 'model image' MUST remain unchanged, except where obscured by the new accessory. The background must also be preserved.
4.  **Realism is Key:** The final image must be indistinguishable from a real photograph. The accessory must be scaled correctly and integrated with the scene's lighting, casting soft, accurate shadows on the model and their clothing.
5.  **Safety First:** The final image must be appropriate for a general audience.
6.  **Output:** Return ONLY the final, edited image. Do not include any text.`;

    const prompt = itemCategory === 'accessory' ? accessoryPrompt : garmentPrompt;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [modelImagePart, itemImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Your task is to change the pose of the person in the image while keeping everything else identical.

**Instructions:**
1.  **Preserve Identity:** The person's face, features, and body type MUST remain the same.
2.  **Preserve Outfit:** The person's clothing and accessories MUST be perfectly preserved. Do not add, remove, or alter any part of the outfit.
3.  **Preserve Background:** The background style and elements must remain identical.
4.  **New Pose:** Regenerate the image from a new perspective: "${poseInstruction}".
5.  **Safety:** The final image must be safe for work, appropriate for a general audience, and MUST NOT contain any nudity or suggestive content. The person must remain fully and appropriately clothed as they are in the original image.
6.  **Output:** Return ONLY the final, photorealistic image.`;
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

export const editImageWithPrompt = async (baseImageUrl: string, prompt: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const instruction = `You are an expert AI photo editor. Apply the following edit to the image: "${prompt}". 
    - You MUST preserve the person's identity, face, and body shape.
    - Edit ONLY what is requested in the prompt. Do not change other elements of the image unless necessary to fulfill the request.
    - The final image must be photorealistic and blend seamlessly with the original.
    - The final image must be safe for work and not contain any nudity.
    - Return ONLY the final, edited image.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [baseImagePart, { text: instruction }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

export const generateGarmentImage = async (prompt: string, category?: WardrobeItem['category']): Promise<string> => {
    let instruction = '';
    if (category === 'accessory') {
        instruction = `Generate a photorealistic, high-resolution image of the following accessory: "${prompt}". 
        - The item MUST be presented on a clean, solid, light gray studio background (#f0f0f0).
        - The image should be in a standard e-commerce style: well-lit, and centered.
        - There must be NO models, mannequins, hangers, or any other objects in the image. Only the accessory itself.
        - The output must be ONLY the image.`;
    } else { // Default to garment
        instruction = `Generate a photorealistic, high-resolution image of the following clothing item: "${prompt}". 
        - The item MUST be presented on a clean, solid, light gray studio background (#f0f0f0).
        - The image should be in a standard e-commerce style: front-facing, well-lit, and centered.
        - There must be NO models, mannequins, hangers, or any other objects in the image. Only the clothing item itself.
        - The output must be ONLY the image.`;
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: instruction,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("The AI model did not return an image. This can happen due to safety filters or if the request is too complex.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const segmentGarment = async (garmentImage: File): Promise<string[]> => {
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `You are a meticulous fashion expert AI specializing in garment analysis for e-commerce. Your task is to analyze the provided image and identify all distinct, primary, and separable clothing items.

**Instructions:**
1.  **Identify Primary Garments ONLY:** Focus exclusively on major clothing items like 'shirt', 'trousers', 'jacket', 'dress', 'skirt', 'shorts', 'coat', 'sweater', 'blouse', 'jeans', 'pants', etc.
2.  **Exclude Accessories & Sub-items:** Do NOT identify accessories such as belts, jewelry, hats, bags, shoes, glasses, or other small items. Do not identify parts of clothing like 'collar', 'sleeve', 'pocket', etc. Only complete, separable garments.
3.  **Handle Single Items:** If the image clearly shows a single, unified item (e.g., a dress, a jumpsuit, a single coat), identify it as one item.
4.  **Handle Multiple Items:** If the image shows a combined outfit consisting of multiple distinct and separable garments (e.g., a shirt and pants, a suit with a jacket and trousers), identify EACH separable item individually.
5.  **Output Format:** Return a JSON array of strings, with each string being the lowercase name of a single identified garment. Ensure there are no duplicates.

**Examples:**
-   An image of a suit -> \`["blazer", "trousers"]\`
-   An image of a t-shirt and jeans -> \`["t-shirt", "jeans"]\`
-   An image of a single red dress -> \`["dress"]\`
-   An image of a winter coat -> \`["coat"]\`
-   An image of a shirt with a belt -> \`["shirt"]\` (belt is excluded)
-   An image with a dress and a jacket -> \`["dress", "jacket"]\`

**Crucially:** If you find only one item, return an array containing that single item. If no discernible clothing (as per the above rules) is found, return an empty array.`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [garmentImagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                description: "A list of distinct clothing items found in the image.",
                items: {
                    type: Type.STRING,
                    description: 'The name of a single clothing item.'
                }
            },
        },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) {
        throw new Error("Model returned an empty response for garment segmentation. Please try an image with clear clothing items.");
    }
    try {
        const result = JSON.parse(jsonText);
        // Ensure unique, non-empty strings and convert to array if not already.
        const cleanedResult = Array.isArray(result) 
            ? Array.from(new Set(result.map(s => String(s).trim()).filter(s => s.length > 0))) 
            : [];
        return cleanedResult;
    } catch (e) {
        throw new Error("Failed to parse AI response for garment segmentation. Please ensure the image clearly shows distinct clothing items.");
    }
};

export const extractGarment = async (originalImageUrl: string, garmentNameToExtract: string): Promise<string> => {
    const originalImagePart = dataUrlToPart(originalImageUrl);
    const prompt = `You are an expert AI graphic designer specializing in pixel-perfect product image extraction for fashion e-commerce. Your task is to isolate and extract a specific clothing item from a larger image.

**Instructions:**
1.  **Target Item:** From the provided image, precisely and completely extract the ONLY the item named: '${garmentNameToExtract}'. Ensure it's the *entire* item.
2.  **Pixel-Perfect Masking:** Create a perfect cutout of the garment. The edges must be clean and smooth, following the item's natural contours. Avoid any jagged or blurry edges.
3.  **Transparent Background:** The output image MUST have a fully transparent background (alpha channel). Remove all original background pixels and any other clothing items or objects not explicitly requested.
4.  **Preserve Detail:** The garment's original texture, color, and internal details (seams, buttons, patterns) must be perfectly preserved.
5.  **Lighting and Shadows:** Retain the natural form shadows and lighting ON the garment itself. Do NOT include any shadows the garment was casting onto the background or other items.
6.  **Positioning:** Present the extracted garment clearly, centrally, and with a good scale, as if it were a standalone product image.

**Output:** Return ONLY the final, high-quality image of the extracted garment on a transparent background.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [originalImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

const mapValueToDescription = (value: number, type: 'build' | 'shape'): string => {
    if (value === 0) return 'No change in ' + type + '.';
    const intensity = Math.abs(value) > 70 ? 'significantly' : Math.abs(value) > 30 ? 'moderately' : 'slightly';
    if (type === 'build') {
        return value > 0 ? `Give the model a ${intensity} broader build.` : `Give the model a ${intensity} slimmer build.`;
    }
    // type === 'shape'
    return value > 0 ? `Give the model a ${intensity} curvier, more hourglass shape.` : `Give the model a ${intensity} straighter, more athletic shape.`;
};

export const adjustModelBody = async (baseImageUrl: string, adjustments: { build: number; shape: number }): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    
    const buildDescription = mapValueToDescription(adjustments.build, 'build');
    const shapeDescription = mapValueToDescription(adjustments.shape, 'shape');

    const prompt = `You are a master digital artist specializing in subtle, photorealistic body proportion adjustments. You will be given an image of a fashion model and instructions to adjust their body.

**Crucial Rules:**
1.  **Preserve Identity:** The person's face, hair, skin tone, and unique features MUST remain completely unchanged.
2.  **Preserve Clothing & Background:** The model's clothing (neutral underwear) and the neutral studio background must be perfectly preserved.
3.  **SFW Adjustments ONLY:** All adjustments must be subtle, natural, and strictly safe-for-work, suitable for a general fashion application. DO NOT generate any nudity or explicit content. The model must remain clothed in the same simple underwear.
4.  **Apply Adjustments:**
    - ${buildDescription}
    - ${shapeDescription}
5.  **Output:** Return ONLY the final, photorealistic image.`;

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [baseImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return handleApiResponse(response);
};

export const generateChatStream = async (
    history: Content[],
    newMessage: ChatMessage,
    config: { useSearch: boolean; useThinkingMode: boolean }
) => {
    const { useSearch, useThinkingMode } = config;

    let model = 'gemini-2.5-flash';
    const generationConfig: any = {}; // Use `GenerateContentParameters['config']` type for better safety
    const tools: any[] = []; // Use `Tool` type

    if (useSearch) {
        tools.push({ googleSearch: {} });
    }

    if (useThinkingMode) {
        model = 'gemini-2.5-pro';
        generationConfig.thinkingConfig = { thinkingBudget: 32768 };
    }

    const contents = [...history, { role: newMessage.role, parts: newMessage.parts }];

    // The Gemini API expects 'config' as a top-level property,
    // and both 'tools' and 'generationConfig' go inside it.
    const finalConfig: any = {};
    if (tools.length > 0) {
        finalConfig.tools = tools;
    }
    if (Object.keys(generationConfig).length > 0) {
        Object.assign(finalConfig, generationConfig);
    }


    const response = await ai.models.generateContentStream({
        model,
        contents,
        ...(Object.keys(finalConfig).length > 0 && { config: finalConfig }),
    });

    return response;
};

export const generateSpeech = async (textToSpeak: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
          },
        },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (audioPart?.inlineData?.data) {
        return audioPart.inlineData.data;
    }

    throw new Error("The AI model did not return audio data.");
};
