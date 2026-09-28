import { CredentialsSignin } from "next-auth";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
