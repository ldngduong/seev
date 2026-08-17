import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CrawlerModule } from '../crawler/crawler.module';
import { SavedJob } from './entities/saved-job.entity';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedJob]), CrawlerModule],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
})
export class SavedJobsModule {}