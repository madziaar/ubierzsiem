/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: 'garment' | 'accessory';
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: Part[];
  groundingChunks?: any[];
}
