
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
      // Ensure even dimensions
      const finalW = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
      const finalH = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      // Simple BG removal
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 245 && g > 245 && b > 245) data[i+3] = 0;
        }
        tempCtx.putImageData(imageData, 0, 0);
      }

      const drawableW = finalW - margin * 2;
      const drawableH = finalH - margin * 2;
      const scale = Math.min(drawableW / img.width, drawableH / img.height);
      const x = (finalW - img.width * scale) / 2;
      const y = (finalH - img.height * scale) / 2;

      ctx.drawImage(tempCanvas, x, y, img.width * scale, img.height * scale);
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
  return processStickerImage(sourceBase64, w, h, Math.floor(w * 0.1));
};
