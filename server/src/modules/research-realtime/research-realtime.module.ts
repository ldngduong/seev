import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { ResearchProgressGateway } from './research-progress.gateway';
import { ResearchProgressService } from './research-progress.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CvResearchSession])],
  providers: [ResearchProgressGateway, ResearchProgressService],
  exports: [ResearchProgressService],
})
export class ResearchRealtimeModule {}
