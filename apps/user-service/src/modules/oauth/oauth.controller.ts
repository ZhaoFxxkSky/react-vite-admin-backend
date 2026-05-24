import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  UsePipes,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from './oauth.service';
import { bindOAuthSchema, BindOAuthDto } from './dto';
import {
  PermissionsGuard,
  ApiPermission,
  JwtGuard,
  ZodValidationPipe,
  Public,
  CurrentUser,
} from '@core';
import { AuthenticatedUser } from '@shared';
import * as https from 'https';
import { randomBytes } from 'crypto';

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
  name: string | null;
}

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  // ===================== GitHub OAuth =====================

  @Public()
  @Get('github')
  @ApiOperation({
    summary: 'Get GitHub authorization URL',
    description: '获取 GitHub 授权链接',
  })
  async getGitHubAuthUrl() {
    const clientId = this.configService.get<string>('oauth.github.clientId');
    const redirectUri = this.configService.get<string>(
      'oauth.github.redirectUri',
    );
    const scope = 'user:email';
    const state = this.generateState();

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri || '',
      scope,
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return { authUrl, state };
  }

  @Public()
  @Get('github/callback')
  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description: '处理 GitHub OAuth 回调',
  })
  async githubCallback(@Query('code') code: string) {
    if (!code) {
      throw new HttpException('Missing code', HttpStatus.BAD_REQUEST);
    }

    // 1. 用 code 换取 access_token
    const accessToken = await this.exchangeGitHubCode(code);

    // 2. 获取 GitHub 用户信息
    const githubUser = await this.fetchGitHubUser(accessToken);

    // 3. 查找本地绑定
    const binding = await this.oauthService.findByProvider(
      'github',
      String(githubUser.id),
    );

    return {
      provider: 'github',
      providerId: String(githubUser.id),
      githubUser: {
        login: githubUser.login,
        avatar: githubUser.avatar_url,
        email: githubUser.email,
        name: githubUser.name,
      },
      binding: binding
        ? {
            userId: binding.userId,
            boundAt: binding.createdAt,
          }
        : null,
    };
  }

  // ===================== 绑定管理 =====================

  @Get('list')
  @UseGuards(JwtGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiPermission({
    code: 'system:oauth:list',
    module: '第三方登录',
    name: '查询绑定列表',
  })
  @ApiOperation({
    summary: 'List OAuth bindings',
    description: '查询当前用户的 OAuth 绑定列表',
  })
  listByUserId(@CurrentUser() user: AuthenticatedUser) {
    return this.oauthService.listByUserId(user.id);
  }

  @Post('bind')
  @UseGuards(JwtGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiPermission({
    code: 'system:oauth:bind',
    module: '第三方登录',
    name: '绑定 OAuth',
  })
  @ApiOperation({
    summary: 'Bind OAuth account',
    description: '绑定第三方登录账号',
  })
  @UsePipes(new ZodValidationPipe(bindOAuthSchema))
  bindUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: BindOAuthDto) {
    return this.oauthService.bindUser(user.id, dto);
  }

  @Post('unbind')
  @UseGuards(JwtGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiPermission({
    code: 'system:oauth:unbind',
    module: '第三方登录',
    name: '解绑 OAuth',
  })
  @ApiOperation({
    summary: 'Unbind OAuth account',
    description: '解绑第三方登录账号',
  })
  async unbindUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body('provider') provider: string,
  ) {
    return this.oauthService.unbindUser(user.id, provider);
  }

  // ===================== 内部辅助 =====================

  private generateState(): string {
    return randomBytes(16).toString('hex');
  }

  private async exchangeGitHubCode(code: string): Promise<string> {
    const clientId = this.configService.get<string>('oauth.github.clientId');
    const clientSecret = this.configService.get<string>(
      'oauth.github.clientSecret',
    );

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      });

      const req = https.request(
        {
          hostname: 'github.com',
          path: '/login/oauth/access_token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                reject(
                  new HttpException(
                    `GitHub OAuth error: ${parsed.error_description || parsed.error}`,
                    HttpStatus.BAD_REQUEST,
                  ),
                );
              } else {
                resolve(parsed.access_token);
              }
            } catch {
              reject(
                new HttpException(
                  'Invalid GitHub response',
                  HttpStatus.BAD_GATEWAY,
                ),
              );
            }
          });
        },
      );

      req.on('error', (err) =>
        reject(
          new HttpException(
            `GitHub request failed: ${err.message}`,
            HttpStatus.BAD_GATEWAY,
          ),
        ),
      );
      req.write(postData);
      req.end();
    });
  }

  private async fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.github.com',
          path: '/user',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Data-Space-OAuth',
            Accept: 'application/vnd.github+json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.message) {
                reject(
                  new HttpException(
                    `GitHub API error: ${parsed.message}`,
                    HttpStatus.BAD_GATEWAY,
                  ),
                );
              } else {
                resolve(parsed as GitHubUser);
              }
            } catch {
              reject(
                new HttpException(
                  'Invalid GitHub response',
                  HttpStatus.BAD_GATEWAY,
                ),
              );
            }
          });
        },
      );

      req.on('error', (err) =>
        reject(
          new HttpException(
            `GitHub request failed: ${err.message}`,
            HttpStatus.BAD_GATEWAY,
          ),
        ),
      );
      req.end();
    });
  }
}
