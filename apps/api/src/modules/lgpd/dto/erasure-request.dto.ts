import { IsNotEmpty, IsString } from "class-validator";

export class ErasureRequestDto {
  @IsString()
  @IsNotEmpty()
  leadPhone!: string;
}
