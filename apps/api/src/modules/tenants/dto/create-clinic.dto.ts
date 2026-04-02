import { IsString, MinLength, IsOptional } from "class-validator";

export class CreateClinicDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  slug?: string;
}
