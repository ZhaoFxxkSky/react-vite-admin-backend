import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { TreeUtil } from '@shared';
import { OrganizationEntity } from './domain/entities/organization.entity';
import { OrganizationRepository } from './infrastructure/repositories/organization.repository';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  // ===================== 组织 CRUD =====================

  async listTree() {
    const all = await this.orgRepo.listAll();
    const plain = all.map((o) => ({
      id: o.id,
      parentId: o.parentId,
      code: o.code,
      name: o.name,
      type: o.type,
      leaderId: o.leaderId,
      sortOrder: o.sortOrder,
      description: o.description,
      status: o.status,
    }));
    return TreeUtil.buildTree(plain, { parentKey: 'parentId', sort: true });
  }

  async getById(id: number) {
    const org = await this.orgRepo.getById(id);
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async save(data: CreateOrganizationDto) {
    const existing = await this.orgRepo.getByCode(data.code);
    if (existing) {
      throw new ConflictException(
        `Organization code "${data.code}" already exists`,
      );
    }

    if (data.parentId != null) {
      const parent = await this.orgRepo.getById(data.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent organization ${data.parentId} not found`,
        );
      }
    }

    return this.orgRepo.save(
      new OrganizationEntity({
        parentId: data.parentId ?? null,
        code: data.code,
        name: data.name,
        type: (data.type ?? 'department') as any,
        leaderId: data.leaderId ?? null,
        sortOrder: data.sortOrder ?? 0,
        description: data.description ?? null,
        status: 'active',
      }),
    );
  }

  async updateById(id: number, data: UpdateOrganizationDto) {
    const { ...patch } = data;

    const existing = await this.orgRepo.getById(id);
    if (!existing) throw new NotFoundException(`Organization ${id} not found`);

    if (patch.parentId !== undefined && patch.parentId !== existing.parentId) {
      if (patch.parentId === id) {
        throw new BadRequestException('Cannot set self as parent');
      }
      if (patch.parentId != null) {
        const newParent = await this.orgRepo.getById(patch.parentId);
        if (!newParent) {
          throw new NotFoundException(
            `Parent organization ${patch.parentId} not found`,
          );
        }
        if (await this.isDescendant(patch.parentId, id)) {
          throw new BadRequestException(
            'Cannot move organization under its own descendant',
          );
        }
      }
    }

    if (patch.code && patch.code !== existing.code) {
      const conflict = await this.orgRepo.getByCode(patch.code);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Organization code "${patch.code}" already exists`,
        );
      }
    }

    return this.orgRepo.updateById(id, patch as any);
  }

  async removeById(id: number) {
    const existing = await this.orgRepo.getById(id);
    if (!existing) throw new NotFoundException(`Organization ${id} not found`);

    const childCount = await this.orgRepo.countChildren(id);
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete organization with sub-organizations',
      );
    }

    const memberCount = await this.prisma.userOrganization.count({
      where: { organizationId: id },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        'Cannot delete organization with active members',
      );
    }

    await this.orgRepo.removeById(id);
    return { id };
  }

  // ===================== 成员查询 =====================

  async listMembersByOrgId(orgId: number) {
    const existing = await this.orgRepo.getById(orgId);
    if (!existing)
      throw new NotFoundException(`Organization ${orgId} not found`);

    const rows = await this.prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            nickName: true,
            avatar: true,
            email: true,
            phone: true,
            jobTitle: true,
            status: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      ...r.user,
      isPrimary: r.isPrimary,
    }));
  }

  // ===================== 内部辅助 =====================

  /**
   * 计算用户所有组织的并集(主组�?�?关联组织)
   */
  async listOrgIdsByUserId(userId: number): Promise<number[]> {
    const rows = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  }

  /**
   * 列出某组织所有后代组�?id(含自�?
   */
  async listDescendantIds(rootId: number): Promise<number[]> {
    const all = await this.orgRepo.listAll();
    const childMap = new Map<number, number[]>();
    for (const o of all) {
      const pid = o.parentId ?? 0;
      if (!childMap.has(pid)) childMap.set(pid, []);
      childMap.get(pid)!.push(o.id);
    }

    const result: number[] = [];
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      result.push(cur);
      const kids = childMap.get(cur) ?? [];
      for (const k of kids) stack.push(k);
    }
    return result;
  }

  /**
   * 判断 maybeChildId 是否�?ancestorId 的后�?用于防止�?
   */
  private async isDescendant(
    maybeChildId: number,
    ancestorId: number,
  ): Promise<boolean> {
    const all = await this.orgRepo.listAll();
    const map = new Map<number, number | null>();
    for (const o of all) map.set(o.id, o.parentId);

    let cur: number | null | undefined = maybeChildId;
    while (cur != null) {
      if (cur === ancestorId) return true;
      cur = map.get(cur);
    }
    return false;
  }

  /**
   * 查询用户主组�?ID（从 UserOrganization �?isPrimary=true�?   */
  async findPrimaryOrgIdByUserId(userId: number): Promise<number | null> {
    const row = await this.prisma.userOrganization.findFirst({
      where: { userId, isPrimary: true },
      select: { organizationId: true },
    });
    return row?.organizationId ?? null;
  }

  /**
   * 设置用户的额外组织（仅操�?isPrimary=false 的行；主组织�?user.service 单独维护�?   */
  async setExtraOrgsForUser(userId: number, orgIds: number[]) {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.userOrganization.deleteMany({
        where: { userId, isPrimary: false },
      });

      if (orgIds.length === 0) return;

      const dedup = Array.from(new Set(orgIds));
      const existing = await tx.organization.findMany({
        where: { id: { in: dedup } },
        select: { id: true },
      });
      const validIds = new Set(existing.map((o: any) => o.id));
      const insertable = dedup.filter((id) => validIds.has(id));

      if (insertable.length > 0) {
        await tx.userOrganization.createMany({
          data: insertable.map((organizationId) => ({
            userId,
            organizationId,
            isPrimary: false,
          })),
        });
      }
    });
  }
}

