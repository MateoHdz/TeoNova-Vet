import { IsEmail, IsString, MinLength, MaxLength, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'employee'], { message: 'El rol debe ser "admin" o "employee"' })
  role?: 'admin' | 'employee';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
