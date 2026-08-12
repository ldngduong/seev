import { IsUUID } from 'class-validator';

export class CreateJobFitDto {
  @IsUUID() userCvId!: string;
}
