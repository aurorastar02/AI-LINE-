
/**
 * Processes a raw image to meet LINE sticker requirements:
 * - Max 370x320 px
 * - MUST have EVEN dimensions (width & height)
 * - 10px margin around character
 * - Simple white-to-transparent removal
 */
export const processStickerImage = (
  base64: string,
  targetWidth = 370,
  targetHeight = 320,
  margin = 10
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // 1. Force even dimensions for LINE compliance
      const finalW = (targetWidth % 2 === 0 ? targetWidth : targetWidth - 1);
      const finalH = (targetHeight % 2 === 0 ? targetHeight : targetHeight - 1);

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      // 2. Background removal (White to Transparent)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        // Sensitivity for "white"
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 248 && g > 248 && b > 248) {
            data[i+3] = 0; // Transparent
          }
        }
        tempCtx.putImageData(imageData, 0, 0);
      }

      // 3. Scale and Center with mandatory padding
      const drawableW = finalW - (margin * 2);
      const drawableH = finalH - (margin * 2);
      
      const scale = Math.min(drawableW / img.width, drawableH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const x = (finalW - drawW) / 2;
      const y = (finalH - drawH) / 2;

      ctx.drawImage(tempCanvas, x, y, drawW, drawH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64;
  });
};

export const createLineSpecialImage = (
  sourceBase64: string,
  w: number,
  h: number
): Promise<string> => {
  // Enforce even dimensions even for main/tab
  const evenW = w % 2 === 0 ? w : w - 1;
  const evenH = h % 2 === 0 ? h : h - 1;
  return processStickerImage(sourceBase64, evenW, evenH, Math.floor(evenW * 0.1));
};
