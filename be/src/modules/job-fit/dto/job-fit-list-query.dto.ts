import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class JobFitListQueryDto {
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt() @Min(1) page = 1;

  @Transform(({ value }) => Number(value ?? 10))
  @IsInt() @Min(1) @Max(50) pageSize = 10;

  @IsOptional()
  @IsIn(['queued', 'processing', 'completed', 'failed'])
  status?: 'queued' | 'processing' | 'completed' | 'failed';

  @IsOptional()
  @IsUUID()
  userCvId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
