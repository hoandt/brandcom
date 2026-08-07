export type CategoryNodeInput = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
};

export type CategoryTreeNode<T extends CategoryNodeInput = CategoryNodeInput> = T & {
  children: CategoryTreeNode<T>[];
};

export type FlatCategoryNode<T extends CategoryNodeInput = CategoryNodeInput> = T & {
  depth: number;
  path: string;
};

const byPositionAndName = <T extends CategoryNodeInput>(a: T, b: T) =>
  a.position - b.position || a.name.localeCompare(b.name);

export function buildCategoryTree<T extends CategoryNodeInput>(categories: T[]) {
  const nodes = new Map<string, CategoryTreeNode<T>>(
    categories.map((category) => [category.id, { ...category, children: [] }])
  );
  const roots: CategoryTreeNode<T>[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id)!;
    const parent = category.parentId ? nodes.get(category.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (items: CategoryTreeNode<T>[]) => {
    items.sort(byPositionAndName);
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export function flattenCategoryTree<T extends CategoryNodeInput>(
  tree: CategoryTreeNode<T>[],
  depth = 0,
  parentPath = ""
): FlatCategoryNode<T>[] {
  return tree.flatMap((node) => {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const { children, ...category } = node;
    return [
      { ...category, depth, path } as unknown as FlatCategoryNode<T>,
      ...flattenCategoryTree(children, depth + 1, path),
    ];
  });
}

export function getDescendantIds<T extends Pick<CategoryNodeInput, "id" | "parentId">>(
  categories: T[],
  categoryId: string
) {
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    children.set(category.parentId, [...(children.get(category.parentId) ?? []), category.id]);
  }

  const descendants: string[] = [];
  const pending = [...(children.get(categoryId) ?? [])];
  const seen = new Set<string>();
  while (pending.length) {
    const id = pending.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    descendants.push(id);
    pending.push(...(children.get(id) ?? []));
  }
  return descendants;
}

export function wouldCreateCategoryCycle<T extends Pick<CategoryNodeInput, "id" | "parentId">>(
  categories: T[],
  categoryId: string,
  parentId: string | null
) {
  return parentId === categoryId || (parentId ? getDescendantIds(categories, categoryId).includes(parentId) : false);
}

export function getCategoryPath<T extends Pick<CategoryNodeInput, "id" | "parentId">>(categories: T[], categoryId: string) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
