export const MAX_FULL_NAME_LENGTH = 160;

type FullNameUpdate =
  | { shouldUpdate: false; name: null; error: null }
  | { shouldUpdate: true; name: string; error: null }
  | { shouldUpdate: true; name: null; error: string };

export function normalizeFullNameUpdate(fullName: unknown): FullNameUpdate {
  if (fullName === undefined) {
    return { shouldUpdate: false, name: null, error: null };
  }

  if (typeof fullName !== "string") {
    return { shouldUpdate: true, name: null, error: "Full name must be text" };
  }

  const name = fullName.trim();
  if (!name) {
    return { shouldUpdate: true, name: null, error: "Full name is required" };
  }

  if (name.length > MAX_FULL_NAME_LENGTH) {
    return {
      shouldUpdate: true,
      name: null,
      error: `Full name must be ${MAX_FULL_NAME_LENGTH} characters or fewer`,
    };
  }

  return { shouldUpdate: true, name, error: null };
}
