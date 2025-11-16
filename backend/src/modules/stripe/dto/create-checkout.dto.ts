import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['month', 'year'])
  interval: 'month' | 'year';
}

