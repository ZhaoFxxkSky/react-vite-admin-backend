import { OrganizationEntity } from '../entities/organization.entity';

export interface IOrganizationRepository {
  getById(id: number): Promise<OrganizationEntity | null>;
  getByCode(code: string): Promise<OrganizationEntity | null>;
  list(params?: {
    parentId?: number | null;
    status?: string;
  }): Promise<OrganizationEntity[]>;
  listAll(): Promise<OrganizationEntity[]>;
  countChildren(parentId: number): Promise<number>;
  save(entity: OrganizationEntity): Promise<OrganizationEntity>;
  updateById(
    id: number,
    data: Partial<OrganizationEntity>,
  ): Promise<OrganizationEntity>;
  removeById(id: number): Promise<void>;
}
