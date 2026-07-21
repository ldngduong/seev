import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    AuthModule,
    CvModule,
    AiModule,
    CrawlerModule,
    JobCategoryModule,
    SeniorityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
