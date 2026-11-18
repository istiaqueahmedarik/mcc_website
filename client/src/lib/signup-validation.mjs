const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png"];

export function validateSignupImage(file, label) {
  if (!file || typeof file === "string" || file.size === 0) {
    return `${label} is required`;
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return `${label} must be a JPG or PNG image`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `${label} must be 5MB or smaller`;
  }
  return "";
}

export function validateSignupImages({ profile_pic, mist_id_card }) {
  return (
    validateSignupImage(profile_pic, "Profile picture") ||
    validateSignupImage(mist_id_card, "MIST ID card")
  );
}
