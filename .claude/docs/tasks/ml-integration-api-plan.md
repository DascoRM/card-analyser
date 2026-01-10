# Plan d'intégration ML dans l'API NestJS

**Date**: 2026-01-10
**Agent**: nestjs-expert
**Tâche**: Intégrer le service ML TensorFlow dans l'API NestJS existante

---

## 1. Recommandation d'architecture

### ✅ Option recommandée: API Python FastAPI (sidecar)

**Justification**:
- **Simplicité**: Un seul endpoint HTTP à appeler depuis NestJS
- **Performance**: Python natif pour TensorFlow (meilleur que TF.js)
- **Isolation**: Le service ML peut crasher sans affecter l'API principale
- **Scalabilité**: Facile à dockeriser et scaler indépendamment
- **Développement**: Peut être développé en parallèle du backend
- **Debugging**: Logs séparés, plus facile à diagnostiquer

**Comparaison avec les autres options**:

| Critère | TF Serving | TF.js Node | FastAPI Sidecar |
|---------|-----------|------------|-----------------|
| Complexité setup | ⚠️ Haute | ✅ Faible | ✅ Moyenne |
| Performance | 🚀 Excellente | ⚠️ Limitée | ✅ Bonne |
| Flexibilité | ⚠️ Limitée | ✅ Totale | ✅ Totale |
| Infrastructure | ⚠️ Lourde | ✅ Légère | ✅ Légère |
| Préprocessing custom | ⚠️ Difficile | ✅ Facile | ✅ Facile |
| Coût opérationnel | ⚠️ Élevé | ✅ Faible | ✅ Moyen |

### Architecture globale

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐
│                 │ ──────────────────> │                  │
│   NestJS API    │                     │  Python FastAPI  │
│   (Port 3000)   │ <────────────────── │   (Port 8000)    │
│                 │      JSON Response   │                  │
└─────────────────┘                     └──────────────────┘
        │                                        │
        │                                        │
        v                                        v
  ┌──────────┐                           ┌─────────────┐
  │ PostgreSQL│                           │ TensorFlow  │
  └──────────┘                           │   Model     │
                                          └─────────────┘
```

---

## 2. Structure du MLModule NestJS

### 2.1 Arborescence proposée

```
apps/api/src/ml/
├── ml.module.ts              # Module principal
├── ml.service.ts             # Service ML avec appels HTTP
├── ml.controller.ts          # Controller pour health checks
├── dto/
│   ├── analyze-card.dto.ts   # DTO pour l'analyse
│   └── ml-response.dto.ts    # DTO de réponse ML
├── interfaces/
│   ├── ml-config.interface.ts
│   └── ml-analysis.interface.ts (existe déjà dans sessions/)
├── exceptions/
│   ├── ml-service-unavailable.exception.ts
│   └── ml-analysis-failed.exception.ts
└── __tests__/
    ├── ml.service.spec.ts
    └── ml.controller.spec.ts
```

### 2.2 ml.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MlService } from './ml.service';
import { MlController } from './ml.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // 30s timeout
      maxRedirects: 5,
    }),
  ],
  controllers: [MlController],
  providers: [MlService],
  exports: [MlService], // Pour utilisation dans SessionsModule
})
export class MlModule {}
```

**Points clés**:
- `HttpModule` d'Axios pour les appels HTTP
- Timeout configuré à 30s (analyse peut être longue)
- Export du service pour injection dans SessionsService

---

## 3. Service MLService avec méthodes

