import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@core';
import { PostEntity } from './domain/entities/post.entity';
import { PostRepository } from './infrastructure/repositories/post.repository';
import { CreatePostDto, UpdatePostDto } from './dto';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postRepo: PostRepository,
  ) {}

  async list(params?: { status?: string }) {
    return this.postRepo.list(params);
  }

  async getById(id: number) {
    const post = await this.postRepo.getById(id);
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  async save(data: CreatePostDto) {
    const existing = await this.postRepo.getByCode(data.code);
    if (existing) {
      throw new ConflictException(`Post code "${data.code}" already exists`);
    }

    return this.postRepo.save(
      new PostEntity({
        code: data.code,
        name: data.name,
        level: data.level ?? 1,
        sortOrder: data.sortOrder ?? 0,
        description: data.description ?? null,
        status: 'active',
      }),
    );
  }

  async updateById(id: number, data: UpdatePostDto) {
    const existing = await this.postRepo.getById(id);
    if (!existing) throw new NotFoundException(`Post ${id} not found`);

    if (data.code && data.code !== existing.code) {
      const conflict = await this.postRepo.getByCode(data.code);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Post code "${data.code}" already exists`);
      }
    }

    return this.postRepo.updateById(id, data as any);
  }

  async removeById(id: number) {
    const existing = await this.postRepo.getById(id);
    if (!existing) throw new NotFoundException(`Post ${id} not found`);

    const memberCount = await this.prisma.userPost.count({
      where: { postId: id },
    });

    if (memberCount > 0) {
      throw new BadRequestException('Cannot delete post with active members');
    }

    await this.postRepo.removeById(id);
    return { id };
  }

  async assignToUser(userId: number, postIds: number[]) {
    const dedup = Array.from(new Set(postIds));

    const validPosts = await this.prisma.post.findMany({
      where: { id: { in: dedup } },
      select: { id: true },
    });
    const validIds = new Set(validPosts.map((p) => p.id));

    if (validIds.size !== dedup.length) {
      throw new BadRequestException('Some post ids are invalid');
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.userPost.deleteMany({ where: { userId } });

      if (dedup.length > 0) {
        await tx.userPost.createMany({
          data: dedup.map((postId) => ({
            userId,
            postId,
            isPrimary: false,
          })),
        });
      }

      return { userId, postIds: dedup };
    });
  }

  async listPostsByUserId(userId: number) {
    const rows = await this.prisma.userPost.findMany({
      where: { userId },
      include: { post: true },
      orderBy: { post: { sortOrder: 'asc' } },
    });

    return rows.map((r) => r.post);
  }
}
