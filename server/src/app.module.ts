import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import basicAuth from 'express-basic-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.schema';
import { createTypeOrmOptions } from './config/typeorm.config';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { CvModule } from './modules/cv/cv.module';
import { JobCategoryModule } from './modules/job-category/job-category.module';
import { SeniorityModule } from './modules/seniority/seniority.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    BullBoardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        route: config.getOrThrow<string>('BULL_BOARD_ROUTE'),
        adapter: ExpressAdapter,
        middleware: basicAuth({
          challenge: true,
          users: {
            [config.getOrThrow<string>('BULL_BOARD_USER')]:
              config.getOrThrow<string>('BULL_BOARD_PASSWORD'),
          },
        }),
      }),
    }),
    AuthModule,
    CvModule,
    AiModule,
    CrawlerModule,
    JobCategoryModule,
    SeniorityModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