### 3.1 ml.service.ts - Structure complète

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMLAnalysisInput, IMLAnalysisOutput } from './interfaces';
import {
  MlServiceUnavailableException,
  MlAnalysisFailedException,
} from './exceptions';

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly mlServiceUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://localhost:8000',
    );
    this.timeout = this.configService.get<number>('ML_TIMEOUT', 30000);
    this.maxRetries = this.configService.get<number>('ML_MAX_RETRIES', 3);
  }

  /**
   * Analyse une carte via le service ML
   */
  async analyzeCard(input: IMLAnalysisInput): Promise<IMLAnalysisOutput> {
    this.logger.log(`Analyzing session ${input.sessionId}`);

    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.performAnalysis(input, attempt);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `ML analysis attempt ${attempt}/${this.maxRetries} failed: ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.exponentialBackoff(attempt);
        }
      }
    }

    throw new MlAnalysisFailedException(
      `Failed after ${this.maxRetries} attempts: ${lastError.message}`,
    );
  }

  /**
   * Effectue une seule tentative d'analyse
   */
  private async performAnalysis(
    input: IMLAnalysisInput,
    attempt: number,
  ): Promise<IMLAnalysisOutput> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.post<IMLAnalysisOutput>(
          `${this.mlServiceUrl}/analyze`,
          {
            front_image: input.frontImagePath,
            back_image: input.backImagePath,
            session_id: input.sessionId,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': `${input.sessionId}-${Date.now()}`,
            },
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `ML analysis completed in ${duration}ms (attempt ${attempt})`,
      );

      return this.validateMLResponse(response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new MlServiceUnavailableException('ML service is not reachable');
      }
      if (error.response?.status >= 500) {
        throw new MlServiceUnavailableException(
          `ML service error: ${error.response.status}`,
        );
      }
      throw error;
    }
  }

  /**
   * Valide la réponse du service ML
   */
  private validateMLResponse(data: any): IMLAnalysisOutput {
    const requiredFields = [
      'centering',
      'corners',
      'edges',
      'surface',
      'printQuality',
      'confidence',
      'modelVersion',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new MlAnalysisFailedException(`Missing field: ${field}`);
      }
    }

    // Valider les ranges
    const scoreFields = ['centering', 'corners', 'edges', 'surface', 'printQuality'];
    for (const field of scoreFields) {
      if (data[field] < 1 || data[field] > 10) {
        throw new MlAnalysisFailedException(
          `${field} must be between 1 and 10, got ${data[field]}`,
        );
      }
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new MlAnalysisFailedException(
        `confidence must be between 0 and 1, got ${data.confidence}`,
      );
    }

    return data as IMLAnalysisOutput;
  }

  /**
   * Backoff exponentiel entre les retries
   */
  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    this.logger.debug(`Waiting ${delay}ms before retry`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Health check du service ML
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.mlServiceUrl}/health`, {
          timeout: 5000,
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`ML service health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Récupère les métadonnées du modèle ML
   */
  async getModelInfo(): Promise<{ version: string; lastUpdated: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.mlServiceUrl}/model/info`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch model info: ${error.message}`);
      throw new MlServiceUnavailableException('Cannot fetch model info');
    }
  }
}
```

### 3.2 Méthodes clés expliquées

| Méthode | Responsabilité | Points critiques |
|---------|----------------|------------------|
| `analyzeCard()` | Point d'entrée principal | Gère les retries automatiques |
| `performAnalysis()` | Appel HTTP effectif | Gère timeouts et erreurs réseau |
| `validateMLResponse()` | Validation stricte | Vérifie ranges et champs requis |
| `exponentialBackoff()` | Délai entre retries | Cap à 10s maximum |
| `healthCheck()` | Monitoring | Timeout court (5s) |
| `getModelInfo()` | Métadonnées | Version du modèle déployé |

---

## 4. Configuration (URLs, timeouts, retry)

### 4.1 Variables d'environnement (.env)

```bash
# ML Service Configuration
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT=30000          # 30 secondes
ML_MAX_RETRIES=3          # Nombre de tentatives
ML_ENABLE_FALLBACK=true   # Activer le fallback mock
```

### 4.2 Configuration TypeScript (ml-config.interface.ts)

```typescript
export interface IMLConfig {
  serviceUrl: string;
  timeout: number;
  maxRetries: number;
  enableFallback: boolean;
}

export const ML_CONFIG_DEFAULTS: IMLConfig = {
  serviceUrl: 'http://localhost:8000',
  timeout: 30000,
  maxRetries: 3,
  enableFallback: true,
};
```

### 4.3 Stratégie de retry

```typescript
// Dans ml.service.ts
private getRetryConfig() {
  return {
    maxAttempts: this.maxRetries,
    backoffStrategy: 'exponential', // 1s, 2s, 4s, 8s (cap 10s)
    retryableErrors: [
      'ECONNREFUSED',    // Service down
      'ETIMEDOUT',        // Timeout
      'ENOTFOUND',        // DNS issue
      'HTTP_5XX',         // Server errors
    ],
    nonRetryableErrors: [
      'HTTP_4XX',         // Client errors (bad request)
      'VALIDATION_ERROR', // Bad ML response
    ],
  };
}
```

---

## 5. Gestion des erreurs et fallbacks

### 5.1 Exceptions personnalisées

**exceptions/ml-service-unavailable.exception.ts**:
```typescript
import { ServiceUnavailableException } from '@nestjs/common';

export class MlServiceUnavailableException extends ServiceUnavailableException {
  constructor(message: string = 'ML service is unavailable') {
    super({
      statusCode: 503,
      message,
      error: 'ML_SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }
}
```

**exceptions/ml-analysis-failed.exception.ts**:
```typescript
import { BadRequestException } from '@nestjs/common';

export class MlAnalysisFailedException extends BadRequestException {
  constructor(message: string) {
    super({
      statusCode: 400,
      message,
      error: 'ML_ANALYSIS_FAILED',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 5.2 Fallback vers mock (mode dégradé)

```typescript
// Dans ml.service.ts
async analyzeCard(input: IMLAnalysisInput): Promise<IMLAnalysisOutput> {
  try {
    return await this.performAnalysisWithRetries(input);
  } catch (error) {
    const enableFallback = this.configService.get<boolean>('ML_ENABLE_FALLBACK', false);

    if (enableFallback) {
      this.logger.warn('ML service failed, using fallback mock');
      return this.fallbackAnalysis(input);
    }

    throw error;
  }
}

private fallbackAnalysis(input: IMLAnalysisInput): IMLAnalysisOutput {
  const randomScore = () => Math.round((7 + Math.random() * 3) * 10) / 10;

  return {
    centering: randomScore(),
    corners: randomScore(),
    edges: randomScore(),
    surface: randomScore(),
    printQuality: randomScore(),
    confidence: 0.5, // Faible confiance = mode fallback
    modelVersion: 'fallback-v1.0.0',
    rawData: {
      fallback: true,
      reason: 'ML service unavailable',
      timestamp: new Date().toISOString(),
    },
  };
}
```

### 5.3 Circuit Breaker (optionnel, phase 2)

Pour éviter de spammer un service down:
```typescript
// Utiliser une librairie comme opossum
import CircuitBreaker from 'opossum';

const options = {
  timeout: 30000,           // Timeout par appel
  errorThresholdPercentage: 50, // 50% d'erreurs
  resetTimeout: 30000,      // Réessayer après 30s
};

this.circuitBreaker = new CircuitBreaker(this.performAnalysis.bind(this), options);
```

---

## 6. Health checks

### 6.1 ml.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common';
import { MlService } from './ml.service';

@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Get('health')
  async health() {
    const isHealthy = await this.mlService.healthCheck();
    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'ml',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('model/info')
  async modelInfo() {
    return this.mlService.getModelInfo();
  }
}
```

### 6.2 Intégration avec HealthCheck global

```typescript
// Dans app.module.ts ou health.module.ts
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    MlModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}

// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HttpHealthIndicator, HealthCheckService } from '@nestjs/terminus';
import { MlService } from '../ml/ml.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private mlService: MlService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('database', 'http://localhost:5432'),
      async () => {
        const isHealthy = await this.mlService.healthCheck();
        return {
          ml_service: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
    ]);
  }
}
```

---

## 7. Tests et mocks

### 7.1 ml.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { MlService } from './ml.service';
import { IMLAnalysisInput, IMLAnalysisOutput } from './interfaces';
import { MlServiceUnavailableException } from './exceptions';

describe('MlService', () => {
  let service: MlService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockMLResponse: IMLAnalysisOutput = {
    centering: 9.0,
    corners: 8.5,
    edges: 9.0,
    surface: 8.0,
    printQuality: 9.5,
    confidence: 0.92,
    modelVersion: 'v1.0.0',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MlService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                ML_SERVICE_URL: 'http://localhost:8000',
                ML_TIMEOUT: 30000,
                ML_MAX_RETRIES: 3,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MlService>(MlService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('analyzeCard', () => {
    it('should successfully analyze a card', async () => {
      const input: IMLAnalysisInput = {
        frontImagePath: '/uploads/front.jpg',
        backImagePath: '/uploads/back.jpg',
        sessionId: 'test-session-123',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockMLResponse, status: 200 } as any),
      );

      const result = await service.analyzeCard(input);

      expect(result).toEqual(mockMLResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze',
        expect.objectContaining({
          front_image: input.frontImagePath,
          back_image: input.backImagePath,
          session_id: input.sessionId,
        }),
        expect.any(Object),
      );
    });

    it('should retry on network error', async () => {
      const input: IMLAnalysisInput = {
        frontImagePath: '/uploads/front.jpg',
        backImagePath: '/uploads/back.jpg',
        sessionId: 'test-session-123',
      };

      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(
          throwError(() => ({ code: 'ECONNREFUSED' })),
        )
        .mockReturnValueOnce(
          of({ data: mockMLResponse, status: 200 } as any),
        );

      const result = await service.analyzeCard(input);

      expect(result).toEqual(mockMLResponse);
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const input: IMLAnalysisInput = {
        frontImagePath: '/uploads/front.jpg',
        backImagePath: '/uploads/back.jpg',
        sessionId: 'test-session-123',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ code: 'ECONNREFUSED' })),
      );

      await expect(service.analyzeCard(input)).rejects.toThrow();
      expect(httpService.post).toHaveBeenCalledTimes(3); // max retries
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200 } as any),
      );

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when service is down', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('Service down')),
      );

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('validateMLResponse', () => {
    it('should throw on missing fields', () => {
      const invalidResponse = {
        centering: 9.0,
        // missing other fields
      };

      expect(() => service['validateMLResponse'](invalidResponse)).toThrow();
    });

    it('should throw on invalid score ranges', () => {
      const invalidResponse = {
        ...mockMLResponse,
        centering: 11, // out of range
      };

      expect(() => service['validateMLResponse'](invalidResponse)).toThrow();
    });
  });
});
```

### 7.2 Mock du MLService pour SessionsService

```typescript
// Dans sessions.service.spec.ts
const mockMlService = {
  analyzeCard: jest.fn().mockResolvedValue({
    centering: 9.0,
    corners: 8.5,
    edges: 9.0,
    surface: 8.0,
    printQuality: 9.5,
    confidence: 0.92,
    modelVersion: 'v1.0.0',
  }),
  healthCheck: jest.fn().mockResolvedValue(true),
};

