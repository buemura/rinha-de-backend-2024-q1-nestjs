import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { StatementService } from '../services/statement.service';
import { StatementResponseDto } from '../dtos/statement.dto';

@Controller('clientes')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  @Get(':id/extrato')
  async getStatement(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StatementResponseDto> {
    return this.statementService.getCustomerStatement(id);
  }
}
