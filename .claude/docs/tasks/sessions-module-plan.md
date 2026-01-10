# Plan : Module Sessions - API NestJS

## Contexte

Le module Sessions gère l'ensemble du processus de grading de cartes à collectionner. Une session représente une analyse complète d'une carte, de la capture des photos jusqu'au résultat final avec les notes PCA/PSA.

## Architecture du Module

### Structure des fichiers

```
apps/api/src/sessions/
├── dto/
│   ├── create-session.dto.ts
│   ├── update-session.dto.ts
│   ├── session-response.dto.ts
│   ├── grade-criteria.dto.ts
│   └── upload-images.dto.ts
├── entities/
│   └── session.entity.ts
├── enums/
│   ├── session-status.enum.ts
│   ├── grade-scale.enum.ts
│   └── card-side.enum.ts
├── interfaces/
│   ├── grade-result.interface.ts
│   └── ml-analysis.interface.ts
├── sessions.controller.ts
├── sessions.service.ts
├── sessions.module.ts
└── sessions.service.spec.ts
```

---

## 1. Modèle Prisma

### Schema à ajouter dans `prisma/schema.prisma`

```prisma
enum SessionStatus {
  PENDING          // Session créée, en attente d'upload
  UPLOADING        // Upload des images en cours
  ANALYZING        // Analyse ML en cours
  COMPLETED        // Analyse terminée avec succès
  FAILED           // Échec de l'analyse
  ARCHIVED         // Session archivée par l'utilisateur
}

enum CardSide {
  FRONT
  BACK
}

enum GradeScale {
  PCA
  PSA
}

model Session {
  id            String        @id @default(uuid())
  userId        Int
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Métadonnées de la carte
  cardName      String?
  cardSet       String?
  cardYear      Int?
  cardType      String?       // Pokemon, Sports, etc.

  // État de la session
  status        SessionStatus @default(PENDING)

  // Images uploadées
  images        SessionImage[]

  // Résultats de l'analyse
  gradeResults  GradeResult[]

  // Métadonnées
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  completedAt   DateTime?

  @@index([userId, status])
  @@index([createdAt])
}

model SessionImage {
  id          String    @id @default(uuid())
  sessionId   String
  session     Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Informations image
  side        CardSide
  url         String    // URL de stockage (S3, local, etc.)
  filename    String
  mimeType    String
  size        Int       // Taille en bytes
  width       Int?
  height      Int?

  // Métadonnées
  uploadedAt  DateTime  @default(now())

  @@index([sessionId])
}

model GradeResult {
  id          String      @id @default(uuid())
  sessionId   String
  session     Session     @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Type de grading
  scale       GradeScale  // PCA ou PSA

  // Scores détaillés (1-10)
  centering   Float
  corners     Float
  edges       Float
  surface     Float
  printQuality Float

  // Note finale (MIN de tous les critères)
  finalGrade  Float

  // Libellé (Gem Mint, Mint, etc.)
  gradeLabel  String

  // Confiance du modèle ML (0-1)
  confidence  Float?

  // Métadonnées ML
  modelVersion String?
  analysisData Json?      // Données brutes de l'analyse

  // Timestamps
  createdAt   DateTime    @default(now())

  @@index([sessionId])
}

// Mise à jour du modèle User
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String?
  sessions  Session[] // Relation one-to-many
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Migration Prisma

Commandes à exécuter après modification du schema:

```bash
cd apps/api
npx prisma format
npx prisma migrate dev --name add_sessions_module
npx prisma generate
```

---

## 2. Enums TypeScript

### `enums/session-status.enum.ts`

```typescript
export enum SessionStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}
```

### `enums/grade-scale.enum.ts`

```typescript
export enum GradeScale {
  PCA = 'PCA',
  PSA = 'PSA',
}

