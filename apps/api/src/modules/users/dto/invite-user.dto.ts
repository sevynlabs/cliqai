import { IsEmail, IsIn } from "class-validator";

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsIn(["owner", "admin", "manager", "attendant"])
  role!: string;
}
