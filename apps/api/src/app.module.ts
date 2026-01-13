import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { SessionsModule } from './sessions';
import { MlModule } from './ml';
import { FeedbackModule } from './feedback';
import { CardsModule } from './cards';
import { OcrModule } from './ocr';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SessionsModule,
    MlModule,
    FeedbackModule,
    CardsModule,
    OcrModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
