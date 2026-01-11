import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaModule } from '../prisma';
import { MlModule } from '../ml';

@Module({
  imports: [
    PrismaModule,
    MlModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/sessions',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, cb) => {
        // Accept common image formats including mobile formats (heic/heif for iPhone)
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|heic|heif)$/i)) {
          console.error(`Rejected file with mimetype: ${file.mimetype}`);
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
