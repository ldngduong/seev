import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadUserCvDto {
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Tên CV tối đa 160 ký tự.' })
  name?: string;
}
