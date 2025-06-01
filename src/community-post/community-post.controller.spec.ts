import { Test, TestingModule } from '@nestjs/testing';
import { CommunityPostController } from './community-post.controller';
import { CommunityPostService } from './community-post.service';

describe('CommunityPostController', () => {
  let controller: CommunityPostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunityPostController],
      providers: [CommunityPostService],
    }).compile();

    controller = module.get<CommunityPostController>(CommunityPostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
