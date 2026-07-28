import { CredentialsSignin } from "next-auth";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export class OAuthOnlyAccountError extends CredentialsSignin {
  code = "oauth_account_exists";
}

export class AccountNotVerifiedError extends CredentialsSignin {
  code = "account_not_verified";
}
