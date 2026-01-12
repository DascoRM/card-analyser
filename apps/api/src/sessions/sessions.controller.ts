import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  UploadImageDto,
  AnalyzeSessionDto,
  SessionResponseDto,
} from './dto';
import { SessionStatus } from './enums';

@Controller('sessions')
@ApiTags('Sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // ==================== CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle session de grading' })
  @ApiResponse({
    status: 201,
    description: 'Session créée avec succès',
    type: SessionResponseDto,
  })
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les sessions de l\'utilisateur' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  @ApiQuery({ name: 'cardType', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste des sessions',
    type: [SessionResponseDto],
  })
  findAll(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('status') status?: SessionStatus,
    @Query('cardType') cardType?: string,
  ) {
    return this.sessionsService.findAll(userId, { status, cardType });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une session par ID' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Session trouvée',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une session' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Session mise à jour',
    type: SessionResponseDto,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.update(id, updateSessionDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archiver une session (soft delete)' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Session archivée',
    type: SessionResponseDto,
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.remove(id, userId);
  }

  // ==================== IMAGES ====================

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Uploader une image (recto ou verso)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        side: {
          type: 'string',
          enum: ['FRONT', 'BACK'],
        },
      },
    },
  })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Image uploadée avec succès' })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.uploadImage(id, file, uploadImageDto, userId);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Récupérer les images d\'une session' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des images' })
  getImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.getSessionImages(id, userId);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Supprimer une image' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Image supprimée' })
  deleteImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.deleteImage(id, imageId, userId);
  }

  // ==================== ANALYSE ====================

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Déclencher l\'analyse ML de la session' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Analyse terminée, résultat retourné',
  })
  @ApiResponse({
    status: 400,
    description: 'Images manquantes ou session dans un état invalide',
  })
  analyze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() analyzeSessionDto: AnalyzeSessionDto,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.analyzeSession(
      id,
      userId,
      analyzeSessionDto.scale,
    );
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Récupérer les résultats de grading' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Résultats de grading',
  })
  getResults(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.getResults(id, userId);
  }

  // ==================== CARD IDENTIFICATION ====================

  @Post(':id/identify')
  @ApiOperation({ summary: 'Identifier la carte à partir des images uploadées' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Carte identifiée',
  })
  @ApiResponse({
    status: 400,
    description: 'Image manquante',
  })
  identifyCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.identifyCard(id, userId);
  }

  @Patch(':id/card-info')
  @ApiOperation({ summary: 'Mettre à jour les informations de la carte manuellement' })
  @ApiQuery({ name: 'userId', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Informations mises à jour',
  })
  updateCardInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    cardInfo: {
      cardName?: string;
      cardSet?: string;
      cardYear?: number;
      cardType?: string;
    },
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.sessionsService.updateCardInfo(id, userId, cardInfo);
  }
}
