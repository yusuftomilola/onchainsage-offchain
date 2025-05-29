import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DataIngestionService } from '../services/data-ingestion.service';
import { CreateDataIngestionDto } from '../dto/create-data-ingestion.dto';
import { UpdateDataIngestionDto } from '../dto/update-data-ingestion.dto';

@Controller('data-ingestion')
export class DataIngestionController {
  constructor(private readonly dataIngestionService: DataIngestionService) {}

  @Post()
  create(@Body() createDataIngestionDto: CreateDataIngestionDto) {
    return this.dataIngestionService.create(createDataIngestionDto);
  }

  @Get()
  findAll() {
    return this.dataIngestionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dataIngestionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDataIngestionDto: UpdateDataIngestionDto) {
    return this.dataIngestionService.update(+id, updateDataIngestionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dataIngestionService.remove(+id);
  }
}
