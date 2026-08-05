import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadUserCvDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;
}
