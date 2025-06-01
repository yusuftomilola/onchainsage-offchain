import { Processor } from "@nestjs/bull";
import { TokenDataService } from "../provider/token-data.service";
import { Cron } from "@nestjs/schedule";

@Processor('token-data')
export class TokenDataJob {
  constructor(private tokenService: TokenDataService) {}

  @Cron('*/5 * * * *') // every 5 mins
  async handleCron() {
    const tokens = ['So11111111111111111111111111111111111111112']; // token list
    for (const token of tokens) {
      const data = await this.tokenService.fetchAndNormalizeTokenData(token);
     
    }
  }
}
