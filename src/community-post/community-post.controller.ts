import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommunityPostService } from './community-post.service';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';

@Controller('community-post')
export class CommunityPostController {
  constructor(private readonly communityPostService: CommunityPostService) {}

  @Post()
  create(@Body() createCommunityPostDto: CreateCommunityPostDto) {
    return this.communityPostService.create(createCommunityPostDto);
  }

  @Get()
  findAll() {
    return this.communityPostService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communityPostService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommunityPostDto: UpdateCommunityPostDto) {
    return this.communityPostService.update(+id, updateCommunityPostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.communityPostService.remove(+id);
  }
}
