import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { MlService } from '../ml';
import { CardsService, CardIdentificationDto } from '../cards';
import { OcrService } from '../ocr';
import { CreateSessionDto, UpdateSessionDto, UploadImageDto } from './dto';
import {
  SessionStatus,
  GradeScale,
  CardSide,
  getGradeLabelForScale,
} from './enums';
import { IGradeCriteria } from './interfaces';
import { mapToPCAScale } from './utils';
import { Session, SessionImage, GradeResult } from '@prisma/client';

interface SessionFilters {
  status?: SessionStatus;
  cardType?: string;
}

type SessionWithRelations = Session & {
  images: SessionImage[];
  gradeResults: GradeResult[];
};

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlService: MlService,
    @Inject(forwardRef(() => CardsService))
    private readonly cardsService: CardsService,
    private readonly ocrService: OcrService,
  ) {}

  // ==================== CRUD ====================

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const { userId, ...data } = createSessionDto;

    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.session.create({
      data: {
        ...data,
        userId,
        status: SessionStatus.PENDING,
      },
    });
  }

  async findAll(
    userId: number,
    filters?: SessionFilters,
  ): Promise<SessionWithRelations[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.cardType) {
      where.cardType = filters.cardType;
    }

    return this.prisma.session.findMany({
      where,
      include: {
        images: true,
        gradeResults: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: number): Promise<SessionWithRelations> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        images: true,
        gradeResults: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not own this session');
    }

    return session;
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
    userId: number,
  ): Promise<Session> {
    await this.validateUserOwnership(id, userId);

    return this.prisma.session.update({
      where: { id },
      data: updateSessionDto,
    });
  }

  async remove(id: string, userId: number): Promise<Session> {
    await this.validateUserOwnership(id, userId);

    // Soft delete: on archive la session
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.ARCHIVED },
    });
  }

  // ==================== IMAGES ====================

  async uploadImage(
    sessionId: string,
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    userId: number,
  ): Promise<SessionImage> {
    await this.validateUserOwnership(sessionId, userId);
    await this.validateSessionStatus(sessionId, [
      SessionStatus.PENDING,
      SessionStatus.UPLOADING,
    ]);

    const { side } = uploadImageDto;

    // Vérifier qu'il n'y a pas déjà une image pour ce côté
    const existingImage = await this.prisma.sessionImage.findFirst({
      where: {
        sessionId,
        side,
      },
    });

    if (existingImage) {
      throw new BadRequestException(
        `An image for ${side} side already exists. Delete it first.`,
      );
    }

    // Créer l'image
    const image = await this.prisma.sessionImage.create({
      data: {
        sessionId,
        side,
        url: `/uploads/sessions/${file.filename}`,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    // Mettre à jour le status de la session
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.UPLOADING },
    });

    return image;
  }

  async deleteImage(
    sessionId: string,
    imageId: string,
    userId: number,
  ): Promise<void> {
    await this.validateUserOwnership(sessionId, userId);

    const image = await this.prisma.sessionImage.findFirst({
      where: {
        id: imageId,
        sessionId,
      },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    await this.prisma.sessionImage.delete({
      where: { id: imageId },
    });
  }

  async getSessionImages(
    sessionId: string,
    userId: number,
  ): Promise<SessionImage[]> {
    await this.validateUserOwnership(sessionId, userId);

    return this.prisma.sessionImage.findMany({
      where: { sessionId },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  // ==================== ANALYSE ====================

  async canAnalyze(sessionId: string): Promise<boolean> {
    const images = await this.prisma.sessionImage.findMany({
      where: { sessionId },
    });

    const hasFront = images.some((img) => img.side === CardSide.FRONT);
    const hasBack = images.some((img) => img.side === CardSide.BACK);

    return hasFront && hasBack;
  }

  async analyzeSession(
    sessionId: string,
    userId: number,
    scale: GradeScale,
  ): Promise<GradeResult> {
    await this.validateUserOwnership(sessionId, userId);
    await this.validateSessionStatus(sessionId, [
      SessionStatus.PENDING,
      SessionStatus.UPLOADING,
    ]);

    // Vérifier présence des 2 images
    const canAnalyze = await this.canAnalyze(sessionId);
    if (!canAnalyze) {
      throw new BadRequestException(
        'Session must have both FRONT and BACK images before analysis',
      );
    }

    // Récupérer les images
    const images = await this.prisma.sessionImage.findMany({
      where: { sessionId },
    });

    const frontImage = images.find((img) => img.side === CardSide.FRONT);
    const backImage = images.find((img) => img.side === CardSide.BACK);

    // Mettre à jour le status
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ANALYZING },
    });

    try {
      this.logger.log(`Starting ML analysis for session ${sessionId}`);

      // Appeler le ML Service
      const mlResult = await this.mlService.analyzeCard({
        frontImagePath: frontImage.url,
        backImagePath: backImage.url,
        sessionId,
      });

      this.logger.log(
        `ML analysis completed for session ${sessionId} - ` +
          `grade: ${mlResult.finalGrade} (${mlResult.gradeLabel}), ` +
          `confidence: ${mlResult.confidence}, method: ${mlResult.method}`,
      );

      // Enregistrer le résultat (using ML service values directly)
      const gradeResult = await this.prisma.gradeResult.create({
        data: {
          sessionId,
          scale,
          centering: mlResult.centering,
          corners: mlResult.corners,
          edges: mlResult.edges,
          surface: mlResult.surface,
          printQuality: mlResult.printQuality,
          finalGrade: mlResult.finalGrade,
          gradeLabel: mlResult.gradeLabel,
          confidence: mlResult.confidence,
          modelVersion: mlResult.modelVersion,
          analysisData: {
            ...(mlResult.rawData as object),
            method: mlResult.method,
          },
        },
      });

      // Mettre à jour la session
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      return gradeResult;
    } catch (error) {
      this.logger.error(
        `ML analysis failed for session ${sessionId}: ${error.message}`,
      );

      // En cas d'erreur, marquer comme FAILED
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.FAILED },
      });
      throw error;
    }
  }

  async getResults(sessionId: string, userId: number): Promise<GradeResult[]> {
    await this.validateUserOwnership(sessionId, userId);

    return this.prisma.gradeResult.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== CARD IDENTIFICATION ====================

  /**
   * Identify card from uploaded images using OCR + API matching
   */
  async identifyCard(
    sessionId: string,
    userId: number,
  ): Promise<CardIdentificationDto> {
    await this.validateUserOwnership(sessionId, userId);

    // Get session images
    const images = await this.prisma.sessionImage.findMany({
      where: { sessionId },
    });

    const frontImage = images.find((img) => img.side === CardSide.FRONT);

    if (!frontImage) {
      throw new BadRequestException('No front image found for identification');
    }

    this.logger.log(`Starting card identification for session ${sessionId}`);

    try {
      // For now, we'll use a simple approach:
      // Try to extract text from the image and match it with the card database
      // In a full implementation, this would call the ML service for OCR

      // Simulate OCR extraction (in reality, this would call mlService.extractCardInfo)
      const extractedText = await this.extractTextFromImage(frontImage.url);

      this.logger.log(
        `Extracted text for session ${sessionId}: ${JSON.stringify(extractedText)}`,
      );

      // Try to match the card using CardsService
      const matchedCard = await this.cardsService.matchCard({
        extractedText,
      });

      if (matchedCard) {
        // Update session with matched card info
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            cardName: matchedCard.name,
            cardSet: matchedCard.set,
            cardYear: this.parseYear(matchedCard.releaseDate),
            cardNumber: matchedCard.number,
            cardRarity: matchedCard.rarity,
            cardArtist: matchedCard.artist,
            cardImageUrl: matchedCard.imageUrl,
            identificationConfidence: 0.8, // High confidence when matched
            identificationMethod: 'ocr',
            pokemonTcgApiId: matchedCard.id,
          },
        });

        return {
          cardName: matchedCard.name,
          cardSet: matchedCard.set,
          cardYear: this.parseYear(matchedCard.releaseDate),
          cardNumber: matchedCard.number,
          cardType: matchedCard.supertype,
          cardRarity: matchedCard.rarity,
          cardArtist: matchedCard.artist,
          cardImageUrl: matchedCard.imageUrl,
          confidence: 0.8,
          method: 'ocr',
          extractedText,
          apiId: matchedCard.id,
        };
      }

      // Partial identification (couldn't match with database)
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          cardName: extractedText[0] || 'Unknown',
          identificationConfidence: 0.3,
          identificationMethod: 'ocr-partial',
        },
      });

      return {
        cardName: extractedText[0] || 'Unknown',
        confidence: 0.3,
        method: 'ocr-partial',
        extractedText,
      };
    } catch (error) {
      this.logger.error(
        `Card identification failed for session ${sessionId}: ${error.message}`,
      );

      // Return low confidence result
      return {
        cardName: 'Unknown',
        confidence: 0,
        method: 'ocr',
        extractedText: [],
      };
    }
  }

  /**
   * Update card info manually (user correction)
   */
  async updateCardInfo(
    sessionId: string,
    userId: number,
    cardInfo: {
      cardName?: string;
      cardSet?: string;
      cardYear?: number;
      cardType?: string;
    },
  ): Promise<Session> {
    await this.validateUserOwnership(sessionId, userId);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        ...cardInfo,
        identificationConfidence: 1, // Manual = high confidence
        identificationMethod: 'manual',
      },
    });
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  private async extractTextFromImage(imagePath: string): Promise<string[]> {
    this.logger.log(`Extracting text from: ${imagePath}`);
    return this.ocrService.extractText(imagePath);
  }

  private parseYear(dateString?: string): number | undefined {
    if (!dateString) return undefined;
    const year = parseInt(dateString.substring(0, 4), 10);
    return isNaN(year) ? undefined : year;
  }

  // ==================== GRADING LOGIC ====================

  calculateFinalGrade(criteria: IGradeCriteria): number {
    const { centering, corners, edges, surface, printQuality } = criteria;

    // Etape 1: calculer le score brut (minimum des criteres)
    const rawScore = Math.min(centering, corners, edges, surface, printQuality);

    // Etape 2: appliquer les regles PCA strictes
    return mapToPCAScale(rawScore, criteria);
  }

  getGradeLabel(finalGrade: number, scale: GradeScale = GradeScale.PCA): string {
    return getGradeLabelForScale(finalGrade, scale);
  }

  // ==================== VALIDATION ====================

  private async validateUserOwnership(
    sessionId: string,
    userId: number,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You do not own this session');
    }
  }

  private async validateSessionStatus(
    sessionId: string,
    allowedStatuses: SessionStatus[],
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (!allowedStatuses.includes(session.status as SessionStatus)) {
      throw new BadRequestException(
        `Session status must be one of: ${allowedStatuses.join(', ')}. Current: ${session.status}`,
      );
    }
  }
}
