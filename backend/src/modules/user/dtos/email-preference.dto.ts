import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailPreferenceDto {
  @ApiProperty({
    description: 'Type of email preference (CC or BCC)',
    enum: ['cc', 'bcc'],
    example: 'cc',
  })
  @IsIn(['cc', 'bcc'], {
    message: 'Type must be either "cc" or "bcc"',
  })
  type: 'cc' | 'bcc';

  @ApiProperty({
    description: 'Email address to be added to CC or BCC list',
    example: 'colleague@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email address must be a valid email format' })
  emailAddress: string;
}