export const GRADE_LABELS = {
  10: 'Gem Mint',
  9: 'Mint',
  8: 'Near Mint / Mint',
  7: 'Near Mint',
  6: 'Excellent',
  5: 'Very Good',
  4: 'Good',
  3: 'Fair',
  2: 'Poor',
  1: 'Damaged',
} as const;
```

### `enums/card-side.enum.ts`

```typescript
export enum CardSide {
  FRONT = 'FRONT',
  BACK = 'BACK',
}
```

---

## 3. DTOs (Data Transfer Objects)

### `dto/create-session.dto.ts`

```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'ID de l\'utilisateur' })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ description: 'Nom de la carte' })
  @IsOptional()
  @IsString()
  cardName?: string;

  @ApiPropertyOptional({ description: 'Set de la carte' })
  @IsOptional()
  @IsString()
  cardSet?: string;

  @ApiPropertyOptional({ description: 'Année de la carte', minimum: 1900, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  cardYear?: number;

  @ApiPropertyOptional({ description: 'Type de carte (Pokemon, Sports, etc.)' })
  @IsOptional()
  @IsString()
  cardType?: string;
}
```

### `dto/update-session.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { SessionStatus } from '../enums/session-status.enum';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
}
```

### `dto/upload-images.dto.ts`

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardSide } from '../enums/card-side.enum';

export class UploadImageDto {
  @ApiProperty({ enum: CardSide, description: 'Face de la carte (FRONT ou BACK)' })
  @IsEnum(CardSide)
  @IsNotEmpty()
  side: CardSide;
}
```

### `dto/grade-criteria.dto.ts`

```typescript
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeCriteriaDto {
  @ApiProperty({ description: 'Score centrage (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  centering: number;

  @ApiProperty({ description: 'Score coins (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  corners: number;

  @ApiProperty({ description: 'Score arêtes (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  edges: number;

  @ApiProperty({ description: 'Score surface (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  surface: number;

  @ApiProperty({ description: 'Score qualité impression (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  printQuality: number;
}
```

### `dto/session-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../enums/session-status.enum';
import { GradeScale } from '../enums/grade-scale.enum';

export class SessionImageResponseDto {
  id: string;
  side: string;
  url: string;
  filename: string;
  uploadedAt: Date;
}

export class GradeResultResponseDto {
  id: string;
  scale: GradeScale;
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  finalGrade: number;
  gradeLabel: string;
  confidence?: number;
  createdAt: Date;
}

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  cardName?: string;

  @ApiProperty()
  cardSet?: string;

  @ApiProperty()
  cardYear?: number;

  @ApiProperty()
  cardType?: string;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiProperty({ type: [SessionImageResponseDto] })
  images: SessionImageResponseDto[];

  @ApiProperty({ type: [GradeResultResponseDto] })
  gradeResults: GradeResultResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  completedAt?: Date;
}
```

---

## 4. Interfaces

### `interfaces/grade-result.interface.ts`

```typescript
import { GradeScale } from '../enums/grade-scale.enum';

export interface IGradeCriteria {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
}

export interface IGradeResult {
  scale: GradeScale;
  criteria: IGradeCriteria;
  finalGrade: number;
  gradeLabel: string;
  confidence?: number;
}
```

### `interfaces/ml-analysis.interface.ts`

```typescript
export interface IMLAnalysisInput {
  frontImagePath: string;
  backImagePath: string;
  sessionId: string;
}

