import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Vui lòng nhập tên đầy đủ.' })
  @MaxLength(160, { message: 'Tên tối đa 160 ký tự.' })
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Tên đăng nhập tối đa 80 ký tự.' })
  username?: string;

  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40, { message: 'Số điện thoại tối đa 40 ký tự.' })
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  credits?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
