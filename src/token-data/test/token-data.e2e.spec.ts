import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { TokenDataService } from '../provider/token-data.service';

describe('TokenDataController (e2e)', () => {
  let app: INestApplication;
  let tokenDataService: TokenDataService;

  const mockResponse = {
    price: 1.23,
    volume24h: 500000,
    liquidity: 10000,
    source: {
      dex: { dummy: 'dex-data' },
      raydium: { dummy: 'raydium-data' },
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TokenDataService)
      .useValue({
        fetchAndNormalizeTokenData: jest.fn().mockResolvedValue(mockResponse),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    tokenDataService = moduleFixture.get<TokenDataService>(TokenDataService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/token-data/:tokenAddress (GET) should return normalized token data', async () => {
    const tokenAddress = 'So11111111111111111111111111111111111111112';

    const res = await request(app.getHttpServer())
      .get(`/token-data/${tokenAddress}`)
      .expect(HttpStatus.OK);

    expect(res.body).toMatchObject({
      price: expect.any(Number),
      volume24h: expect.any(Number),
      liquidity: expect.any(Number),
      source: {
        dex: expect.any(Object),
        raydium: expect.any(Object),
      }
    });

    // Confirm the service was called
    expect(tokenDataService.fetchAndNormalizeTokenData).toHaveBeenCalledWith(tokenAddress);
  });
});
