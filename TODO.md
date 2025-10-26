# TODO List

This file tracks immediate, short-term tasks, bug fixes, and quality-of-life improvements for the Virtual Try-On application.

## UI/UX Improvements

-   [x] **Refine Loading States:** Add more granular loading indicators for specific actions like splitting a garment, separate from the main "Applying Garment" overlay.
-   [x] **Mobile Layout:** The right-hand side panel can be crowded on smaller mobile screens. Improve the responsive design to better accommodate all features.
-   [x] **Tooltips:** Add descriptive tooltips to icon buttons (e.g., "Split Garment," "Start Over") to improve user understanding.
-   [x] **Error Message Placement:** Display errors closer to the action that caused them (e.g., show garment generation errors directly within the "Create with AI" panel).
-   [x] **Empty States:** Improve the empty state messages for the wardrobe and outfit stack to be more engaging and directive.
-   [ ] **Wardrobe Persistence:** Use `localStorage` to save custom-uploaded and AI-generated wardrobe items so they persist between page refreshes. This will make the user's collection feel permanent.
-   [ ] **Drag-and-Drop Uploads:** Implement drag-and-drop file upload zones on the Start Screen and in the Wardrobe panel for a more modern and fluid user experience.
-   [ ] **Enhanced Accessibility:** Improve keyboard navigation and focus management. For instance, allow the `Escape` key to close all modals and popovers, and ensure focus is properly trapped and returned.

## Bug Fixes

-   [x] **State Consistency:** Investigate potential race conditions if a user tries to perform another action (e.g., change pose) while a garment is still being applied.
-   [x] **Image Generation Failures:** Implement more robust error handling and user feedback when `imagen` or `gemini-flash-image` fail due to safety policies or other block reasons. Provide clearer guidance to the user on how to adjust their prompt.
-   [x] **Splitting Accuracy:** The AI occasionally struggles to segment garments perfectly. Experiment with prompt engineering to improve the reliability of the `segmentGarment` function.
-   [ ] **Chatbot Image Context:** The AI Assistant should be aware of the current outfit. Modify the chat service to include the current `contextImageUrl` when a new message is sent, enabling truly contextual style advice.

## Functionality

-   [x] **Clear Outfit Button:** Add a single button to remove all applied garments and revert to the base model, as an alternative to removing them one by one.
-   [x] **Remove Wardrobe Item:** Allow users to delete items they have uploaded or generated from their personal wardrobe.
-   [x] **Wardrobe Categories:** As the wardrobe grows, add simple filters for categories like "Tops," "Bottoms," and "Dresses."
-   [ ] **Search Wardrobe:** Add a text input field to allow users to search their collected wardrobe items by name.
-   [ ] **Edit Wardrobe Item Name:** Allow users to rename uploaded or generated items for better organization.

## Code Quality & Refactoring

-   [x] **State Management in `App.tsx`:** The root `App` component is managing a lot of state. While complex, the current implementation with `useState` and `useCallback` is functional and performant for the current scope. A major refactor (e.g., to Context or a state management library) is deferred as it would constitute a large-scale change rather than an incremental improvement.
-   [x] **Service Modularity:** Continue to ensure all API interactions are cleanly abstracted within `geminiService.ts` and are easily testable.
-   [x] **Type Safety:** Add more specific types where `any` or implicit types are still being used.
