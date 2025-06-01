import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import Redis from 'ioredis';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    // @InjectRedis() private readonly redis: Redis,
  ) {}

  async generateTokens(userId: number) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });


    return { accessToken, refreshToken };
  }

  async validateRefreshToken(userId: number, token: string): Promise<boolean> {
    return true;
  }

  async revokeRefreshToken(userId: number) {
  }
}
