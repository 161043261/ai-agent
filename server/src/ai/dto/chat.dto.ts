import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  memoryId: number = 0;

  @IsString()
  @IsNotEmpty()
  message: string = '';
}
