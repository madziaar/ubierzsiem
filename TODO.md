# TODO List

This file tracks immediate, short-term tasks, bug fixes, and quality-of-life improvements for the Virtual Try-On application.

## UI/UX Improvements

-   [x] **Refine Loading States:** Add more granular loading indicators for specific actions like splitting a garment, separate from the main "Applying Garment" overlay.
-   [ ] **Mobile Layout:** The right-hand side panel can be crowded on smaller mobile screens. Improve the responsive design to better accommodate all features.
-   [x] **Tooltips:** Add descriptive tooltips to icon buttons (e.g., "Split Garment," "Start Over") to improve user understanding.
-   [x] **Error Message Placement:** Display errors closer to the action that caused them (e.g., show garment generation errors directly within the "Create with AI" panel).
-   [x] **Empty States:** Improve the empty state messages for the wardrobe and outfit stack to be more engaging and directive.

## Bug Fixes

-   [ ] **State Consistency:** Investigate potential race conditions if a user tries to perform another action (e.g., change pose) while a garment is still being applied.
-   [ ] **Image Generation Failures:** Implement more robust error handling and user feedback when `imagen` or `gemini-flash-image` fail due to safety policies or other block reasons. Provide clearer guidance to the user on how to adjust their prompt.
-   [ ] **Splitting Accuracy:** The AI occasionally struggles to segment garments perfectly. Experiment with prompt engineering to improve the reliability of the `segmentGarment` function.

## Functionality

-   [x] **Clear Outfit Button:** Add a single button to remove all applied garments and revert to the base model, as an alternative to removing them one by one.
-   [x] **Remove Wardrobe Item:** Allow users to delete items they have uploaded or generated from their personal wardrobe.
-   [ ] **Wardrobe Categories:** As the wardrobe grows, add simple filters for categories like "Tops," "Bottoms," and "Dresses."

## Code Quality & Refactoring

-   [ ] **State Management in `App.tsx`:** The root `App` component is managing a lot of state. Consider refactoring to use React Context or a lightweight state management library (like Zustand) for better organization.
-   [ ] **Service Modularity:** Continue to ensure all API interactions are cleanly abstracted within `geminiService.ts` and are easily testable.
-   [ ] **Type Safety:** Add more specific types where `any` or implicit types are still being used.