import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  Max,
  Length,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClaimCategory } from '@project/types';

export class ClaimCreateRequestDto {
  @ApiProperty({
    description: 'Category of the expense claim',
    enum: ClaimCategory,
    example: ClaimCategory.TELCO,
    enumName: 'ClaimCategory',
  })
  @IsEnum(ClaimCategory, {
    message: `Category must be one of: ${Object.values(ClaimCategory).join(', ')}`,
  })
  @IsNotEmpty()
  category: ClaimCategory;

  @ApiProperty({
    description: 'Optional descriptive name for the claim',
    example: 'Monthly phone bill',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(1, 255, {
    message: 'Claim name must be between 1 and 255 characters',
  })
  claimName?: string;

  @ApiProperty({
    description: 'Month of the expense (1-12)',
    example: 9,
    minimum: 1,
    maximum: 12,
    type: 'integer',
  })
  @IsInt({ message: 'Month must be an integer' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  @IsNotEmpty()
  month: number;

  @ApiProperty({
    description: 'Year of the expense (2020-2100)',
    example: 2025,
    minimum: 2020,
    maximum: 2100,
    type: 'integer',
  })
  @IsInt({ message: 'Year must be an integer' })
  @Min(2020, { message: 'Year must be between 2020 and 2100' })
  @Max(2100, { message: 'Year must be between 2020 and 2100' })
  @IsNotEmpty()
  year: number;

  @ApiProperty({
    description: 'Total amount of the claim in dollars',
    example: 50.0,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Total amount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'Total amount must be greater than 0' })
  @IsNotEmpty()
  totalAmount: number;
}
