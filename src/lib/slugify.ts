export function slugify(text: string): string {
  if (!text) return "";

  // Convert to lowercase
  let str = text.toLowerCase();

  // Replace Vietnamese diacritics
  str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
  str = str.replace(/[èéẹẻẽêềếệểễ]/g, "e");
  str = str.replace(/[ìíịỉĩ]/g, "i");
  str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
  str = str.replace(/[ùúụủũưừứựửữ]/g, "u");
  str = str.replace(/[ỳýỵỷỹ]/g, "y");
  str = str.replace(/đ/g, "d");

  // Remove combining diacritical marks
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace spaces and special characters with a single hyphen
  str = str.replace(/[^a-z0-9 -]/g, "") // remove all non-alphanumeric chars (except space and hyphen)
           .replace(/\s+/g, "-")        // collapse whitespace and replace by -
           .replace(/-+/g, "-");        // collapse multiple -

  // Trim prefix and suffix hyphens
  return str.replace(/^-+/, "").replace(/-+$/, "");
}