export interface IMLAnalysisOutput {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  printQuality: number;
  confidence: number;
  modelVersion: string;
  rawData?: any;
}
```

---

## 5. Service - `sessions.service.ts`

### Responsabilités

1. **CRUD de base**
   - `create(createSessionDto)` : Créer une nouvelle session
   - `findAll(userId, filters)` : Lister les sessions d'un utilisateur
   - `findOne(id, userId)` : Récupérer une session par ID
   - `update(id, updateSessionDto, userId)` : Mettre à jour une session
   - `remove(id, userId)` : Supprimer une session (soft delete vers ARCHIVED)

2. **Upload d'images**
   - `uploadImage(sessionId, file, side, userId)` : Upload une image recto ou verso
   - `deleteImage(sessionId, imageId, userId)` : Supprimer une image
   - `getSessionImages(sessionId, userId)` : Récupérer les images d'une session

3. **Analyse et grading**
   - `analyzeSession(sessionId, userId)` : Déclencher l'analyse ML
   - `calculateGrade(criteria, scale)` : Calculer la note finale (MIN des critères)
   - `getGradeLabel(finalGrade)` : Obtenir le libellé textuel

4. **Validation métier**
   - Vérifier que l'utilisateur possède la session
   - Vérifier que la session a bien 2 images (recto + verso) avant analyse
   - Vérifier que la session est dans le bon état pour chaque opération

### Méthodes principales

```typescript
@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // CRUD
  async create(createSessionDto: CreateSessionDto): Promise<Session>
  async findAll(userId: number, filters?: SessionFilters): Promise<Session[]>
  async findOne(id: string, userId: number): Promise<Session>
  async update(id: string, updateSessionDto: UpdateSessionDto, userId: number): Promise<Session>
  async remove(id: string, userId: number): Promise<Session>

  // Images
  async uploadImage(sessionId: string, file: Express.Multer.File, side: CardSide, userId: number): Promise<SessionImage>
  async deleteImage(sessionId: string, imageId: string, userId: number): Promise<void>
  async getSessionImages(sessionId: string, userId: number): Promise<SessionImage[]>

  // Analyse
  async analyzeSession(sessionId: string, userId: number, scale: GradeScale): Promise<GradeResult>
  async canAnalyze(sessionId: string): Promise<boolean>

  // Grading
  calculateFinalGrade(criteria: IGradeCriteria): number // return Math.min(...)
  getGradeLabel(finalGrade: number): string

  // Validation
  private async validateUserOwnership(sessionId: string, userId: number): Promise<void>
  private async validateSessionStatus(sessionId: string, allowedStatuses: SessionStatus[]): Promise<void>
}
```

### Logique de calcul du grade

```typescript
calculateFinalGrade(criteria: IGradeCriteria): number {
  const { centering, corners, edges, surface, printQuality } = criteria;
  return Math.min(centering, corners, edges, surface, printQuality);
}

getGradeLabel(finalGrade: number): string {
  const rounded = Math.floor(finalGrade);
  return GRADE_LABELS[rounded] || 'Unknown';
}
```

---

## 6. Controller - `sessions.controller.ts`

### Endpoints REST

#### Sessions CRUD

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/sessions` | Créer une nouvelle session | Oui |
| GET | `/sessions` | Lister toutes les sessions de l'utilisateur | Oui |
| GET | `/sessions/:id` | Récupérer une session par ID | Oui |
| PATCH | `/sessions/:id` | Mettre à jour une session | Oui |
| DELETE | `/sessions/:id` | Archiver une session | Oui |

#### Upload d'images

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/sessions/:id/images` | Upload une image (multipart/form-data) | Oui |
| GET | `/sessions/:id/images` | Récupérer les images d'une session | Oui |
| DELETE | `/sessions/:id/images/:imageId` | Supprimer une image | Oui |

#### Analyse

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/sessions/:id/analyze` | Déclencher l'analyse ML | Oui |
| GET | `/sessions/:id/results` | Récupérer les résultats de grading | Oui |

### Structure du controller

```typescript
@Controller('sessions')
@ApiTags('Sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle session' })
  create(@Body() createSessionDto: CreateSessionDto)

  @Get()
  @ApiOperation({ summary: 'Lister les sessions' })
  findAll(@Query('userId') userId: number, @Query() filters: any)

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une session' })
  findOne(@Param('id') id: string, @Query('userId') userId: number)

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une session' })
  update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto, @Query('userId') userId: number)

  @Delete(':id')
  @ApiOperation({ summary: 'Archiver une session' })
  remove(@Param('id') id: string, @Query('userId') userId: number)

  // Images
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload une image' })
  @ApiConsumes('multipart/form-data')
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @Query('userId') userId: number
  )

  @Get(':id/images')
  @ApiOperation({ summary: 'Récupérer les images' })
  getImages(@Param('id') id: string, @Query('userId') userId: number)

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Supprimer une image' })
  deleteImage(@Param('id') id: string, @Param('imageId') imageId: string, @Query('userId') userId: number)

  // Analyse
  @Post(':id/analyze')
  @ApiOperation({ summary: 'Analyser la session' })
  analyze(@Param('id') id: string, @Query('userId') userId: number, @Body('scale') scale: GradeScale)

  @Get(':id/results')
  @ApiOperation({ summary: 'Récupérer les résultats' })
  getResults(@Param('id') id: string, @Query('userId') userId: number)
}
```

---

