import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Bitte gib eine gültige E-Mail-Adresse ein.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Das Passwort muss mindestens 8 Zeichen haben.")
  .max(128, "Das Passwort darf maximal 128 Zeichen haben.");

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Maximal ${maxLength} Zeichen erlaubt.`)
    .optional()
    .or(z.literal(""));

const checkboxSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "on" || value === "true" || value === "1";
  }

  return Boolean(value);
}, z.boolean());

const optionalDateSchema = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split(".").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  return new Date(trimmed);
}, z.date({ error: "Bitte gib ein gültiges Datum ein." }).optional());

const optionalNumberSchema = (
  label: string,
  min: number,
  max: number,
) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      return Number(value.replace(",", "."));
    }

    return value;
  }, z.number({ error: `Bitte gib ${label} als Zahl ein.` }).min(min).max(max).optional());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Bitte gib dein Passwort ein."),
});

export const registerSchema = z.object({
  email: emailSchema,
  invitationToken: z.string().trim().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Bitte gib mindestens 2 Zeichen ein.")
    .max(80, "Name darf maximal 80 Zeichen haben.")
    .optional()
    .or(z.literal("")),
  password: passwordSchema,
  birthDate: optionalDateSchema,
  heightCm: optionalNumberSchema("die Körpergröße", 100, 260),
  waistCircumferenceCm: optionalNumberSchema("den Bauchumfang", 40, 300),
  weightKg: optionalNumberSchema("das Gewicht", 25, 400),
  motivation: optionalTrimmedString(240),
  isStudentDiscount: checkboxSchema.default(false),
  isLightParticipant: checkboxSchema.default(false),
});

export const inviteSchema = z.object({
  email: emailSchema,
});

export const measurementSchema = z
  .object({
    waistCircumferenceCm: optionalNumberSchema("den Bauchumfang", 40, 300),
    weightKg: optionalNumberSchema("das Gewicht", 25, 400),
    restingPulseBpm: optionalNumberSchema("den Ruhepuls", 30, 260),
    notes: optionalTrimmedString(240),
  })
  .refine(
    (value) =>
      value.waistCircumferenceCm !== undefined ||
      value.weightKg !== undefined ||
      value.restingPulseBpm !== undefined ||
      value.notes,
    {
      message: "Bitte trage mindestens einen Messwert oder eine Notiz ein.",
      path: ["weightKg"],
    },
  );

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Bitte gib mindestens 2 Zeichen ein.")
    .max(80, "Name darf maximal 80 Zeichen haben.")
    .optional()
    .or(z.literal("")),
  birthDate: optionalDateSchema,
  heightCm: optionalNumberSchema("die Körpergröße", 100, 260),
  motivation: optionalTrimmedString(240),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Der Reset-Token ist ungültig."),
  password: passwordSchema,
});
