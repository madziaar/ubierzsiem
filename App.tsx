/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Implement the main App component to manage application state and render UI.
// The previous content was placeholder text, causing compilation errors.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import StartScreen from './components/StartScreen';
import BodyAdjustmentScreen from './components/BodyAdjustmentScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import ImageEditPanel from './components/ImageEditPanel';
import OutfitStack from './components/CurrentOutfitPanel';
import ChatBot from './components/ChatBot';
import Changelog from './components/Changelog';
import Footer from './components/Footer';
import { OutfitLayer, WardrobeItem } from './types';
import { generateVirtualTryOnImage, generatePoseVariation, editImageWithPrompt } from './services/geminiService';
import { getFriendlyErrorMessage } from './lib/utils';
import { defaultWardrobe } from './wardrobe';
import { BellIcon, ShirtIcon, SparklesIcon } from './components/icons';
import { AnimatePresence, motion } from 'framer-motion';

type AppState = 'start' | 'adjust' | 'dressing';
type ActivePanel = 'wardrobe' | 'editor';

const POSE_INSTRUCTIONS = [
  "Standing, facing forward",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Walking towards camera",
  "Leaning against a wall",
  "Hands in pockets, casual stance",
  "Dynamic action pose",
  "Seated on a stool",
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('start');
  const [baseModelUrl, setBaseModelUrl] = useState<string | null>(null);
  
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [activePanel, setActivePanel] = useState<ActivePanel>('wardrobe');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);


  useEffect(() => {
    const hasSeenChangelog = localStorage.getItem('changelog_v1.1.0');
    if (!hasSeenChangelog) {
        setIsChangelogOpen(true);
        localStorage.setItem('changelog_v1.1.0', 'true');
    }
  }, []);

  const handleStartOver = useCallback(() => {
    setAppState('start');
    setBaseModelUrl(null);
    setOutfitHistory([]);
    setCurrentPoseIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setActivePanel('wardrobe');
    setWardrobe(defaultWardrobe);
  }, []);

  const handleModelSelected = useCallback((modelUrl: string) => {
    setBaseModelUrl(modelUrl);
    setAppState('adjust');
  }, []);

  const handleModelFinalized = useCallback((finalUrl: string) => {
    const initialLayer: OutfitLayer = {
        garment: null, // Base model layer
        poseImages: { [POSE_INSTRUCTIONS[0]]: finalUrl },
    };
    setOutfitHistory([initialLayer]);
    setCurrentPoseIndex(0);
    setAppState('dressing');
  }, []);
  
  const currentOutfitLayer = useMemo(() => outfitHistory[outfitHistory.length - 1], [outfitHistory]);
  const currentPoseInstruction = useMemo(() => POSE_INSTRUCTIONS[currentPoseIndex], [currentPoseIndex]);
  const displayImageUrl = useMemo(() => currentOutfitLayer?.poseImages[currentPoseInstruction] || currentOutfitLayer?.poseImages[POSE_INSTRUCTIONS[0]], [currentOutfitLayer, currentPoseInstruction]);

  const activeGarmentIds = useMemo(() => outfitHistory.map(layer => layer.garment?.id).filter(Boolean) as string[], [outfitHistory]);

  const availablePoseKeys = useMemo(() => {
      if (!currentOutfitLayer) return [];
      return Object.keys(currentOutfitLayer.poseImages);
  }, [currentOutfitLayer]);

  const handleSelectPose = useCallback(async (poseIndex: number) => {
    setCurrentPoseIndex(poseIndex);
    const newPoseInstruction = POSE_INSTRUCTIONS[poseIndex];

    if (currentOutfitLayer?.poseImages[newPoseInstruction]) {
        return; // Pose already generated
    }

    setIsLoading(true);
    setLoadingMessage(`Generating "${newPoseInstruction}" pose...`);
    setError(null);
    try {
        const baseImageForPose = currentOutfitLayer.poseImages[POSE_INSTRUCTIONS[0]];
        if (!baseImageForPose) throw new Error("Base pose image is not available.");

        const newPoseImageUrl = await generatePoseVariation(baseImageForPose, newPoseInstruction);
        
        setOutfitHistory(prev => {
            const newHistory = [...prev];
            const lastLayer = newHistory[newHistory.length - 1];
            lastLayer.poseImages[newPoseInstruction] = newPoseImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to generate new pose'));
    } finally {
        setIsLoading(false);
    }
  }, [currentOutfitLayer]);


  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    setIsLoading(true);
    setLoadingMessage(`Applying ${garmentInfo.name}...`);
    setError(null);
    try {
      const baseImageUrl = displayImageUrl;
      if (!baseImageUrl) throw new Error("Current model image is not available.");
      
      const newTryOnImageUrl = await generateVirtualTryOnImage(baseImageUrl, garmentFile, garmentInfo.category);
      
      const newLayer: OutfitLayer = {
        garment: garmentInfo,
        poseImages: { [POSE_INSTRUCTIONS[0]]: newTryOnImageUrl },
      };
      
      setOutfitHistory(prev => [...prev, newLayer]);
      setCurrentPoseIndex(0); // Reset to default pose for new layer

      // Add to wardrobe if it's a new custom item
      if (!wardrobe.some(item => item.id === garmentInfo.id)) {
        setWardrobe(prev => [...prev, garmentInfo]);
      }

    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
    }
  }, [displayImageUrl, wardrobe]);
  
  const handleRemoveLastGarment = useCallback(() => {
    if (outfitHistory.length > 1) {
      setOutfitHistory(prev => prev.slice(0, -1));
      setCurrentPoseIndex(0);
    }
  }, [outfitHistory.length]);

  const handleEditImage = useCallback(async (prompt: string) => {
    if (!displayImageUrl) return;

    setIsLoading(true);
    setLoadingMessage(`Applying edit: "${prompt}"`);
    setError(null);

    try {
        const editedImageUrl = await editImageWithPrompt(displayImageUrl, prompt);
        
        setOutfitHistory(prev => {
            const newHistory = [...prev];
            const lastLayer = newHistory[newHistory.length - 1];
            // This edit applies only to the current pose.
            // Other poses for this layer are now out of sync.
            // For a better UX, we could clear them, but for simplicity, we just update the current one.
            lastLayer.poseImages[currentPoseInstruction] = editedImageUrl;
            return newHistory;
        });
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to edit image'));
    } finally {
        setIsLoading(false);
    }
  }, [displayImageUrl, currentPoseInstruction]);

  const handleRemoveWardrobeItem = useCallback((itemId: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== itemId));
  }, []);

  if (appState === 'start') {
    return (
        <main className="w-full min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8">
            <Header />
            <div className="flex-grow flex items-center justify-center">
                <StartScreen onModelSelected={handleModelSelected} />
            </div>
        </main>
    );
  }

  if (appState === 'adjust' && baseModelUrl) {
      return <BodyAdjustmentScreen baseModelUrl={baseModelUrl} onFinalized={handleModelFinalized} onStartOver={handleStartOver} />;
  }

  if (appState === 'dressing') {
    return (
      <div className="w-full h-screen max-h-screen overflow-hidden bg-gray-100 flex flex-col">
        <Header />
        <main className="flex-grow flex overflow-hidden">
          {/* Main Canvas Area */}
          <div className="flex-grow h-full relative">
              <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handleSelectPose}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={availablePoseKeys}
              />
          </div>

          {/* Right Sidebar */}
          <aside className="w-[380px] flex-shrink-0 bg-white/60 backdrop-blur-xl border-l border-gray-200/80 flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-serif tracking-wider text-gray-800">Style Studio</h2>
                <button onClick={() => setIsChangelogOpen(true)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200/70" title="See What's New">
                    <BellIcon className="w-5 h-5" />
                </button>
            </div>
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            <OutfitStack 
                outfitHistory={outfitHistory}
                onRemoveLastGarment={handleRemoveLastGarment}
                onAddGarment={() => setActivePanel('wardrobe')}
            />

            <div className="mt-6 border-t border-gray-300/80 pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <button 
                        onClick={() => setActivePanel('wardrobe')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activePanel === 'wardrobe' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'}`}
                    >
                        <ShirtIcon className="w-4 h-4"/> Wardrobe
                    </button>
                     <button 
                        onClick={() => setActivePanel('editor')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activePanel === 'editor' ? 'bg-gray-900 text-white' : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'}`}
                    >
                        <SparklesIcon className="w-4 h-4"/> AI Editor
                    </button>
                </div>
                
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePanel}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activePanel === 'wardrobe' ? (
                            <WardrobePanel 
                                onGarmentSelect={handleGarmentSelect}
                                activeGarmentIds={activeGarmentIds}
                                isLoading={isLoading}
                                wardrobe={wardrobe}
                                setWardrobe={setWardrobe}
                                onRemoveItem={handleRemoveWardrobeItem}
                            />
                        ) : (
                            <ImageEditPanel 
                                onEditSubmit={handleEditImage}
                                isLoading={isLoading}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

          </aside>
        </main>
        <Footer isOnDressingScreen={true} />
        <ChatBot contextImageUrl={displayImageUrl} />
        <Changelog isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center">
        <p>Loading...</p>
    </div>
  );
};

export default App;