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
import { ClaimCategory } from '@project/types';

export class ClaimCreateRequestDto {
  @IsEnum(ClaimCategory, {
    message: `Category must be one of: ${Object.values(ClaimCategory).join(', ')}`,
  })
  @IsNotEmpty()
  category: ClaimCategory;

  @IsString()
  @IsOptional()
  @Length(1, 255, {
    message: 'Claim name must be between 1 and 255 characters',
  })
  claimName?: string;

  @IsInt({ message: 'Month must be an integer' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  @IsNotEmpty()
  month: number;

  @IsInt({ message: 'Year must be an integer' })
  @Min(2020, { message: 'Year must be between 2020 and 2100' })
  @Max(2100, { message: 'Year must be between 2020 and 2100' })
  @IsNotEmpty()
  year: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Total amount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'Total amount must be greater than 0' })
  @IsNotEmpty()
  totalAmount: number;
}
