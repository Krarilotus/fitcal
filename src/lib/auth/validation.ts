import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Bitte gib eine gueltige E-Mail-Adresse ein.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Das Passwort muss mindestens 8 Zeichen haben.")
  .max(128, "Das Passwort darf maximal 128 Zeichen haben.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Bitte gib dein Passwort ein."),
});

export const registerSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(2, "Bitte gib mindestens 2 Zeichen ein.")
    .max(80, "Name darf maximal 80 Zeichen haben.")
    .optional()
    .or(z.literal("")),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Der Reset-Token ist ungueltig."),
  password: passwordSchema,
});
