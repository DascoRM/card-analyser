import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly uploadsPath: string;

  constructor() {
    // Uploads folder is at apps/api/uploads (sibling to src folder)
    // __dirname = apps/api/dist/src/ocr in compiled output, so go up 3 levels
    this.uploadsPath = path.resolve(__dirname, '../../../uploads');
    this.logger.log(`Uploads path configured: ${this.uploadsPath}`);
  }

  /**
   * Extract text from an image file
   * Handles HEIC conversion and runs OCR
   */
  async extractText(imagePath: string): Promise<string[]> {
    this.logger.log(`Starting OCR for: ${imagePath}`);

    try {
      // Get absolute path
      const absolutePath = this.getAbsolutePath(imagePath);

      if (!fs.existsSync(absolutePath)) {
        this.logger.warn(`Image file not found: ${absolutePath}`);
        return [];
      }

      // Convert to JPEG if HEIC
      const processedPath = await this.prepareImage(absolutePath);

      // Run OCR
      const text = await this.runOcr(processedPath);

      // Cleanup temp file if created
      if (processedPath !== absolutePath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }

      return text;
    } catch (error) {
      this.logger.error(`OCR failed: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Convert URL path or relative path to absolute filesystem path
   */
  private getAbsolutePath(imagePath: string): string {
    // Handle /uploads/... URL paths (MUST check before isAbsolute since /uploads starts with /)
    if (imagePath.startsWith('/uploads/')) {
      const resolved = path.join(this.uploadsPath, imagePath.replace('/uploads/', ''));
      this.logger.debug(`Resolved /uploads path: ${imagePath} -> ${resolved}`);
      return resolved;
    }

    // Handle truly absolute filesystem paths (like /Users/...)
    if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) {
      return imagePath;
    }

    // Handle relative paths
    return path.join(this.uploadsPath, imagePath);
  }

  /**
   * Prepare image for OCR - convert HEIC to JPEG if needed
   */
  private async prepareImage(imagePath: string): Promise<string> {
    const ext = path.extname(imagePath).toLowerCase();

    // HEIC/HEIF needs conversion using macOS sips command (native HEIC support)
    if (ext === '.heic' || ext === '.heif') {
      const outputPath = imagePath.replace(/\.(heic|heif)$/i, '_ocr.jpg');

      this.logger.log(`Converting HEIC to JPEG using sips: ${outputPath}`);

      try {
        // Use macOS native sips command for HEIC conversion
        await execAsync(`sips -s format jpeg "${imagePath}" --out "${outputPath}"`);

        // Optimize the converted image for OCR
        const optimizedPath = imagePath.replace(/\.(heic|heif)$/i, '_ocr_opt.jpg');
        await sharp(outputPath)
          .grayscale()
          .normalize()
          .sharpen()
          .jpeg({ quality: 90 })
          .toFile(optimizedPath);

        // Remove intermediate file
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }

        return optimizedPath;
      } catch (error) {
        this.logger.error(`HEIC conversion failed: ${error.message}`);
        // Fallback: try to use the original file directly
        return imagePath;
      }
    }

    // For other formats, optimize for OCR
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      const outputPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_ocr.jpg');

      await sharp(imagePath)
        .grayscale() // Better for OCR
        .normalize() // Improve contrast
        .sharpen() // Sharpen text
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      return outputPath;
    }

    return imagePath;
  }

  /**
   * Run Tesseract OCR on image
   */
  private async runOcr(imagePath: string): Promise<string[]> {
    this.logger.log(`Running Tesseract on: ${imagePath}`);

    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          this.logger.debug(`OCR progress: ${Math.round(info.progress * 100)}%`);
        }
      },
    });

    const fullText = result.data.text;
    this.logger.log(`OCR completed. Raw text length: ${fullText.length}`);

    // Parse and clean the text
    const lines = this.parseOcrText(fullText);

    this.logger.log(`Extracted ${lines.length} relevant lines`);
    return lines;
  }

  /**
   * Parse and clean OCR output
   * Extract relevant card information
   */
  private parseOcrText(text: string): string[] {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 2); // Filter very short lines

    // Look for Pokemon-specific patterns
    const relevantLines: string[] = [];

    for (const line of lines) {
      // Skip obviously non-card text
      if (this.isIrrelevantText(line)) {
        continue;
      }

      // Clean the line
      const cleaned = this.cleanLine(line);
      if (cleaned && cleaned.length > 2) {
        relevantLines.push(cleaned);
      }
    }

    // Also extract any Pokemon names we can identify
    const pokemonNames = this.extractPokemonNames(lines.join(' '));

    // Combine and deduplicate
    const allText = [...new Set([...pokemonNames, ...relevantLines])];

    return allText.slice(0, 20); // Limit to 20 most relevant items
  }

  /**
   * Check if text is likely not card-related
   */
  private isIrrelevantText(text: string): boolean {
    const irrelevantPatterns = [
      /^[\d\s\.\,\-]+$/, // Only numbers and punctuation
      /^[a-z]{1,2}$/i, // Very short text
      /nintendo/i, // Copyright notices
      /game freak/i,
      /creatures/i,
      /illus\./i,
      /^hp\s*\d+$/i, // Just HP value
    ];

    return irrelevantPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Clean and normalize a line of text
   */
  private cleanLine(line: string): string {
    return line
      .replace(/[^\w\s\-\']/g, ' ') // Remove special chars except dash and apostrophe
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Extract potential Pokemon names from text
   * Common Pokemon names that might appear on cards
   */
  private extractPokemonNames(text: string): string[] {
    // Common Pokemon names - this helps with partial OCR matches
    const commonPokemon = [
      'Pikachu',
      'Charizard',
      'Blastoise',
      'Venusaur',
      'Mewtwo',
      'Mew',
      'Dragonite',
      'Gengar',
      'Alakazam',
      'Machamp',
      'Gyarados',
      'Lapras',
      'Snorlax',
      'Eevee',
      'Jolteon',
      'Flareon',
      'Vaporeon',
      'Articuno',
      'Zapdos',
      'Moltres',
      'Raichu',
      'Ninetales',
      'Arcanine',
      'Slowbro',
      'Magneton',
      'Haunter',
      'Electrode',
      'Exeggutor',
      'Chansey',
      'Kangaskhan',
      'Scyther',
      'Electabuzz',
      'Magmar',
      'Pinsir',
      'Tauros',
      'Ditto',
      'Aerodactyl',
      'Kabutops',
      'Omastar',
    ];

    const found: string[] = [];
    const upperText = text.toUpperCase();

    for (const pokemon of commonPokemon) {
      if (upperText.includes(pokemon.toUpperCase())) {
        found.push(pokemon);
      }
    }

    return found;
  }
}
