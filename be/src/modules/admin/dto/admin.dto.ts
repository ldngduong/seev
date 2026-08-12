import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustCreditsDto {
  @IsInt() @Min(-1_000_000_000) @Max(1_000_000_000) amount!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
  @IsString() @MinLength(8) @MaxLength(160) idempotencyKey!: string;
}

export class UpdateServicePriceDto {
  @IsInt() @Min(0) @Max(1_000_000) priceCredits!: number;
}

export class RemoveQueueJobDto {
  @IsString() @MinLength(1) jobId!: string;
}
