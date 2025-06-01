import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ForumService } from '../services/forum.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { VoteDto } from '../dto/vote.dto';
import { SearchDto } from '../dto/search.dto';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('posts')
  async createPost(@Body() createPostDto: CreatePostDto, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id'; 
    return this.forumService.createPost(createPostDto, userId);
  }

  @Get('posts')
  async getPosts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') categoryId?: string,
  ) {
    return this.forumService.getPosts(page, limit, categoryId);
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    return this.forumService.getPostById(id);
  }

  @Patch('posts/:id')
  async updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.updatePost(id, updatePostDto, userId);
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.deletePost(id, userId);
  }

  @Post('comments')
  async createComment(@Body() createCommentDto: CreateCommentDto, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.createComment(createCommentDto, userId);
  }

  @Get('posts/:postId/comments')
  async getComments(@Param('postId') postId: string) {
    return this.forumService.getCommentsForPost(postId);
  }

  @Patch('comments/:id')
  async updateComment(@Param('id') id: string, @Body('content') content: string, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.updateComment(id, content, userId);
  }

  @Delete('comments/:id')
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.deleteComment(id, userId);
  }

  @Post('vote')
  async vote(@Body() voteDto: VoteDto, @Req() req: any) {
    const userId = req.user?.id || 'dummy-user-id';
    return this.forumService.vote(voteDto, userId);
  }

  @Get('search')
  async search(@Query() searchDto: SearchDto) {
    return this.forumService.searchPosts(searchDto);
  }

  @Patch('moderate/posts/:id')
  async moderatePost(
    @Param('id') id: string,
    @Body('action') action: 'lock' | 'unlock' | 'pin' | 'unpin' | 'delete',
    @Body('moderatorNote') moderatorNote?: string,
  ) {
    return this.forumService.moderatePost(id, action, moderatorNote);
  }

  @Patch('moderate/comments/:id')
  async moderateComment(
    @Param('id') id: string,
    @Body('action') action: 'delete',
    @Body('moderatorNote') moderatorNote?: string,
  ) {
    return this.forumService.moderateComment(id, action, moderatorNote);
  }
}
