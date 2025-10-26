/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, CheckCircleIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';
import { DEFAULT_FEMALE_MODEL_URL, DEFAULT_MALE_MODEL_URL } from '../lib/constants';

interface StartScreenProps {
  onModelSelected: (modelUrl: string) => void;
}

const EXPRESSION_OPTIONS = ['Confident', 'Smiling', 'Thoughtful', 'Energetic'];

const StartScreen: React.FC<StartScreenProps> = ({ onModelSelected }) => {
  const [view, setView] = useState<'selector' | 'uploader'>('selector');
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpression, setSelectedExpression] = useState(EXPRESSION_OPTIONS[0]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file, selectedExpression);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to create model'));
            setUserImageUrl(null);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, [selectedExpression]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetUploader = () => {
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
    setView('selector');
  };

  const screenVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  const renderSelector = () => (
    <motion.div
      key="selector"
      className="w-full max-w-5xl mx-auto flex flex-col items-center"
      variants={screenVariants}
      initial="initial" animate="animate" exit="exit"
    >
      <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight text-center">Choose Your Base Model</h1>
      <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl">Start with one of our high-quality default models, or upload your own photo for a personalized experience.</p>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {/* Default Female */}
        <div className="flex flex-col items-center gap-4">
          <img src={DEFAULT_FEMALE_MODEL_URL} alt="Default female model" className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg"/>
          <button onClick={() => onModelSelected(DEFAULT_FEMALE_MODEL_URL)} className="w-full text-center bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-gray-700">
            Use Female Model
          </button>
        </div>
        
        {/* Default Male */}
        <div className="flex flex-col items-center gap-4">
          <img src={DEFAULT_MALE_MODEL_URL} alt="Default male model" className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg"/>
          <button onClick={() => onModelSelected(DEFAULT_MALE_MODEL_URL)} className="w-full text-center bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-gray-700">
            Use Male Model
          </button>
        </div>
        
        {/* Uploader */}
        <div className="flex flex-col items-center gap-4 p-6 bg-white/60 border border-gray-200/80 rounded-xl">
          <h2 className="text-2xl font-serif font-bold text-gray-800">Use Your Photo</h2>
          <p className="text-gray-600 text-center text-sm">Upload a clear photo for a personalized model. Full-body shots work best.</p>
          <button onClick={() => setView('uploader')} className="w-full mt-auto flex items-center justify-center text-center bg-white border border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-gray-100">
            <UploadCloudIcon className="w-5 h-5 mr-2" />
            Upload Photo
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderUploader = () => (
    !userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-4xl mx-auto flex flex-col items-center"
          variants={screenVariants}
          initial="initial" animate="animate" exit="exit"
        >
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">Create Your Personalized Model</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl">First, choose an expression for your generated model, then upload a clear photo of yourself.</p>
          </div>
          
          <div className="my-8 w-full max-w-lg p-6 bg-white/60 border border-gray-200/80 rounded-xl">
             <div className="mb-6 text-center">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Choose model expression</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                      {EXPRESSION_OPTIONS.map((option) => (
                          <button
                              key={option}
                              onClick={() => setSelectedExpression(option)}
                              className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors duration-200 ${selectedExpression === option ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                          >
                              {option}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="flex flex-col items-center w-full gap-3">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">2. Upload your photo</h2>
                <label htmlFor="image-upload-start" className="w-full relative flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700 transition-colors">
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  Select Photo
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
          </div>
          <button onClick={() => setView('selector')} className="text-sm font-semibold text-gray-600 hover:underline">&larr; Back to selection</button>
        </motion.div>
    ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
          variants={screenVariants}
          initial="initial" animate="animate" exit="exit"
        >
          <div className="md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">Your New Model</h1>
              <p className="mt-2 text-md text-gray-600">Drag the slider to see the transformation.</p>
            </div>
            
            {isGenerating && (
              <div className="flex items-center gap-3 text-lg text-gray-700 font-serif mt-6">
                <Spinner />
                <span>Generating your model...</span>
              </div>
            )}

            {error && 
              <div className="text-center md:text-left text-red-600 max-w-md mt-6">
                <p className="font-semibold">Generation Failed: <span className="font-normal">{error}</span></p>
                <button onClick={resetUploader} className="mt-2 text-sm font-semibold text-gray-700 hover:underline">Try Again</button>
              </div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isGenerating && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row items-center gap-4 mt-8"
                >
                  <button 
                    onClick={resetUploader}
                    className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-700 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors"
                  >
                    Use Different Photo
                  </button>
                  <button 
                    onClick={() => onModelSelected(generatedModelUrl)}
                    className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5 mr-2"/>
                    Accept and Continue
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center">
            <div className={`relative rounded-[1.25rem] transition-all duration-700 ease-in-out ${isGenerating ? 'border border-gray-300 animate-pulse' : 'border border-transparent'}`}>
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-[280px] h-[420px] sm:w-[320px] sm:h-[480px] lg:w-[400px] lg:h-[600px] rounded-2xl bg-gray-200"
              />
            </div>
          </div>
        </motion.div>
      )
  );

  return (
    <AnimatePresence mode="wait">
        {view === 'selector' ? renderSelector() : renderUploader()}
    </AnimatePresence>
  );
};

export default StartScreen;