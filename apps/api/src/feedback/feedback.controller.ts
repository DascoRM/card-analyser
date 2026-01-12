import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto';

@ApiTags('Feedback')
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('sessions/:sessionId/results/:resultId/feedback')
  @ApiOperation({ summary: 'Submit feedback for a grade result' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'resultId', description: 'Grade result ID' })
  @ApiQuery({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 201, description: 'Feedback created successfully' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async create(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
    @Query('userId', ParseIntPipe) userId: number,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(
      sessionId,
      resultId,
      userId,
      createFeedbackDto,
    );
  }

  @Get('sessions/:sessionId/results/:resultId/feedback')
  @ApiOperation({ summary: 'Get feedbacks for a grade result' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'resultId', description: 'Grade result ID' })
  @ApiResponse({ status: 200, description: 'List of feedbacks' })
  async findByResult(
    @Param('resultId', ParseUUIDPipe) resultId: string,
  ) {
    return this.feedbackService.findByResult(resultId);
  }

  @Get('feedback/export')
  @ApiOperation({ summary: 'Export all feedbacks for ML training' })
  @ApiResponse({ status: 200, description: 'Exported feedbacks data' })
  async exportForTraining() {
    return this.feedbackService.exportForTraining();
  }
}
