import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCvAuditDto {
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
}
