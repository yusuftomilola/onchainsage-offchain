import { Injectable } from '@nestjs/common';
import { CreateDataIngestionDto } from '../dto/create-data-ingestion.dto';
import { UpdateDataIngestionDto } from '../dto/update-data-ingestion.dto';

@Injectable()
export class DataIngestionService {
  create(createDataIngestionDto: CreateDataIngestionDto) {
    return 'This action adds a new dataIngestion';
  }

  findAll() {
    return `This action returns all dataIngestion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dataIngestion`;
  }

  update(id: number, updateDataIngestionDto: UpdateDataIngestionDto) {
    return `This action updates a #${id} dataIngestion`;
  }

  remove(id: number) {
    return `This action removes a #${id} dataIngestion`;
  }
}
