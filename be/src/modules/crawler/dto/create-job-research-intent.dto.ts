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
  @IsUUID(undefined, { message: 'ID audit không hợp lệ.' })
  auditId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Vị trí mục tiêu tối đa 120 ký tự.' })
  targetRole?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'Ngành nghề không hợp lệ.' })
  jobCategoryId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'ID cấp bậc không hợp lệ.' })
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
  @IsIn(JOB_SOURCES, {
    each: true,
    message: 'Nguồn việc làm không được hỗ trợ.',
  })
  sources?: JobSource[];

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value == null ? undefined : Number(value),
  )
  @IsInt({ message: 'Số việc làm mỗi nguồn không hợp lệ.' })
  @Min(1, { message: 'Số việc làm mỗi nguồn phải từ 1 đến 100.' })
  @Max(100, { message: 'Số việc làm mỗi nguồn phải từ 1 đến 100.' })
  maxJobsPerSource?: number;
}
