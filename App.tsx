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
import { Compare } from './components/ui/compare';
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
import { BellIcon, ShirtIcon, SparklesIcon, RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon } from './components/icons';
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
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);


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

  const handleClearOutfit = useCallback(() => {
    if (outfitHistory.length > 1) {
      setOutfitHistory(prev => [prev[0]]);
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
            // The edit creates a new canonical image for this layer.
            // To maintain consistency, we reset the poses, making the edited image the new base pose.
            lastLayer.poseImages = { [POSE_INSTRUCTIONS[0]]: editedImageUrl };
            return newHistory;
        });
        setCurrentPoseIndex(0); // Reset to the base pose
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to edit image'));
    } finally {
        setIsLoading(false);
    }
  }, [displayImageUrl, currentPoseInstruction, setCurrentPoseIndex]);

  const handleRemoveWardrobeItem = useCallback((itemId: string) => {
    setWardrobe(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;

    const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    // Fallback if current pose not in available list (shouldn't happen)
    if (currentIndexInAvailable === -1) {
        handleSelectPose((currentPoseIndex - 1 + POSE_INSTRUCTIONS.length) % POSE_INSTRUCTIONS.length);
        return;
    }

    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = POSE_INSTRUCTIONS.indexOf(prevPoseInstruction);

    if (newGlobalPoseIndex !== -1) {
        handleSelectPose(newGlobalPoseIndex);
    }
  };

  const handleNextPose = () => {
    if (isLoading) return;

    const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);

    // Fallback or if there are no generated poses yet
    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        handleSelectPose((currentPoseIndex + 1) % POSE_INSTRUCTIONS.length);
        return;
    }

    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        // There is another generated pose, navigate to it
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = POSE_INSTRUCTIONS.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) {
            handleSelectPose(newGlobalPoseIndex);
        }
    } else {
        // At the end of generated poses, generate the next one from the master list
        const newGlobalPoseIndex = (currentPoseIndex + 1) % POSE_INSTRUCTIONS.length;
        handleSelectPose(newGlobalPoseIndex);
    }
  };

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
          <div className="flex-grow h-full relative flex items-center justify-center p-4 group">
            <Compare
              firstImage={outfitHistory[0]?.poseImages[POSE_INSTRUCTIONS[0]]}
              secondImage={displayImageUrl}
              className="h-full aspect-[2/3] rounded-2xl overflow-hidden shadow-lg"
              slideMode="drag"
            />
            {/* Start Over Button */}
            <button
                onClick={handleStartOver}
                title="Start Over"
                className="absolute top-8 left-8 z-30 flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
            >
                <RotateCcwIcon className="w-4 h-4 mr-2" />
                Start Over
            </button>

            {/* Pose Controls */}
            {displayImageUrl && !isLoading && (
              <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onMouseEnter={() => setIsPoseMenuOpen(true)}
                onMouseLeave={() => setIsPoseMenuOpen(false)}
              >
                <AnimatePresence>
                    {isPoseMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute bottom-full mb-3 w-64 bg-white/80 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {POSE_INSTRUCTIONS.map((pose, index) => (
                                    <button
                                        key={pose}
                                        onClick={() => handleSelectPose(index)}
                                        disabled={isLoading || index === currentPoseIndex}
                                        className="w-full text-left text-sm font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:opacity-50 disabled:bg-gray-200/70 disabled:font-bold disabled:cursor-not-allowed"
                                    >
                                        {pose}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-center gap-2 bg-white/60 backdrop-blur-md rounded-full p-2 border border-gray-300/50">
                  <button
                    onClick={handlePreviousPose}
                    aria-label="Previous pose"
                    className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
                  </button>
                  <span className="text-sm font-semibold text-gray-800 w-48 text-center truncate" title={currentPoseInstruction}>
                    {currentPoseInstruction}
                  </span>
                  <button
                    onClick={handleNextPose}
                    aria-label="Next pose"
                    className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-800" />
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {isLoading && (
                  <motion.div
                      className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                  >
                      <Spinner />
                      {loadingMessage && (
                          <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                      )}
                  </motion.div>
              )}
            </AnimatePresence>
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
                onClearOutfit={handleClearOutfit}
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