/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, SparklesIcon, BrainCircuitIcon, ScissorsIcon, SlidersHorizontalIcon, MessageCircleIcon } from './icons';

interface ChangelogProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: <MessageCircleIcon className="w-6 h-6 text-white" />,
    title: "AI Assistant",
    description: "Introducing a new conversational AI assistant! Ask questions about your outfit, get style advice, or search the web for fashion inspiration.",
    bgColor: "bg-blue-500",
  },
  {
    icon: <SlidersHorizontalIcon className="w-6 h-6 text-white" />,
    title: "Body Shape Adjustment",
    description: "Fine-tune your model's build and shape for a more personalized fit before you start styling.",
    bgColor: "bg-purple-500",
  },
  {
    icon: <SparklesIcon className="w-6 h-6 text-white" />,
    title: "AI Wardrobe Generation",
    description: "Create any clothing item from a simple text description using the 'Create with AI' feature in the wardrobe panel.",
    bgColor: "bg-teal-500",
  },
  {
    icon: <ScissorsIcon className="w-6 h-6 text-white" />,
    title: "Garment Splitting",
    description: "Upload a photo of an outfit and our AI can automatically split it into individual items for your wardrobe.",
    bgColor: "bg-orange-500",
  },
  {
    icon: <BrainCircuitIcon className="w-6 h-6 text-white" />,
    title: "AI Style Editor",
    description: "Edit your final image with text prompts. Change the background, apply filters, and much more.",
    bgColor: "bg-indigo-500",
  },
];

const Changelog: React.FC<ChangelogProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-serif text-gray-900">What's New</h2>
                <p className="text-sm text-gray-500">Latest updates from version 1.1.0</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${feature.bgColor}`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center rounded-b-2xl">
                <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                >
                    Got it!
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Changelog;
