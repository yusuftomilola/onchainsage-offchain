import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('login')
  public async login(@Body() body: { walletAddress: string; signature: any; message: string }) {
    return this.authService.loginWithWallet(body);
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: number; refreshToken: string }) {
    const isValid = await this.tokenService.validateRefreshToken(body.userId, body.refreshToken);

    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    return this.tokenService.generateTokens(body.userId);
  }

  @Post('logout')
  async logout(@Body() body: { userId: number }) {
    await this.tokenService.revokeRefreshToken(body.userId);
    return { message: 'Logged out successfully' };
  }

  //protected route 
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtectedData(@Req() req: Request) {
    return { userId: (req.user as any).sub };
  }
}
