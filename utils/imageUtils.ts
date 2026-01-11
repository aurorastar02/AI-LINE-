
/**
 * Processes a raw AI image to meet LINE sticker requirements:
 * - Max 370x320 px (Even dimensions)
 * - 10px margins
 * - Background transparency (simple white-to-transparent removal)
 */
export const processStickerImage = (
  base64: string,
  targetWidth = 370,
  targetHeight = 320,
  margin = 10
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      // 1. Simple background removal (White to Transparent)
      // This is a basic browser-side implementation.
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        // Sensitivity for "white"
        const threshold = 240; 
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > threshold && data[i+1] > threshold && data[i+2] > threshold) {
            data[i+3] = 0; // Set alpha to 0
          }
        }
        tempCtx.putImageData(imageData, 0, 0);
      }

      // 2. Resize and Center with margin
      const drawableWidth = targetWidth - margin * 2;
      const drawableHeight = targetHeight - margin * 2;
      
      const scale = Math.min(drawableWidth / img.width, drawableHeight / img.height);
      const x = (targetWidth - img.width * scale) / 2;
      const y = (targetHeight - img.height * scale) / 2;

      ctx.drawImage(tempCanvas, x, y, img.width * scale, img.height * scale);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64;
  });
};
