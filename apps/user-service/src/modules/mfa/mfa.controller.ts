import { Controller, Get, Post, Put, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe, JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@app/user-platform';
import { MfaService } from './mfa.service';
import { SetupMfaDto, setupMfaSchema, VerifyMfaDto, verifyMfaSchema, RecoveryCodeDto, recoveryCodeSchema } from './dto';

@ApiTags('MFA 多因素认证')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.getStatus(user.id);
  }

  @Post('setup')
  async setup(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.generateSecret(user.id);
  }

  @Post('verify')
  @UsePipes(new ZodValidationPipe(setupMfaSchema))
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetupMfaDto,
  ) {
    return this.mfaService.verifyAndEnable(user.id, dto.code);
  }

  @Put('disable')
  async disable(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.disable(user.id);
  }

  @Post('recovery-codes')
  async regenerateBackupCodes(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.regenerateBackupCodes(user.id);
  }
}
