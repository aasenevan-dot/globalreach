import type { ZodError } from "zod";

// Turns a Zod validation failure into an API error response that is useful to
// both humans (the `error` string drives frontend toasts) and code (the
// structured `fieldErrors`/`formErrors` mirror `ZodError.flatten()` for any
// caller that wants to highlight individual fields).
//
// Shape:
//   {
//     error: "Validation failed — email: Invalid email; fullName: Required",
//     fieldErrors: { email: ["Invalid email"], fullName: ["Required"] },
//     formErrors: [],
//   }
export function zodError(error: ZodError) {
  const flat = error.flatten();
  const fieldMessages = Object.entries(flat.fieldErrors)
    .filter(([, msgs]) => msgs && msgs.length > 0)
    .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`);
  const parts = [...flat.formErrors, ...fieldMessages];
  const error_ = parts.length
    ? `Validation failed — ${parts.join("; ")}`
    : "Validation failed";
  return { error: error_, fieldErrors: flat.fieldErrors, formErrors: flat.formErrors };
}

// One-line human summary of a Zod error (no wrapping object). Handy where a
// caller already has its own response envelope, e.g. per-row bulk import errors.
export function zodMessage(error: ZodError): string {
  return zodError(error).error;
}
