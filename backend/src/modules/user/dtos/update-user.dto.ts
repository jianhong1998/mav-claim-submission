import {
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EmailPreferenceDto } from './email-preference.dto';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Display name for the user',
    example: 'John Doe',
    minLength: 1,
    required: false,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Email preferences for CC and BCC on claim submissions',
    type: [EmailPreferenceDto],
    required: false,
    example: [
      { type: 'cc', emailAddress: 'manager@example.com' },
      { type: 'bcc', emailAddress: 'finance@example.com' },
    ],
  })
  @IsArray({ message: 'Email preferences must be an array' })
  @ValidateNested({ each: true })
  @Type(() => EmailPreferenceDto)
  @IsOptional()
  emailPreferences?: EmailPreferenceDto[];
}
