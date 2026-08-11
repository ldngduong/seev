import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCvAuditDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetRole?: string;

  @IsOptional()
  @IsUUID()
  jobCategoryId?: string;

  @IsOptional()
  @IsUUID()
  seniorityLevelId?: string;
}
