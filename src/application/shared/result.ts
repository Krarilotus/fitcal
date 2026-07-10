export type ApplicationError<Code extends string> = {
  code: Code;
  details?: Record<string, string | number>;
};

export type Result<Value, Code extends string> =
  | { ok: true; value: Value }
  | { ok: false; error: ApplicationError<Code> };

export function success<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function failure<Code extends string>(
  code: Code,
  details?: Record<string, string | number>,
): Result<never, Code> {
  return { ok: false, error: { code, details } };
}
