import { Test, TestingModule } from '@nestjs/testing';
import { CommunityPostService } from './community-post.service';

describe('CommunityPostService', () => {
  let service: CommunityPostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunityPostService],
    }).compile();

    service = module.get<CommunityPostService>(CommunityPostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
