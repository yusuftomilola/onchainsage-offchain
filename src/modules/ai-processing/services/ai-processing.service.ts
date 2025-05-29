import { Injectable } from '@nestjs/common';
import { CreateAiProcessingDto } from '../dto/create-ai-processing.dto';
import { UpdateAiProcessingDto } from '../dto/update-ai-processing.dto';

@Injectable()
export class AiProcessingService {
  create(createAiProcessingDto: CreateAiProcessingDto) {
    return 'This action adds a new aiProcessing';
  }

  findAll() {
    return `This action returns all aiProcessing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiProcessing`;
  }

  update(id: number, updateAiProcessingDto: UpdateAiProcessingDto) {
    return `This action updates a #${id} aiProcessing`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiProcessing`;
  }
}
