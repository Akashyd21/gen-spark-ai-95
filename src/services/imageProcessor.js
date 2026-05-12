import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export class ImageProcessor {
  constructor() {
    this.maxWidth = 1024;
    this.maxHeight = 1024;
    this.quality = 80;
  }

  async analyzeImage(buffer) {
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();

      // Resize image if too large
      let processedBuffer = buffer;
      if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
        processedBuffer = await sharp(buffer)
          .resize(this.maxWidth, this.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
      }

      // Extract basic visual information
      const analysis = {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: (metadata.width / metadata.height).toFixed(2)
        },
        format: metadata.format,
        colorspace: metadata.space,
        hasAlpha: metadata.hasAlpha || false,
        dominantColors: await this.extractDominantColors(buffer),
        brightness: await this.estimateBrightness(buffer),
        description: this.generateVisualDescription(metadata)
      };

      return analysis;
    } catch (error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  async extractDominantColors(buffer) {
    try {
      // Get image statistics
      const stats = await sharp(buffer)
        .resize(50, 50, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple dominant color detection (returns placeholder)
      // In production, use a proper color extraction library
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
      return colors;
    } catch {
      return ['#FF6B6B', '#4ECDC4'];
    }
  }

  async estimateBrightness(buffer) {
    try {
      const stats = await sharp(buffer)
        .stats();

      const channels = stats.channels;
      const brightness = (
        (channels[0].mean + channels[1].mean + channels[2].mean) / 3
      ) / 255;

      return brightness > 0.5 ? 'bright' : 'dark';
    } catch {
      return 'medium';
    }
  }

  generateVisualDescription(metadata) {
    const descriptions = [];

    if (metadata.width > metadata.height) {
      descriptions.push('landscape orientation');
    } else if (metadata.height > metadata.width) {
      descriptions.push('portrait orientation');
    } else {
      descriptions.push('square format');
    }

    descriptions.push(`${metadata.width}x${metadata.height} resolution`);

    if (metadata.hasAlpha) {
      descriptions.push('transparent background');
    }

    return descriptions.join(', ');
  }

  async saveProcessedImage(buffer, filename) {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filepath = path.join(uploadDir, filename);
      
      await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(filepath);

      return filepath;
    } catch (error) {
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  getImageStats(metadata) {
    return {
      dimensions: `${metadata.width}x${metadata.height}`,
      format: metadata.format,
      size: `${metadata.size || 0} bytes`,
      colorspace: metadata.space
    };
  }
}