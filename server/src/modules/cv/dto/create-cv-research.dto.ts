import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQuickCvResearchDto {
  @IsUUID()
  userCvId!: string;
}

export class CreateCustomCvResearchDto {
  @IsUUID()
  userCvId!: string;

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
  @MaxLength(120)
  targetRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  jobDescription?: string;
}
