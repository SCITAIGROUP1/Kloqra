import { slugifyName } from "@kloqra/contracts";

export { slugifyName };

export async function resolveUniqueSlug(
  findBySlug: (slug: string) => Promise<{ id: string } | null>,
  baseName: string,
  preferredSlug?: string
): Promise<string> {
  let slug = preferredSlug ?? slugifyName(baseName);
  if (!slug) {
    slug = `org-${Date.now()}`;
  }
  const taken = await findBySlug(slug);
  if (taken) {
    slug = `${slug}-${Date.now()}`;
  }
  return slug;
}
