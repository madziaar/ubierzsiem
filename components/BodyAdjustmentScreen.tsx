/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';
import { adjustModelBody } from '../services/geminiService';
import { RotateCcwIcon, SlidersHorizontalIcon } from './icons';

interface BodyAdjustmentScreenProps {
  baseModelUrl: string;
  onFinalized: (finalModelUrl: string) => void;
  onStartOver: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  disabled: boolean;
}

const AdjustmentSlider: React.FC<SliderProps> = ({ label, value, onValueChange, minLabel, maxLabel, disabled }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1">
      <label className="font-semibold text-gray-800">{label}</label>
      <span className="text-sm font-mono text-gray-600 w-12 text-center">{value}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-12 text-center">{minLabel}</span>
      <input
        type="range"
        min="-100"
        max="100"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        disabled={disabled}
      />
      <span className="text-xs text-gray-500 w-12 text-center">{maxLabel}</span>
    </div>
  </div>
);

const BodyAdjustmentScreen: React.FC<BodyAdjustmentScreenProps> = ({ baseModelUrl, onFinalized, onStartOver }) => {
  const [adjustedModelUrl, setAdjustedModelUrl] = useState<string>(baseModelUrl);
  const [adjustments, setAdjustments] = useState({ build: 0, shape: 0 });
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdjustmentChange = <K extends keyof typeof adjustments>(key: K, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyAdjustments = useCallback(async () => {
    if (isAdjusting) return;
    
    setError(null);
    setIsAdjusting(true);
    try {
      const newUrl = await adjustModelBody(baseModelUrl, adjustments);
      setAdjustedModelUrl(newUrl);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply adjustments'));
    } finally {
      setIsAdjusting(false);
    }
  }, [baseModelUrl, adjustments, isAdjusting]);

  const handleReset = () => {
    setAdjustments({ build: 0, shape: 0 });
    setAdjustedModelUrl(baseModelUrl);
    setError(null);
  };

  const hasChanges = adjustments.build !== 0 || adjustments.shape !== 0;

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
        {/* Left Side: Image */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <div className="relative w-[320px] h-[480px] sm:w-[400px] sm:h-[600px] bg-gray-200 rounded-2xl overflow-hidden shadow-lg">
            <img 
              src={adjustedModelUrl} 
              alt="Model for adjustment"
              className="w-full h-full object-cover"
            />
            <AnimatePresence>
              {isAdjusting && (
                <motion.div
                  className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner />
                  <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">Applying Adjustments...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Right Side: Controls */}
        <div className="w-full lg:w-1/2 max-w-md flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="flex items-center gap-3 text-gray-800 mb-2">
            <SlidersHorizontalIcon className="w-8 h-8"/>
            <h1 className="text-4xl md:text-5xl font-serif font-bold">Adjust Model</h1>
          </div>
          <p className="mt-2 mb-8 text-gray-600">
            Use the sliders to refine the model's physique. These are subtle, safe-for-work adjustments for a better fit.
          </p>
          
          <div className="w-full space-y-6 bg-white/60 p-6 rounded-lg border border-gray-200/80">
            <AdjustmentSlider 
              label="Build"
              value={adjustments.build}
              onValueChange={(v) => handleAdjustmentChange('build', v)}
              minLabel="Slimmer"
              maxLabel="Broader"
              disabled={isAdjusting}
            />
            <AdjustmentSlider 
              label="Shape"
              value={adjustments.shape}
              onValueChange={(v) => handleAdjustmentChange('shape', v)}
              minLabel="Straighter"
              maxLabel="Curvier"
              disabled={isAdjusting}
            />
          </div>
          
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          
          <div className="w-full flex flex-col sm:flex-row items-center gap-3 mt-8">
            <button 
              onClick={handleApplyAdjustments}
              disabled={isAdjusting || !hasChanges}
              className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-800 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Adjustments
            </button>
            <button 
              onClick={() => onFinalized(adjustedModelUrl)}
              disabled={isAdjusting}
              className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors"
            >
              Proceed to Styling &rarr;
            </button>
          </div>
          <div className="w-full flex items-center justify-center lg:justify-start gap-6 mt-4 text-sm">
             <button onClick={handleReset} disabled={isAdjusting} className="font-semibold text-gray-600 hover:underline disabled:opacity-50">
                Reset Sliders
             </button>
             <button onClick={onStartOver} disabled={isAdjusting} className="font-semibold text-gray-600 hover:underline disabled:opacity-50">
                Back to Selection
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BodyAdjustmentScreen;