import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controller/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WalletVerificationService } from './services/wallet-verification.service';
import { UsersService } from '../users/services/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { TokenService } from './services/token.service';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    TypeOrmModule.forFeature([User])
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, WalletVerificationService, UsersService, TokenService],
  exports: [TokenService]
})
export class AuthModule {}