// Dans le TestingModule
providers: [
  SessionsService,
  {
    provide: MlService,
    useValue: mockMlService,
  },
  // ...
]
```

---

## 8. Checklist d'implémentation

### Phase 1: Setup de base
- [ ] Créer la structure de dossiers `apps/api/src/ml/`
- [ ] Installer dépendances: `@nestjs/axios`, `rxjs`
- [ ] Créer `ml.module.ts` avec imports HttpModule et ConfigModule
- [ ] Créer interfaces `IMLConfig`, `IMLAnalysisInput`, `IMLAnalysisOutput`
- [ ] Créer les exceptions personnalisées
- [ ] Ajouter variables d'environnement dans `.env`

### Phase 2: Service ML
- [ ] Implémenter `ml.service.ts` avec méthode `analyzeCard()`
- [ ] Implémenter logique de retry avec backoff exponentiel
- [ ] Implémenter validation de réponse ML
- [ ] Implémenter `healthCheck()` et `getModelInfo()`
- [ ] Ajouter logging avec Winston ou Logger natif
- [ ] Implémenter fallback mock si `ML_ENABLE_FALLBACK=true`

### Phase 3: Controller
- [ ] Créer `ml.controller.ts` avec endpoints `/ml/health` et `/ml/model/info`
- [ ] Ajouter décorateurs Swagger pour documentation

### Phase 4: Intégration dans SessionsService
- [ ] Injecter `MlService` dans `SessionsService`
- [ ] Remplacer `mockMLAnalysis()` par `mlService.analyzeCard()`
- [ ] Adapter l'appel avec les bons chemins d'images
- [ ] Gérer les erreurs ML (try/catch autour de l'appel)
- [ ] Logger les résultats ML avant sauvegarde en DB

### Phase 5: Tests
- [ ] Écrire tests unitaires `ml.service.spec.ts`
  - [ ] Test succès analyse
  - [ ] Test retry sur erreur réseau
  - [ ] Test échec après max retries
  - [ ] Test validation réponse
  - [ ] Test health check
- [ ] Écrire tests `ml.controller.spec.ts`
- [ ] Adapter `sessions.service.spec.ts` avec mock MLService
- [ ] Écrire tests E2E pour le flow complet

### Phase 6: Documentation
- [ ] Ajouter JSDoc sur toutes les méthodes publiques
- [ ] Documenter les exceptions possibles
- [ ] Créer README dans `apps/api/src/ml/README.md`
- [ ] Ajouter exemples d'utilisation
- [ ] Documenter variables d'environnement

### Phase 7: Monitoring & Production
- [ ] Intégrer avec module HealthCheck (@nestjs/terminus)
- [ ] Ajouter métriques (nombre d'appels, latence, taux d'erreur)
- [ ] Configurer alertes si health check échoue
- [ ] Tester en environnement staging
- [ ] Préparer rollback vers mock si ML service down en prod

---

## 9. Exemple d'utilisation dans SessionsService

### Avant (mock)
```typescript
// sessions.service.ts
const mlResult = await this.mockMLAnalysis();
```

### Après (avec MLService)
```typescript
// sessions.service.ts
import { MlService } from '../ml/ml.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mlService: MlService, // 👈 Injection
  ) {}

  async analyzeSession(
    sessionId: string,
    userId: number,
    scale: GradeScale,
  ): Promise<GradeResult> {
    // ... validation existante ...

    // Récupérer les images
    const images = await this.prisma.sessionImage.findMany({
      where: { sessionId },
    });

    const frontImage = images.find(img => img.side === CardSide.FRONT);
    const backImage = images.find(img => img.side === CardSide.BACK);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ANALYZING },
    });

    try {
      // 👇 Appel au vrai ML service
      const mlResult = await this.mlService.analyzeCard({
        frontImagePath: frontImage.url,
        backImagePath: backImage.url,
        sessionId,
      });

      // ... reste du code identique ...
    } catch (error) {
      this.logger.error(`ML analysis failed for session ${sessionId}`, error);

      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.FAILED },
      });

      throw error;
    }
  }
}
```

---

## 10. Considérations de performance

### 10.1 Optimisations possibles

| Optimisation | Quand l'implémenter | Gain attendu |
|--------------|---------------------|--------------|
| Cache des résultats | Phase 2 | Évite reanalyses identiques |
| Queue asynchrone (BullMQ) | Si > 100 req/min | Décharge l'API principale |
| Connection pooling HTTP | Dès le début | Réutilise connexions TCP |
| Compression gzip | Phase 1 | Réduit payload réseau |
| Batch processing | Si images multiples | Réduit round-trips |

### 10.2 Métriques à surveiller

```typescript
// Exemple avec Prometheus (optionnel)
@Injectable()
export class MlService {
  private readonly metrics = {
    analysisCounter: new Counter({
      name: 'ml_analysis_total',
      help: 'Total ML analysis requests',
      labelNames: ['status'],
    }),
    analysisDuration: new Histogram({
      name: 'ml_analysis_duration_seconds',
      help: 'ML analysis duration in seconds',
      buckets: [1, 5, 10, 30, 60],
    }),
  };