## 7. Module - `sessions.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads', // Temporaire, à remplacer par S3 en production
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
```

### Enregistrement dans `app.module.ts`

```typescript
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SessionsModule, // Ajouter ici
  ],
  // ...
})
export class AppModule {}
```

---

## 8. Tests - `sessions.service.spec.ts`

### Cas de test à couvrir

```typescript
describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SessionsService, PrismaService],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a session with PENDING status');
    it('should associate session with user');
  });

  describe('findAll', () => {
    it('should return only sessions for the given userId');
    it('should filter by status');
  });

  describe('findOne', () => {
    it('should return session if user owns it');
    it('should throw NotFoundException if session does not exist');
    it('should throw ForbiddenException if user does not own session');
  });

  describe('uploadImage', () => {
    it('should upload image and update session status to UPLOADING');
    it('should validate card side (FRONT/BACK)');
    it('should not allow more than 1 image per side');
  });

  describe('analyzeSession', () => {
    it('should require 2 images before analyzing');
    it('should update status to ANALYZING');
    it('should call ML service');
    it('should create GradeResult with calculated final grade');
    it('should update status to COMPLETED on success');
    it('should update status to FAILED on error');
  });

  describe('calculateFinalGrade', () => {
    it('should return MIN of all criteria');
    it('should handle edge cases (all 10s, all 1s)');
  });

  describe('getGradeLabel', () => {
    it('should return "Gem Mint" for grade 10');
    it('should return "Mint" for grade 9');
    it('should return correct label for each grade');
  });
});
```

---

## 9. Intégration avec le ML Service (à venir)

Le `SessionsService` devra communiquer avec un futur `MLService` pour l'analyse des images.

### Interface d'intégration

```typescript
// À implémenter dans un futur module ML
interface IMLService {
  analyzeCard(input: IMLAnalysisInput): Promise<IMLAnalysisOutput>;
}

