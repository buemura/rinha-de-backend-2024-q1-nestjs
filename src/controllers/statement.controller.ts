import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { StatementResponseDto } from '../dtos';
import { StatementService } from '../services';

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
