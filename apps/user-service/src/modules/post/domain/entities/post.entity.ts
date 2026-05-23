export type PostStatus = 'active' | 'inactive';

export class PostEntity {
  id!: number;
  code!: string;
  name!: string;
  level!: number;
  sortOrder!: number;
  status!: PostStatus;
  description!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<PostEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
