import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/modules/users/services/users.service';
import { WalletVerificationService } from './wallet-verification.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,

    private usersService: UsersService,

    private walletVerifier: WalletVerificationService,
  ) {}

  public async loginWithWallet({
    walletAddress,
    signature,
    message,
  }: {
    walletAddress: string;
    signature: any;
    message: string;
  }) {
    const isValid = await this.walletVerifier.verifySignature(walletAddress, message, signature);

    // Auto-create user if not exists
    const user = await this.usersService.findOrCreate(walletAddress);

    const payload = { sub: user.id, walletAddress };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
