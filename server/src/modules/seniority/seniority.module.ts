import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeniorityLevel } from './entities/seniority-level.entity';
import { SeniorityController } from './seniority.controller';
import { SeniorityService } from './seniority.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeniorityLevel])],
  controllers: [SeniorityController],
  providers: [SeniorityService],
  exports: [SeniorityService],
})
export class SeniorityModule {}
