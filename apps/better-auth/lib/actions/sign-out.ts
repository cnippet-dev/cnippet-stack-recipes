"use server";

import { isAPIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { auth } from "../auth/auth";

export type SignOutState = {
  success: boolean;
  message?: string;
};

export async function signOutAction(
  _prevState: SignOutState,
): Promise<SignOutState> {
  try {
    await auth.api.signOut();
  } catch (error) {
    if (isAPIError(error)) {
      console.error("[signUpAction]", error.status, error.message);
      return {
        message: "Something went wrong. Please try again.",
        success: false,
      };
    }
    console.error("[signUpAction unexpected]", error);
    return {
      message: "Something went wrong. Please try again.",
      success: false,
    };
  }

  redirect("/login");
}
