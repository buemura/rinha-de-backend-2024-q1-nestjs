import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StatementController } from './controllers/statement.controller';
import { TransactionController } from './controllers/transaction.controller';
import { StatementService } from './services/statement.service';
import { TransactionService } from './services/transaction.service';
import { Pool } from 'pg';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [StatementController, TransactionController],
  providers: [
    StatementService,
    TransactionService,
    {
      provide: Pool,
      useFactory: () =>
        new Pool({ connectionString: process.env.DATABASE_URL }),
    },
  ],
})
export class AppModule {}
