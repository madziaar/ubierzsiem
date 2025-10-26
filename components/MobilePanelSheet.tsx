
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from './icons';

interface MobilePanelSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const MobilePanelSheet: React.FC<MobilePanelSheetProps> = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden flex items-end" // Only visible on mobile
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full bg-white/95 backdrop-blur-xl rounded-t-2xl shadow-lg flex flex-col max-h-[90vh]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-gray-200/80">
                <h2 className="text-xl font-serif tracking-wider text-gray-800">Style Studio</h2>
                <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors" title="Close Style Studio">
                    <XIcon className="w-5 h-5"/>
                </button>
            </header>
            <div className="flex-grow overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobilePanelSheet;
