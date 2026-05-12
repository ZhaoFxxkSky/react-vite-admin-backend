export interface TreeNode {
  id: number;
  pid?: number | null;
  parentId?: number | null;
  sortOrder?: number;
  children?: TreeNode[];
}

export interface TreeBuildOptions<T extends TreeNode> {
  /**
   * 根节点标识值，默认为 0
   */
  rootValue?: number | null;
  /**
   * 子节点属性名，默认为 'children'
   */
  childrenKey?: string;
  /**
   * 父节点字段名，优先取 'pid'，其次取 'parentId'
   */
  parentKey?: 'pid' | 'parentId';
  /**
   * 是否按 sortOrder 排序子节点
   */
  sort?: boolean;
  /**
   * 自定义排序字段名，默认为 'sortOrder'
   */
  sortKey?: keyof T;
}

/**
 * 通用树形结构构建工具类
 *
 * 使用 Map 进行 O(n) 复杂度建树，避免双重循环。
 * 支持通过 pid 或 parentId 建立父子关系。
 */
export class TreeUtil {
  /**
   * 将扁平列表构建为树形结构
   */
  static buildTree<T extends TreeNode>(
    list: T[],
    options: TreeBuildOptions<T> = {},
  ): T[] {
    const {
      rootValue = 0,
      childrenKey = 'children',
      parentKey = 'pid',
      sort = true,
      sortKey = 'sortOrder' as keyof T,
    } = options;

    const nodeMap = new Map<number, T & Record<string, any>>();
    const roots: (T & Record<string, any>)[] = [];

    for (const item of list) {
      const node = { ...item, [childrenKey]: [] } as T & Record<string, any>;
      nodeMap.set(item.id, node);
    }

    for (const item of list) {
      const node = nodeMap.get(item.id)!;
      const parentId = parentKey === 'pid' ? item.pid : item.parentId;

      if (
        parentId !== undefined &&
        parentId !== null &&
        parentId !== rootValue &&
        nodeMap.has(parentId)
      ) {
        nodeMap.get(parentId)![childrenKey].push(node);
      } else {
        roots.push(node);
      }
    }

    if (sort) {
      const sortField = sortKey as string;
      const sortChildren = (nodes: any[]) => {
        nodes.sort((a, b) => {
          const av = a[sortField] ?? 0;
          const bv = b[sortField] ?? 0;
          return av - bv;
        });
        for (const node of nodes) {
          if (node[childrenKey]?.length) {
            sortChildren(node[childrenKey]);
          }
        }
      };
      sortChildren(roots);
    }

    return roots;
  }

  /**
   * 将树形结构拍平为列表（先序遍历）
   */
  static flattenTree<T extends TreeNode>(
    tree: T[],
    options: { childrenKey?: string } = {},
  ): T[] {
    const { childrenKey = 'children' } = options;
    const result: T[] = [];

    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        const { [childrenKey]: _, ...rest } = node;
        result.push(rest as T);
        if (node[childrenKey]?.length) {
          walk(node[childrenKey]);
        }
      }
    };

    walk(tree);
    return result;
  }

  /**
   * 查找某个节点的所有子孙 id（包含自身）
   */
  static getDescendantIds<T extends TreeNode>(
    tree: T[],
    nodeId: number,
    options: { childrenKey?: string } = {},
  ): number[] {
    const { childrenKey = 'children' } = options;
    const result: number[] = [];

    const findNode = (nodes: any[]): any | null => {
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node[childrenKey]?.length) {
          const found = findNode(node[childrenKey]);
          if (found) return found;
        }
      }
      return null;
    };

    const collect = (node: any) => {
      result.push(node.id);
      if (node[childrenKey]?.length) {
        for (const child of node[childrenKey]) {
          collect(child);
        }
      }
    };

    const target = findNode(tree);
    if (target) collect(target);
    return result;
  }

  /**
   * 查找某个节点的完整路径 id 列表（从根到自身）
   */
  static getPathIds<T extends TreeNode>(
    tree: T[],
    nodeId: number,
    options: { childrenKey?: string } = {},
  ): number[] {
    const { childrenKey = 'children' } = options;

    const walk = (nodes: any[], path: number[]): number[] | null => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return [...path, node.id];
        }
        if (node[childrenKey]?.length) {
          const found = walk(node[childrenKey], [...path, node.id]);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(tree, []) ?? [];
  }
}
