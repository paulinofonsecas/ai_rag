import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  category!: string;
}
