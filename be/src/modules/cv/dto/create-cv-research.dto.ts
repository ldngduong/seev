import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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

export class CreateQuickCvResearchDto {
  @IsUUID(undefined, { message: 'ID CV không hợp lệ.' })
  userCvId!: string;
}

export class CreateCustomCvResearchDto {
  @IsUUID(undefined, { message: 'ID CV không hợp lệ.' })
  userCvId!: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'Ngành nghề không hợp lệ.' })
  jobCategoryId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'ID cấp bậc không hợp lệ.' })
  seniorityLevelId?: string;

  @IsOptional()
  @IsString({ message: 'Vị trí mục tiêu không hợp lệ.' })
  @MaxLength(120, { message: 'Vị trí mục tiêu tối đa 120 ký tự.' })
  targetRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000, {
    message: 'Mô tả công việc tối đa 12000 ký tự.',
  })
  jobDescription?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, {
    each: true,
    message: 'Địa điểm làm việc tối đa 120 ký tự.',
  })
  locations?: string[];
}
