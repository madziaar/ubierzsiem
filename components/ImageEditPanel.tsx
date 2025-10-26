
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { SparklesIcon } from './icons';

interface ImageEditPanelProps {
  onEditSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const PROMPT_SUGGESTIONS = [
  "Change the background to a Parisian street",
  "Apply a vintage, black and white filter",
  "Make the lighting dramatic and moody",
  "Turn the outfit into a different color",
];

const ImageEditPanel: React.FC<ImageEditPanelProps> = ({ onEditSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onEditSubmit(prompt);
    }
  }, [prompt, isLoading, onEditSubmit]);
  
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setPrompt(suggestion);
    if (!isLoading) {
      onEditSubmit(suggestion);
    }
  }, [isLoading, onEditSubmit]);

  return (
    <div className="pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Style Editor</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'Change shirt to blue', 'Add a retro filter'..."
          className="w-full h-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-shadow resize-none"
          disabled={isLoading}
          aria-label="Enter your image editing prompt"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="mt-2 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Apply AI edit to the image"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          Apply Edit
        </button>
      </form>
      <div className="mt-4">
        <p className="text-sm font-semibold text-gray-600 mb-2">Or try a suggestion:</p>
        <div className="grid grid-cols-2 gap-2">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="w-full text-center bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-100 hover:border-gray-400 active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              title={`Try this edit: ${suggestion}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageEditPanel;
