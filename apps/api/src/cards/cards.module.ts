import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { PokemonTcgProvider, TcgdexProvider } from './providers';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  controllers: [CardsController],
  providers: [CardsService, PokemonTcgProvider, TcgdexProvider],
  exports: [CardsService],
})
export class CardsModule {}
