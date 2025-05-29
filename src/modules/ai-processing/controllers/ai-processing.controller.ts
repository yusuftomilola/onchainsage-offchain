import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiProcessingService } from '../services/ai-processing.service';
import { CreateAiProcessingDto } from '../dto/create-ai-processing.dto';
import { UpdateAiProcessingDto } from '../dto/update-ai-processing.dto';

@Controller('ai-processing')
export class AiProcessingController {
  constructor(private readonly aiProcessingService: AiProcessingService) {}

  @Post()
  create(@Body() createAiProcessingDto: CreateAiProcessingDto) {
    return this.aiProcessingService.create(createAiProcessingDto);
  }

  @Get()
  findAll() {
    return this.aiProcessingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiProcessingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiProcessingDto: UpdateAiProcessingDto) {
    return this.aiProcessingService.update(+id, updateAiProcessingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiProcessingService.remove(+id);
  }
}
