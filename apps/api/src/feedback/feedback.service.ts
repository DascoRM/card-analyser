import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateFeedbackDto } from './dto';
import { GradeFeedback } from '@prisma/client';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a feedback for a grade result
   */
  async create(
    sessionId: string,
    resultId: string,
    userId: number,
    createFeedbackDto: CreateFeedbackDto,
  ): Promise<GradeFeedback> {
    // Verify that the result exists and belongs to the user's session
    const result = await this.prisma.gradeResult.findUnique({
      where: { id: resultId },
      include: {
        session: {
          select: { userId: true },
        },
      },
    });

    if (!result) {
      throw new NotFoundException(`Grade result with ID ${resultId} not found`);
    }

    if (result.sessionId !== sessionId) {
      throw new NotFoundException(
        `Grade result ${resultId} does not belong to session ${sessionId}`,
      );
    }

    if (result.session.userId !== userId) {
      throw new ForbiddenException('You do not own this grade result');
    }

    // Create the feedback
    const feedback = await this.prisma.gradeFeedback.create({
      data: {
        resultId,
        userId,
        centering: createFeedbackDto.centering,
        corners: createFeedbackDto.corners,
        edges: createFeedbackDto.edges,
        surface: createFeedbackDto.surface,
        printQuality: createFeedbackDto.printQuality,
        comment: createFeedbackDto.comment,
      },
    });

    this.logger.log(
      `Feedback created for result ${resultId} by user ${userId}`,
    );

    return feedback;
  }

  /**
   * Get all feedbacks for a result
   */
  async findByResult(resultId: string): Promise<GradeFeedback[]> {
    return this.prisma.gradeFeedback.findMany({
      where: { resultId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all feedbacks (for ML training export)
   */
  async findAll(): Promise<GradeFeedback[]> {
    return this.prisma.gradeFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        result: {
          select: {
            centering: true,
            corners: true,
            edges: true,
            surface: true,
            printQuality: true,
            finalGrade: true,
            modelVersion: true,
          },
        },
      },
    });
  }

  /**
   * Export feedbacks for ML training
   */
  async exportForTraining(): Promise<object[]> {
    const feedbacks = await this.prisma.gradeFeedback.findMany({
      include: {
        result: {
          select: {
            centering: true,
            corners: true,
            edges: true,
            surface: true,
            printQuality: true,
            finalGrade: true,
            modelVersion: true,
            session: {
              select: {
                images: {
                  select: { url: true, side: true },
                },
              },
            },
          },
        },
      },
    });

    return feedbacks.map((f) => ({
      feedbackId: f.id,
      // Original ML scores
      original: {
        centering: f.result.centering,
        corners: f.result.corners,
        edges: f.result.edges,
        surface: f.result.surface,
        printQuality: f.result.printQuality,
        finalGrade: f.result.finalGrade,
      },
      // User corrections
      corrected: {
        centering: f.centering,
        corners: f.corners,
        edges: f.edges,
        surface: f.surface,
        printQuality: f.printQuality,
      },
      // Differences
      delta: {
        centering: f.centering - f.result.centering,
        corners: f.corners - f.result.corners,
        edges: f.edges - f.result.edges,
        surface: f.surface - f.result.surface,
        printQuality: f.printQuality - f.result.printQuality,
      },
      // Metadata
      comment: f.comment,
      modelVersion: f.result.modelVersion,
      images: f.result.session.images,
      createdAt: f.createdAt,
    }));
  }
}
