import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { JobFamilyCategoryEdge } from './entities/job-family-category-edge.entity';
import { JobFamilyCategory } from './entities/job-family-category.entity';

export interface JobCategoryTreeNode {
  id: number;
  name: string;
  level: number;
  alias: string;
  display_order: number;
  children: JobCategoryTreeNode[];
}

export interface JobCategorySearchResult {
  id: number;
  name: string;
  level: number;
  alias: string;
  path: string[];
  descendant_ids: number[];
}

type JobCategoryTreeSearchNode = JobCategoryTreeNode & { path: string[] };

@Injectable()
export class JobCategoryService {
  constructor(
    @InjectRepository(JobFamilyCategory)
    private readonly categoryRepository: Repository<JobFamilyCategory>,
    @InjectRepository(JobFamilyCategoryEdge)
    private readonly edgeRepository: Repository<JobFamilyCategoryEdge>,
  ) {}

  async findTree(): Promise<JobCategoryTreeNode[]> {
    const [categories, edges] = await Promise.all([
      this.categoryRepository.find({
        order: { displayOrder: 'ASC', name: 'ASC' },
      }),
      this.edgeRepository.find({ order: { position: 'ASC' } }),
    ]);

    const nodes = new Map<number, JobCategoryTreeNode>();
    const childIds = new Set<number>();

    for (const category of categories) {
      nodes.set(category.id, {
        id: category.id,
        name: category.name,
        level: category.level,
        alias: category.alias,
        display_order: category.displayOrder,
        children: [],
      });
    }

    for (const edge of edges) {
      const parent = nodes.get(edge.parentId);
      const child = nodes.get(edge.childId);

      if (!parent || !child) {
        continue;
      }

      parent.children.push(child);
      childIds.add(edge.childId);
    }

    const roots = categories
      .filter((category) => !childIds.has(category.id))
      .map((category) => nodes.get(category.id))
      .filter((node): node is JobCategoryTreeNode => Boolean(node));

    return this.sortTree(roots);
  }

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.categoryRepository.find({
      where: { id: In(ids) },
      order: { level: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async search(query: string): Promise<JobCategorySearchResult[]> {
    const normalizedQuery = this.normalizeSearchText(query);

    if (normalizedQuery.length < 2) {
      return [];
    }

    const tree = await this.findTree();
    const flatNodes = this.flattenTree(tree);

    return flatNodes
      .filter((node) =>
        this.normalizeSearchText(
          [node.name, node.alias, ...node.path].join(' '),
        ).includes(normalizedQuery),
      )
      .slice(0, 30)
      .map((node) => ({
        id: node.id,
        name: node.name,
        level: node.level,
        alias: node.alias,
        path: node.path,
        descendant_ids: this.collectDescendantIds(node),
      }));
  }

  private sortTree(nodes: JobCategoryTreeNode[]): JobCategoryTreeNode[] {
    return nodes
      .sort(
        (left, right) =>
          left.display_order - right.display_order ||
          left.name.localeCompare(right.name),
      )
      .map((node) => ({
        ...node,
        children: this.sortTree(node.children),
      }));
  }

  private flattenTree(
    nodes: JobCategoryTreeNode[],
    parentPath: string[] = [],
  ): JobCategoryTreeSearchNode[] {
    return nodes.flatMap((node) => {
      const nodeWithPath = {
        ...node,
        path: [...parentPath, node.name],
      } as JobCategoryTreeSearchNode;

      return [
        nodeWithPath,
        ...this.flattenTree(node.children, nodeWithPath.path),
      ];
    });
  }

  private collectDescendantIds(node: JobCategoryTreeNode): number[] {
    return node.children.flatMap((child) => [
      child.id,
      ...this.collectDescendantIds(child),
    ]);
  }

  private normalizeSearchText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
