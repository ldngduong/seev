import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { JobCategoryGroup } from './entities/job-category-group.entity';
import { JobCategory } from './entities/job-category.entity';

@Injectable()
export class JobCategoryService {
  constructor(
    @InjectRepository(JobCategoryGroup)
    private readonly groupRepository: Repository<JobCategoryGroup>,
    @InjectRepository(JobCategory)
    private readonly categoryRepository: Repository<JobCategory>,
  ) {}

  async findTree() {
    const groups = await this.groupRepository.find({
      relations: { categories: true },
      where: { isActive: true },
      order: {
        displayOrder: 'ASC',
        categories: { displayOrder: 'ASC', name: 'ASC' },
      },
    });

    return groups.map((group) => ({
      code: group.code,
      name: group.name,
      display_order: group.displayOrder,
      categories: group.categories
        .filter((category) => category.isActive)
        .map((category) => this.toCategory(category)),
    }));
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id IN (:...ids)', { ids })
      .andWhere('category.is_active = true')
      .orderBy('category.display_order', 'ASC')
      .getMany();
  }

  async search(query: string) {
    const normalized = query.trim();

    if (normalized.length < 2) {
      return [];
    }

    const categories = await this.categoryRepository.find({
      relations: { group: true, aliases: true },
      where: [
        { isActive: true, name: ILike(`%${normalized}%`) },
        { isActive: true, code: ILike(`%${normalized}%`) },
        { isActive: true, aliases: { alias: ILike(`%${normalized}%`) } },
      ],
      order: { displayOrder: 'ASC', name: 'ASC' },
      take: 30,
    });

    return categories.map((category) => ({
      ...this.toCategory(category),
      group: { code: category.group.code, name: category.group.name },
    }));
  }

  private toCategory(category: JobCategory) {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      display_order: category.displayOrder,
    };
  }
}
