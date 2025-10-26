# Fit Check: AI-Powered Virtual Try-On

Fit Check is a cutting-edge web application that leverages the power of Google's Gemini API to offer a seamless and photorealistic virtual try-on experience. Users can upload a photo of themselves, generate a personalized fashion model, and then style that model with a dynamic wardrobe of clothing—either from a default collection or generated on-the-fly from a text prompt.

## Core Features

-   **AI Model Generation:** Upload a full-body or face photo, and the AI generates a realistic, neutrally-posed fashion model while preserving your unique features and body type.
-   **Expressive Models:** Choose an emotional expression for your base model—such as 'Confident', 'Smiling', or 'Thoughtful'—to set the mood for your styling session.
-   **Photorealistic Virtual Try-On:** Select a garment, and the AI intelligently fits it onto your model, simulating realistic fabric drape, texture, and lighting for a true-to-life result.
-   **Pose Variation:** Dynamically change your model's pose to see how the outfit looks from different angles and in different stances.
-   **AI Wardrobe Creation:** Don't see what you want? Describe any clothing item with a text prompt (e.g., "a blue silk bomber jacket"), and the AI will generate a high-quality product image for you to use.
-   **Garment Splitting:** Upload or generate an image of a full outfit (like a suit), and the AI can intelligently segment it into its component parts (e.g., 'blazer' and 'trousers') and add them to your wardrobe as separate items.
-   **AI Style Editor:** Once an outfit is created, use text prompts to make creative edits. Change the background, apply a vintage filter, alter colors, and more.
-   **Clear Outfit:** Instantly remove all applied garments to return to the base model with a single click.
-   **Remove Wardrobe Items:** Keep your wardrobe tidy by deleting custom-uploaded or AI-generated items.

## Tech Stack

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS
-   **Animation:** Framer Motion
-   **AI & Generative Models:** Google Gemini API (`gemini-2.5-flash-image`, `gemini-2.5-flash`, `imagen-4.0-generate-001`)

## How It Works

1.  **Generate Model:** The user uploads a personal photo. The `gemini-2.5-flash-image` model processes this to create a clean, professional model image with a neutral background and undergarments.
2.  **Select Garment:** The user can select a clothing item from the default wardrobe, upload their own, or generate a new one using the `imagen-4.0-generate-001` model.
3.  **Apply Try-On:** The application sends the model image and the chosen garment image to `gemini-2.5-flash-image`. A detailed prompt instructs the AI to "dress" the model, focusing on realistic fabric physics, lighting, and fit.
4.  **Refine & Edit:** The user can continue to layer clothes, change the model's pose, or use the Style Editor to make generative edits to the final image, all powered by subsequent calls to the Gemini API.

## Getting Started

To run this project locally:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Set up your API Key:** The application expects your Google Gemini API key to be available as an environment variable (`process.env.API_KEY`). This is typically handled by the hosting environment.

3.  **Install dependencies and run:** The project uses `ESM` via an `importmap` in `index.html`, so there is no traditional build step required for development. Simply serve the files with a local web server.

---

*This is a demo application showcasing the capabilities of multimodal AI with the Google Gemini API.*