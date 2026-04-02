import { IsIn, IsString } from "class-validator";

const VALID_STAGES = [
  "novo",
  "qualificado",
  "agendado",
  "confirmado",
  "atendido",
  "perdido",
] as const;

export class UpdateStageDto {
  @IsString()
  @IsIn(VALID_STAGES)
  stage!: string;
}
