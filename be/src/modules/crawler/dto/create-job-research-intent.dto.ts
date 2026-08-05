import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { JOB_SOURCES, type JobSource } from '../types/job-source.type';

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

export class CreateJobResearchIntentDto {
  @IsOptional()
  @IsUUID()
  auditId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetRole?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  jobCategoryId?: number;

  @IsOptional()
  @IsUUID()
  seniorityLevelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  seniorityLevelName?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  searchQueries?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsIn(JOB_SOURCES, { each: true })
  sources?: JobSource[];

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  maxJobsPerSource?: number;
}
