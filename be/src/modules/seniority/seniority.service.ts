import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CategorySeniorityLevel } from '../job-category/entities/category-seniority-level.entity';
import { SeniorityLevel } from './entities/seniority-level.entity';

@Injectable()
export class SeniorityService {
  constructor(
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    @InjectRepository(CategorySeniorityLevel)
    private readonly categoryRuleRepository: Repository<CategorySeniorityLevel>,
  ) {}

  async findActive(categoryId?: string) {
    if (categoryId) {
      const rules = await this.categoryRuleRepository.find({
        relations: { seniority: true },
        where: { categoryId, isSelectable: true },
        order: { seniority: { displayOrder: 'ASC' } },
      });

      return rules
        .map((rule) => rule.seniority)
        .filter((level) => level.isActive);
    }

    return this.seniorityRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }
}
