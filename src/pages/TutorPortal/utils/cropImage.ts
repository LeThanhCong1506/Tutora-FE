/**
 * Utility to crop an image using Canvas API
 * Used with react-easy-crop's onCropComplete callback
 */

interface PixelCrop {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Creates a cropped image File from a source image and crop area
 * @param imageSrc - Base64 or URL of the source image
 * @param pixelCrop - The crop area in pixels from react-easy-crop
 * @param fileName - Output file name
 * @returns Promise<File> - The cropped image as a File object
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: PixelCrop,
    fileName: string = 'avatar.jpg'
): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Set canvas size to the crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped area onto the canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Convert canvas to blob then to File
    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas toBlob failed'));
                    return;
                }
                const file = new File([blob], fileName, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(file);
            },
            'image/jpeg',
            0.92 // Quality 92% — good balance of quality and file size
        );
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });
}
