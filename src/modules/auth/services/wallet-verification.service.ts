import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { ec, hash, Signature } from 'starknet';
// import { stark, hash, ec, typedData, num } from 'starknet';

@Injectable()
export class WalletVerificationService {
   async verifySignature(
    walletAddress: string,
    message: string,
    signature: [string, string],
  ) {
    try {
       // const msgHash = hash.starknetKeccak(message);
      // const pubKey = num.toBigInt(walletAddress);
      // const sig: [string, string] = [signature[0], signature[1]];

      // const isValid = ec.verify(sig, msgHash, pubKey);
      // return isValid; // Starknet code commented out due to missing module
      return false; // Always return false for now, or handle as needed.
    } catch (error) {
      console.error('[Signature Verification Error]', error);
      throw new UnauthorizedException('Invalid wallet signature');
    }
  }
}
