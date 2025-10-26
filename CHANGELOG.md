# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2024-07-28

This is a major feature release introducing a suite of powerful AI-driven tools and usability enhancements.

### ✨ Added

-   **AI Assistant (Chatbot):** A new conversational AI chatbot is now available. Users can ask questions about style, use Google Search for fashion inspiration, and interact with their current outfit contextually.
-   **Body Shape Adjustment:** A new pre-styling screen allows users to make subtle, SFW adjustments to the model's build and shape for a more personalized fit.
-   **AI Wardrobe Generation:** Users can now generate new wardrobe items from a text prompt using the `imagen-4.0-generate-001` model.
-   **Garment Splitting:** The AI can now analyze an image of a full outfit and segment it into individual clothing items, which are then added to the wardrobe.
-   **AI Style Editor:** After creating an outfit, users can now use text prompts to perform creative edits on the final image, such as changing the background or applying filters.
-   **Changelog Modal:** A "What's New" modal has been added to the application to inform users about recent updates.

### 改善 Improved

-   **Error Handling:** Error messages are now more descriptive and are displayed closer to the UI element that generated the error.
-   **UI/UX:** Added tooltips to icon buttons, improved empty state messages, and included "Clear Outfit" and "Remove Wardrobe Item" functionality for better wardrobe management.
-   **Image Loading:** Migrated all default wardrobe assets to a more reliable CDN to prevent broken image links.
