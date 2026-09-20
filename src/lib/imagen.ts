// lib/imagen.ts — Compresión de fotos de perfil en el navegador, antes de
// subirlas. Redimensiona a un lado máximo y re-codifica a WebP: una foto de
// celular (3-8MB) queda en ~15-40KB, así no le pegamos con binarios pesados
// ni a Blob ni al plan gratuito. Solo corre en el cliente (usa canvas/Image).
export function comprimirImagen(file: File, ladoMax = 480, calidad = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height && width > ladoMax) {
        height = Math.round((height * ladoMax) / width);
        width = ladoMax;
      } else if (height >= width && height > ladoMax) {
        width = Math.round((width * ladoMax) / height);
        height = ladoMax;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', calidad));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };

    img.src = objectUrl;
  });
}
