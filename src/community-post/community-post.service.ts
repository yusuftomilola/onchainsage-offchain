import { Injectable } from '@nestjs/common';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';

@Injectable()
export class CommunityPostService {
  create(createCommunityPostDto: CreateCommunityPostDto) {
    return 'This action adds a new communityPost';
  }

  findAll() {
    return `This action returns all communityPost`;
  }

  findOne(id: number) {
    return `This action returns a #${id} communityPost`;
  }

  update(id: number, updateCommunityPostDto: UpdateCommunityPostDto) {
    return `This action updates a #${id} communityPost`;
  }

  remove(id: number) {
    return `This action removes a #${id} communityPost`;
  }
}
