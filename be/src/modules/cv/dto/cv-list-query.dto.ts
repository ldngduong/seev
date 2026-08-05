import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

class PageQueryDto {
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => Number(value ?? 12))
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 12;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class UserCvListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['ready', 'processing', 'failed'])
  status?: 'ready' | 'processing' | 'failed';
}

export class ResearchSessionListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['queued', 'processing', 'completed', 'failed'])
  status?: 'queued' | 'processing' | 'completed' | 'failed';

  @IsOptional()
  @IsIn(['quick', 'custom'])
  type?: 'quick' | 'custom';

  @IsOptional()
  @IsUUID()
  userCvId?: string;
}
