/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon, SparklesIcon, ScissorsIcon, XIcon } from './icons';
import { generateGarmentImage, segmentGarment, extractGarment } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  setWardrobe: React.Dispatch<React.SetStateAction<WardrobeItem[]>>;
  onRemoveItem: (itemId: string) => void;
}

// Helper to convert image URL to a File object using a canvas to bypass potential CORS issues.
const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = (error) => {
            console.error('[CORS Check] Failed to load and convert wardrobe item from URL:', url, 'The browser\'s console should have a specific CORS error message if that\'s the issue.');
            reject(new Error(`Could not load image from URL for canvas conversion. Error: ${error}`));
        };

        image.src = url;
    });
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe, setWardrobe, onRemoveItem }) => {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [wardrobeError, setWardrobeError] = useState<string | null>(null);
    const [garmentPrompt, setGarmentPrompt] = useState('');
    const [isGeneratingGarment, setIsGeneratingGarment] = useState(false);
    const [splittingItemId, setSplittingItemId] = useState<string | null>(null);
    const [splittingMessage, setSplittingMessage] = useState('');
    const [generationCategory, setGenerationCategory] = useState<'garment' | 'accessory'>('garment');
    
    const { garments, accessories } = useMemo(() => {
        return wardrobe.reduce((acc, item) => {
            if (item.category === 'accessory') {
                acc.accessories.push(item);
            } else {
                acc.garments.push(item);
            }
            return acc;
        }, { garments: [] as WardrobeItem[], accessories: [] as WardrobeItem[] });
    }, [wardrobe]);


    const handleGenerateGarment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!garmentPrompt.trim() || isLoading || isGeneratingGarment) return;

        setGenerationError(null);
        setWardrobeError(null);
        setIsGeneratingGarment(true);
        try {
            const imageDataUrl = await generateGarmentImage(garmentPrompt, generationCategory);
            
            const newItem: WardrobeItem = {
                id: `generated-${Date.now()}`,
                name: garmentPrompt,
                url: imageDataUrl,
                category: generationCategory,
            };

            const garmentFile = await urlToFile(imageDataUrl, newItem.name);
            onGarmentSelect(garmentFile, newItem);
            setGarmentPrompt('');

        } catch (err) {
            setGenerationError(getFriendlyErrorMessage(err, 'Failed to generate item'));
        } finally {
            setIsGeneratingGarment(false);
        }
    };

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || isGeneratingGarment || splittingItemId || activeGarmentIds.includes(item.id)) return;
        setWardrobeError(null);
        setGenerationError(null);
        try {
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item);
        } catch (err) {
            const detailedError = `Failed to load and convert wardrobe item from URL: ${item.url}. The browser's console should have a specific CORS error message if that's the issue.`;
            setWardrobeError(detailedError);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, category: 'garment' | 'accessory') => {
        if (e.target.files && e.target.files[0]) {
            setWardrobeError(null);
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setWardrobeError('Please select an image file.');
                return;
            }
            const customItemInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                category: category,
            };
            onGarmentSelect(file, customItemInfo);
        }
    };

    const handleSplitGarment = async (itemToSplit: WardrobeItem) => {
        setSplittingItemId(itemToSplit.id);
        setSplittingMessage('Segmenting clothing items...');
        setWardrobeError(null);
        try {
            const garmentFile = await urlToFile(itemToSplit.url, itemToSplit.name);
            const garmentNames = await segmentGarment(garmentFile);

            if (garmentNames.length <= 1) {
                setWardrobeError("AI could not find multiple items to split in this image.");
                return;
            }
            
            setSplittingMessage(`Found ${garmentNames.length} items. Extracting...`);

            const newItems: WardrobeItem[] = [];
            // Use Promise.all to extract all garments concurrently for better performance
            await Promise.all(garmentNames.map(async (name) => {
                const newGarmentDataUrl = await extractGarment(itemToSplit.url, name);
                newItems.push({
                    id: `split-${itemToSplit.id}-${name.replace(/\s+/g, '-')}-${Date.now()}`,
                    name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
                    url: newGarmentDataUrl,
                    category: 'garment', // Split items are garments
                });
            }));

            // Update wardrobe state: remove old item, add new items
            setWardrobe(prevWardrobe => [
                ...prevWardrobe.filter(item => item.id !== itemToSplit.id),
                ...newItems
            ]);

        } catch (err) {
            setWardrobeError(getFriendlyErrorMessage(err, 'Failed to split garment'));
        } finally {
            setSplittingItemId(null);
            setSplittingMessage('');
        }
    };

  const renderWardrobeGrid = (items: WardrobeItem[], category: 'garment' | 'accessory') => (
    <div className="grid grid-cols-3 gap-3">
        {items.map((item) => {
            const isActive = activeGarmentIds.includes(item.id);
            const isSplittable = item.category === 'garment' && (item.id.startsWith('custom-') || item.id.startsWith('generated-')) && !item.id.startsWith('split-');
            const isCustom = item.id.startsWith('custom-') || item.id.startsWith('generated-') || item.id.startsWith('split-');

            return (
                <div key={item.id} className="relative group">
                    <button
                        onClick={() => handleGarmentClick(item)}
                        disabled={isLoading || isGeneratingGarment || !!splittingItemId || isActive}
                        className="aspect-square w-full border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Select ${item.name}`}
                    >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                        </div>
                        {isActive && (
                            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                        {splittingItemId === item.id && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-2">
                                <Spinner />
                                <p className="text-xs font-semibold text-gray-700 mt-2">{splittingMessage}</p>
                            </div>
                        )}
                    </button>
                     {isCustom && !isActive && (
                         <button
                            onClick={() => onRemoveItem(item.id)}
                            disabled={isLoading || isGeneratingGarment || !!splittingItemId}
                            className="absolute top-1 left-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-full text-red-500 hover:bg-white hover:text-red-700 transition-all scale-90 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            title="Remove from wardrobe"
                         >
                            <XIcon className="w-4 h-4" />
                         </button>
                    )}
                    {isSplittable && !isActive && (
                         <button
                            onClick={() => handleSplitGarment(item)}
                            disabled={isLoading || isGeneratingGarment || !!splittingItemId}
                            className="absolute top-1 right-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-full text-gray-700 hover:bg-white hover:text-gray-900 transition-all scale-90 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Split into separate items"
                         >
                            <ScissorsIcon className="w-4 h-4" />
                         </button>
                    )}
                </div>
            );
        })}
        <label htmlFor={`custom-${category}-upload`} className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${isLoading || isGeneratingGarment || !!splittingItemId ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 hover:text-gray-600 cursor-pointer'}`}>
            <UploadCloudIcon className="w-6 h-6 mb-1"/>
            <span className="text-xs text-center">Upload</span>
            <input id={`custom-${category}-upload`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={(e) => handleFileChange(e, category)} disabled={isLoading || isGeneratingGarment || !!splittingItemId}/>
        </label>
    </div>
  );

  return (
    <div className="pt-6 border-t border-gray-400/50">
        <div className="mb-6 relative">
            {isGeneratingGarment && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg p-4">
                    <Spinner />
                    <p className="text-sm font-semibold text-gray-700 mt-2 text-center">Creating item from prompt...</p>
                </div>
            )}
            <h3 className="text-lg font-serif tracking-wider text-gray-800 mb-3">Create with AI</h3>
            <div className="flex items-center gap-2 mb-3">
                <button 
                    onClick={() => setGenerationCategory('garment')}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${generationCategory === 'garment' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'}`}
                >
                    Garment
                </button>
                <button 
                    onClick={() => setGenerationCategory('accessory')}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${generationCategory === 'accessory' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'}`}
                >
                    Accessory
                </button>
            </div>
            <form onSubmit={handleGenerateGarment}>
                <textarea
                    value={garmentPrompt}
                    onChange={(e) => setGarmentPrompt(e.target.value)}
                    placeholder={generationCategory === 'garment' ? "e.g., 'A stylish red leather jacket'..." : "e.g., 'A pair of black sunglasses'..."}
                    className="w-full h-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-shadow resize-none"
                    disabled={isLoading || isGeneratingGarment || !!splittingItemId}
                />
                <button
                    type="submit"
                    disabled={isLoading || isGeneratingGarment || !!splittingItemId || !garmentPrompt.trim()}
                    className="mt-2 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate {generationCategory === 'garment' ? 'Garment' : 'Accessory'}
                </button>
                 {generationError && <p className="text-red-500 text-sm mt-2">{generationError}</p>}
            </form>
        </div>
        
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Garments</h2>
                {renderWardrobeGrid(garments, 'garment')}
            </div>
            <div>
                <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Accessories</h2>
                {renderWardrobeGrid(accessories, 'accessory')}
            </div>
        </div>

        {wardrobeError && <p className="text-red-500 text-sm mt-4">{wardrobeError}</p>}
    </div>
  );
};

export default WardrobePanel;