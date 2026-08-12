import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateJdResearchDto {
  @IsUUID() userCvId!: string;
  @IsOptional() @IsString() @MinLength(200) @MaxLength(50_000) text?: string;
}

export class CreateLinkResearchDto {
  @IsUUID() userCvId!: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(2_048) url!: string;
}

export class ExternalJobResearchListQueryDto {
  @Transform(({ value }) => Number(value ?? 1)) @IsInt() @Min(1) page = 1;
  @Transform(({ value }) => Number(value ?? 10)) @IsInt() @Min(1) @Max(50) pageSize = 10;
  @IsOptional() @IsIn(['queued', 'processing', 'completed', 'failed']) status?: 'queued' | 'processing' | 'completed' | 'failed';
  @IsOptional() @IsIn(['jd', 'link']) sourceKind?: 'jd' | 'link';
  @IsOptional() @IsUUID() userCvId?: string;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
}