// Dans SessionsService.analyzeSession()
async analyzeSession(sessionId: string, userId: number, scale: GradeScale): Promise<GradeResult> {
  // 1. Valider ownership et status
  await this.validateUserOwnership(sessionId, userId);
  await this.validateSessionStatus(sessionId, [SessionStatus.PENDING, SessionStatus.UPLOADING]);

  // 2. Vérifier présence des 2 images
  const canAnalyze = await this.canAnalyze(sessionId);
  if (!canAnalyze) {
    throw new BadRequestException('Session must have both FRONT and BACK images');
  }

  // 3. Mettre à jour le status
  await this.prisma.session.update({
    where: { id: sessionId },
    data: { status: SessionStatus.ANALYZING },
  });

  try {
    // 4. Appeler le ML Service (à implémenter)
    const images = await this.getSessionImages(sessionId, userId);
    const frontImage = images.find(img => img.side === CardSide.FRONT);
    const backImage = images.find(img => img.side === CardSide.BACK);

    const mlResult = await this.mlService.analyzeCard({
      frontImagePath: frontImage.url,
      backImagePath: backImage.url,
      sessionId,
    });

    // 5. Calculer le grade final
    const finalGrade = this.calculateFinalGrade({
      centering: mlResult.centering,
      corners: mlResult.corners,
      edges: mlResult.edges,
      surface: mlResult.surface,
      printQuality: mlResult.printQuality,
    });

    const gradeLabel = this.getGradeLabel(finalGrade);

    // 6. Enregistrer le résultat
    const gradeResult = await this.prisma.gradeResult.create({
      data: {
        sessionId,
        scale,
        centering: mlResult.centering,
        corners: mlResult.corners,
        edges: mlResult.edges,
        surface: mlResult.surface,
        printQuality: mlResult.printQuality,
        finalGrade,
        gradeLabel,
        confidence: mlResult.confidence,
        modelVersion: mlResult.modelVersion,
        analysisData: mlResult.rawData,
      },
    });

    // 7. Mettre à jour la session
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return gradeResult;
  } catch (error) {
    // 8. En cas d'erreur, marquer comme FAILED
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.FAILED },
    });
    throw error;
  }
}
```

---

## 10. Gestion du stockage des images

### Options

**Option 1 : Stockage local (développement)**
- Utiliser `multer` avec destination `./uploads`
- Servir les images via un endpoint statique

**Option 2 : AWS S3 (production)**
- Utiliser `@aws-sdk/client-s3`
- Générer des presigned URLs pour l'upload direct depuis le client
- Stocker uniquement l'URL S3 en base de données

### Recommandation

Commencer avec le stockage local pour le POC, puis migrer vers S3 pour la production.

```typescript
// Configuration dans SessionsModule
MulterModule.register({
  storage: diskStorage({
    destination: './uploads/sessions',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
});
```

---

## 11. Validation et sécurité

### Guards à implémenter (futur)

```typescript
@UseGuards(JwtAuthGuard)  // Authentification
@UseGuards(SessionOwnershipGuard)  // Vérifier que l'utilisateur possède la session
```

### Pipes de validation

Utiliser `class-validator` et `class-transformer` pour valider tous les DTOs automatiquement via le `ValidationPipe` global.

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

---

## 12. Documentation API (Swagger)

Utiliser les décorateurs `@nestjs/swagger` pour générer automatiquement la documentation:

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Card Grading API')
  .setDescription('API pour la certification automatique de cartes à collectionner')
  .setVersion('1.0')
  .addTag('Sessions')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## 13. Checklist d'implémentation

### Phase 1 : Modèle de données
- [ ] Modifier `prisma/schema.prisma` avec les modèles Session, SessionImage, GradeResult
- [ ] Mettre à jour le modèle User avec la relation sessions
- [ ] Exécuter `prisma migrate dev`
- [ ] Exécuter `prisma generate`

### Phase 2 : Structure du module
- [ ] Créer la structure de dossiers `src/sessions/`
- [ ] Créer les enums (SessionStatus, GradeScale, CardSide)
- [ ] Créer les interfaces (grade-result, ml-analysis)

### Phase 3 : DTOs
- [ ] Créer `create-session.dto.ts`
- [ ] Créer `update-session.dto.ts`
- [ ] Créer `upload-images.dto.ts`
- [ ] Créer `grade-criteria.dto.ts`
- [ ] Créer `session-response.dto.ts`

### Phase 4 : Service
- [ ] Créer `sessions.service.ts`
- [ ] Implémenter CRUD de base (create, findAll, findOne, update, remove)
- [ ] Implémenter gestion des images (uploadImage, deleteImage, getSessionImages)
- [ ] Implémenter logique de grading (calculateFinalGrade, getGradeLabel)
- [ ] Implémenter méthodes de validation (validateUserOwnership, validateSessionStatus)
- [ ] Préparer l'intégration ML (analyzeSession avec mock pour le moment)

### Phase 5 : Controller
- [ ] Créer `sessions.controller.ts`
- [ ] Implémenter endpoints CRUD
- [ ] Implémenter endpoints upload d'images (avec multer)
- [ ] Implémenter endpoint d'analyse
- [ ] Ajouter décorateurs Swagger

### Phase 6 : Module
- [ ] Créer `sessions.module.ts`
- [ ] Configurer MulterModule
- [ ] Enregistrer providers et controllers
- [ ] Importer dans `app.module.ts`

### Phase 7 : Tests
- [ ] Créer `sessions.service.spec.ts`
- [ ] Écrire tests unitaires pour le service
- [ ] Créer `sessions.controller.spec.ts` (optionnel)
- [ ] Tester manuellement les endpoints avec Postman/Insomnia

### Phase 8 : Documentation
- [ ] Configurer Swagger dans `main.ts`
- [ ] Vérifier la documentation auto-générée

---

## 14. Améliorations futures

### Court terme
- Implémenter l'authentification JWT
- Créer des Guards pour la sécurité
- Ajouter pagination sur `findAll`
- Implémenter le stockage S3

### Moyen terme
- Intégrer le ML Service réel
- Ajouter WebSocket pour notifier les clients de l'avancement de l'analyse
- Implémenter un système de queue (Bull) pour gérer les analyses en background
- Ajouter des filtres avancés (par date, par status, par grade)

### Long terme
- Permettre plusieurs résultats de grading par session (historique)
- Ajouter un système de révision manuelle
- Implémenter un cache Redis pour les sessions récentes
- Ajouter des métriques et monitoring (Prometheus)

---

## Conclusion

Ce plan fournit une architecture complète et scalable pour le module Sessions. Il respecte les principes NestJS (DI, modularité, séparation des responsabilités) et les règles métier du projet (calcul de grade côté serveur uniquement).

L'implémentation devrait être faite de manière itérative en suivant la checklist, en commençant par le modèle de données et en terminant par les tests et la documentation.
