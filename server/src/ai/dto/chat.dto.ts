import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  memoryId: number;

  @IsString()
  @IsNotEmpty()
  message: string;
}
