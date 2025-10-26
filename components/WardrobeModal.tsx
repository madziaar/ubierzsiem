
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useCallback } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon, SparklesIcon, ScissorsIcon, XIcon, ShirtIcon, TagIcon, LayoutGridIcon } from './icons'; // Added new icons
import { generateGarmentImage, segmentGarment, extractGarment } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';


interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean; // Main app loading state
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

            // Attempt to use original image format if available, otherwise default to PNG
            let mimeType = 'image/png'; 
            if (url.includes('.jpeg') || url.includes('.jpg')) mimeType = 'image/jpeg';
            else if (url.includes('.webp')) mimeType = 'image/webp';

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, mimeType); // Use determined mimeType for consistency
        };

        image.onerror = (error) => {
            console.error('[CORS Check] Failed to load and convert wardrobe item from URL:', url, 'The browser\'s console should have a specific CORS error message if that\'s the issue.');
            reject(new Error(`Could not load image from URL for canvas conversion. Error: ${error}`));
        };

        image.src = url;
    });
};

type FilterCategory = 'all' | 'garment' | 'accessory';

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe, setWardrobe, onRemoveItem }) => {
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [wardrobeError, setWardrobeError] = useState<string | null>(null);
    const [garmentPrompt, setGarmentPrompt] = useState('');
    const [isGeneratingGarment, setIsGeneratingGarment] = useState(false);
    const [splittingItemId, setSplittingItemId] = useState<string | null>(null);
    const [splittingMessage, setSplittingMessage] = useState('');
    const [generationCategory, setGenerationCategory] = useState<'garment' | 'accessory'>('garment');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all'); // New state for filtering

    const filteredWardrobe = useMemo(() => {
        if (filterCategory === 'all') {
            return wardrobe;
        }
        return wardrobe.filter(item => item.category === filterCategory);
    }, [wardrobe, filterCategory]);

    const handleGenerateGarment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!garmentPrompt.trim() || isLoading || isGeneratingGarment || !!splittingItemId) return;

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

            const filename = `${newItem.name.replace(/\s/g, '_')}.${imageDataUrl.split(';')[0].split('/')[1] || 'png'}`;
            const garmentFile = await urlToFile(imageDataUrl, filename);
            onGarmentSelect(garmentFile, newItem); // Automatically add to stack
            setGarmentPrompt('');

        } catch (err) {
            setGenerationError(getFriendlyErrorMessage(err, 'Failed to generate item'));
        } finally {
            setIsGeneratingGarment(false);
        }
    };

    const handleGarmentClick = useCallback(async (item: WardrobeItem) => {
        if (isLoading || isGeneratingGarment || !!splittingItemId || activeGarmentIds.includes(item.id)) return;
        setWardrobeError(null);
        setGenerationError(null);
        try {
            const file = await urlToFile(item.url, `${item.name.replace(/\s/g, '_')}.${item.url.split('.').pop() || 'png'}`);
            onGarmentSelect(file, item);
        } catch (err) {
            const detailedError = getFriendlyErrorMessage(err, `Failed to load and convert wardrobe item '${item.name}'`);
            setWardrobeError(detailedError);
        }
    }, [isLoading, isGeneratingGarment, splittingItemId, activeGarmentIds, onGarmentSelect]);
    
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, category: 'garment' | 'accessory') => {
        if (isLoading || isGeneratingGarment || !!splittingItemId) return; // Block during other operations
        if (e.target.files && e.target.files[0]) {
            setWardrobeError(null);
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setWardrobeError('Please select an image file (PNG, JPEG, WEBP, AVIF, HEIC, HEIF).');
                return;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setWardrobeError("File size exceeds 10MB. Please choose a smaller file.");
                return;
            }

            const customItemInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name.split('.').slice(0, -1).join('.'), // Remove extension for display name
                url: URL.createObjectURL(file),
                category: category,
            };
            onGarmentSelect(file, customItemInfo);
            // Clear the input so the same file can be selected again if needed
            e.target.value = ''; 
        }
    }, [isLoading, isGeneratingGarment, splittingItemId, onGarmentSelect]);

    const handleSplitGarment = useCallback(async (itemToSplit: WardrobeItem) => {
        if (isLoading || isGeneratingGarment || !!splittingItemId) return; // Block during other operations
        setSplittingItemId(itemToSplit.id);
        setSplittingMessage('Segmenting clothing items...');
        setWardrobeError(null);
        try {
            const garmentFile = await urlToFile(itemToSplit.url, itemToSplit.name);
            const garmentNames = await segmentGarment(garmentFile);

            if (!garmentNames || garmentNames.length === 0) {
                setWardrobeError("AI could not find any distinct clothing items to split in this image. Please try an image with clear, separable garments.");
                return;
            }
            if (garmentNames.length === 1 && garmentNames[0].toLowerCase() === itemToSplit.name.toLowerCase()) {
                 setWardrobeError("AI found only one item, which is the original. No further splitting possible.");
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
                    category: 'garment', // Split items are typically garments
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
    }, [isLoading, isGeneratingGarment, splittingItemId, setWardrobe]);

    const globalBlocker = isLoading || isGeneratingGarment || !!splittingItemId;

  const renderWardrobeGrid = (items: WardrobeItem[], category: 'garment' | 'accessory') => (
    <>
    {items.length === 0 ? (
        <div className="text-center text-gray-500 py-6 px-4 border border-dashed border-gray-300 rounded-lg my-4">
            <p className="text-sm">No {category}s found. Use the 'Create with AI' feature above or 'Upload' to add new items!</p>
        </div>
    ) : (
        <div className="grid grid-cols-3 gap-3">
            {items.map((item) => {
                const isActive = activeGarmentIds.includes(item.id);
                // Allow splitting only custom/generated garments, not split items, and not default items
                const isSplittable = item.category === 'garment' && (item.id.startsWith('custom-') || item.id.startsWith('generated-')) && !item.id.startsWith('split-');
                const isCustomOrGenerated = item.id.startsWith('custom-') || item.id.startsWith('generated-') || item.id.startsWith('split-');

                return (
                    <div key={item.id} className="relative group">
                        <button
                            onClick={() => handleGarmentClick(item)}
                            disabled={globalBlocker || isActive}
                            className={`aspect-square w-full border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 disabled:opacity-60 disabled:cursor-not-allowed ${isActive ? 'ring-2 ring-gray-800' : ''}`}
                            aria-label={`Select ${item.name}`}
                            title={`Select ${item.name}`}
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
                        {isCustomOrGenerated && !isActive && (
                            <button
                                onClick={() => onRemoveItem(item.id)}
                                disabled={globalBlocker}
                                className="absolute top-1 left-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-full text-red-500 hover:bg-white hover:text-red-700 transition-all scale-90 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                title="Remove from wardrobe"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                        {isSplittable && !isActive && (
                            <button
                                onClick={() => handleSplitGarment(item)}
                                disabled={globalBlocker}
                                className="absolute top-1 right-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-full text-gray-700 hover:bg-white hover:text-gray-900 transition-all scale-90 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Split into separate items"
                            >
                                <ScissorsIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            })}
            <label htmlFor={`custom-${category}-upload`} className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${globalBlocker ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 hover:text-gray-600 cursor-pointer'}`}
                title={`Upload a custom ${category}`}
            >
                <UploadCloudIcon className="w-6 h-6 mb-1"/>
                <span className="text-xs text-center">Upload {category.charAt(0).toUpperCase() + category.slice(1)}</span>
                <input id={`custom-${category}-upload`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={(e) => handleFileChange(e, category)} disabled={globalBlocker}/>
            </label>
        </div>
    )}
    </>
  );

  return (
    <div className="pt-6 border-t border-gray-400/50">
        <div className="mb-6 relative">
            <AnimatePresence mode="wait">
            {isGeneratingGarment && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg p-4"
                >
                    <Spinner />
                    <p className="text-sm font-semibold text-gray-700 mt-2 text-center">Creating item from prompt...</p>
                </motion.div>
            )}
            </AnimatePresence>
            <h3 className="text-lg font-serif tracking-wider text-gray-800 mb-3">Create with AI</h3>
            <div className="flex items-center gap-2 mb-3">
                <button 
                    onClick={() => setGenerationCategory('garment')}
                    disabled={globalBlocker}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${generationCategory === 'garment' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Generate a garment (e.g., shirt, dress)"
                >
                    Garment
                </button>
                <button 
                    onClick={() => setGenerationCategory('accessory')}
                    disabled={globalBlocker}
                    className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${generationCategory === 'accessory' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Generate an accessory (e.g., hat, sunglasses)"
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
                    disabled={globalBlocker}
                    aria-label={`Prompt for AI ${generationCategory} generation`}
                />
                <button
                    type="submit"
                    disabled={globalBlocker || !garmentPrompt.trim()}
                    className="mt-2 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title={`Generate ${generationCategory}`}
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate {generationCategory === 'garment' ? 'Garment' : 'Accessory'}
                </button>
                 {generationError && <p className="text-red-500 text-sm mt-2">{generationError}</p>}
            </form>
        </div>
        
        <div className="space-y-6">
            <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Your Wardrobe</h2>
            {wardrobeError && <p className="text-red-500 text-sm mt-2 mb-4">{wardrobeError}</p>}

            <div className="flex items-center gap-2 mb-4">
                <button 
                    onClick={() => setFilterCategory('all')}
                    disabled={globalBlocker}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${filterCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Show all items"
                >
                    <LayoutGridIcon className="w-4 h-4"/> All
                </button>
                <button 
                    onClick={() => setFilterCategory('garment')}
                    disabled={globalBlocker}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${filterCategory === 'garment' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Show only garments"
                >
                    <ShirtIcon className="w-4 h-4"/> Garments
                </button>
                <button 
                    onClick={() => setFilterCategory('accessory')}
                    disabled={globalBlocker}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${filterCategory === 'accessory' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Show only accessories"
                >
                    <TagIcon className="w-4 h-4"/> Accessories
                </button>
            </div>
            {renderWardrobeGrid(filteredWardrobe, 'garment')} {/* Render all filtered items in one grid */}
        </div>
    </div>
  );
};

export default WardrobePanel;