  async analyzeCard(input: IMLAnalysisInput): Promise<IMLAnalysisOutput> {
    const end = this.metrics.analysisDuration.startTimer();

    try {
      const result = await this.performAnalysisWithRetries(input);
      this.metrics.analysisCounter.inc({ status: 'success' });
      return result;
    } catch (error) {
      this.metrics.analysisCounter.inc({ status: 'error' });
      throw error;
    } finally {
      end();
    }
  }
}
```

---

## 11. Sécurité

### 11.1 Points d'attention

- [ ] **Validation stricte des inputs**: Paths d'images (éviter path traversal)
- [ ] **Rate limiting**: Limiter nombre d'analyses par user/IP
- [ ] **Authentication service-to-service**: JWT ou API key entre NestJS et Python
- [ ] **HTTPS en production**: Jamais HTTP pour appels inter-services
- [ ] **Secrets management**: Ne pas hardcoder ML_SERVICE_URL
- [ ] **Timeouts stricts**: Éviter les attaques DoS par lenteur

### 11.2 Exemple de validation paths

```typescript
private validateImagePath(path: string): void {
  // Vérifier que le path est bien dans /uploads/
  if (!path.startsWith('/uploads/')) {
    throw new BadRequestException('Invalid image path');
  }

  // Vérifier absence de path traversal
  if (path.includes('..') || path.includes('~')) {
    throw new BadRequestException('Path traversal detected');
  }
}
```

---

## 12. Roadmap post-MVP

1. **Semaine 1-2**: Implémentation de base (phases 1-4)
2. **Semaine 3**: Tests et debugging (phase 5)
3. **Semaine 4**: Documentation et staging (phases 6-7)
4. **Phase 2 (optionnelle)**:
   - Cache Redis pour résultats ML
   - Queue BullMQ pour analyses asynchrones
   - Circuit breaker avec opossum
   - Métriques Prometheus + Grafana dashboard

---

## 13. Questions ouvertes pour l'agent principal

1. **Stockage images**: Les URLs actuelles (`/uploads/xxx`) sont-elles accessibles par le service Python ? Faut-il un volume partagé Docker ?
2. **Format images**: Le service Python attend-il des URLs HTTP ou des paths filesystem ?
3. **Authentification**: Faut-il un token entre NestJS et Python FastAPI ?
4. **Environnements**: Quelle URL pour le ML service en dev/staging/prod ?
5. **Fallback**: Activer `ML_ENABLE_FALLBACK=true` en prod ou hard fail ?

---

## Résumé exécutif

**Architecture choisie**: API Python FastAPI en sidecar
**Effort estimé**: 3-4 jours pour MVP (phases 1-5)
**Dépendances**: `@nestjs/axios`, configuration `.env`
**Points de vigilance**:
- Gestion robuste des erreurs réseau
- Validation stricte des réponses ML
- Fallback en cas de service down
- Health checks pour monitoring

**Prêt pour implémentation**: Ce plan peut être suivi étape par étape par l'agent principal.
