import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JobResearchService } from '../crawler/job-research.service';
import { SavedJobsQueryDto } from './dto/saved-jobs-query.dto';
import { SavedJob } from './entities/saved-job.entity';

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectRepository(SavedJob)
    private readonly savedJobRepository: Repository<SavedJob>,
    private readonly jobResearchService: JobResearchService,
  ) {}

  async save(userId: string, jobId: string) {
    const alreadySaved = await this.savedJobRepository.exists({
      where: { userId, jobPostId: jobId },
    });
    if (!alreadySaved) {
      await this.savedJobRepository
        .createQueryBuilder()
        .insert()
        .into(SavedJob)
        .values({ userId, jobPostId: jobId })
        .orIgnore()
        .execute();
    }
    return { saved: true };
  }

  async unsave(userId: string, jobId: string) {
    await this.savedJobRepository
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND job_post_id = :jobId', { userId, jobId })
      .execute();
    return { saved: false };
  }

  async list(userId: string, query: SavedJobsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 18;
    const [rows, total] = await this.savedJobRepository
      .createQueryBuilder('saved')
      .innerJoinAndSelect('saved.job', 'job')
      .where('saved.user_id = :userId', { userId })
      .orderBy('saved.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const items = await this.jobResearchService.hydrateFeedItems(
      rows.map((row) => row.job),
    );

    return {
      items: items.map((item) => ({ ...item, isSaved: true })),
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }
}