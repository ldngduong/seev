import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SeniorityLevel } from './entities/seniority-level.entity';

@Injectable()
export class SeniorityService {
  constructor(
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
  ) {}

  findActive() {
    return this.seniorityRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }
}
