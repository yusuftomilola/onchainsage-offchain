import { PartialType } from '@nestjs/swagger';
import { CreateTradingSignalDto } from './create-trading-signal.dto';

export class UpdateTradingSignalDto extends PartialType(CreateTradingSignalDto) {}
