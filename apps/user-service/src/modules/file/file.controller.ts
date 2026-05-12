import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { generateSchema } from '@anatine/zod-openapi';
import { Response } from 'express';
import { FileService } from './file.service';
import { CurrentUser, ZodValidationPipe } from '@core';
import { ListFileDto, listFileSchema } from './dto/list-file.dto';
import z from 'zod';
import * as fs from 'fs';
import { removeByIdSchema, RemoveByIdDto } from '@shared';

@ApiTags('File')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a file',
    description: '上传文件(multipart/form-data,字段名 file)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
      },
    } as any,
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    const originalname = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    return this.fileService.upload(
      {
        originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      userId,
    );
  }

  @Post('listByPage')
  @ApiOperation({
    summary: 'Page files by user',
    description: '分页查询当前登录用户上传的文件列表',
  })
  @ApiBody({ schema: generateSchema(listFileSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(listFileSchema))
  pageByUserId(@Body() dto: ListFileDto, @CurrentUser('id') userId: number) {
    return this.fileService.pageByUserId(userId, dto.current, dto.pageSize);
  }

  @Get('detail')
  @ApiOperation({
    summary: 'Get file by id',
    description: '根据 id 查询文件信息(仅文件所有者可查询)',
  })
  getById(
    @Query('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.fileService.getById(id, userId);
  }

  @Post('delete')
  @ApiOperation({
    summary: 'Delete a file',
    description: '根据 id 删除文件(仅文件所有者可删除)',
  })
  @ApiBody({ schema: generateSchema(removeByIdSchema, false, '3.0') as any })
  @UsePipes(new ZodValidationPipe(removeByIdSchema))
  removeById(@Body() dto: RemoveByIdDto, @CurrentUser('id') userId: number) {
    return this.fileService.removeById(dto.id, userId);
  }

  @Get('download')
  @ApiOperation({
    summary: 'Download a file',
    description: '根据 id 下载文件二进制内容',
  })
  async download(
    @Query('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Res() res: Response,
  ) {
    const file = await this.fileService.getById(id, userId);
    const stream = fs.createReadStream(file.path);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
    });
    stream.pipe(res);
  }
}
