import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Client, Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';

import {
  CreateTransactionRequestDto,
  CreateTransactionResponseDto,
} from './dtos/transaction.dto';
import { TransactionTypeEnum } from './enums/transaction-type.enum';
import { StatementResponseDto } from './dtos/statement.dto';
import { CustomerBalance, CustomerStatement } from './interfaces/customer';

@Injectable()
export class AppService {
  private pool: Pool;
  private db: NodePgDatabase;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.db = drizzle(this.pool);
  }

  async getCustomerStatement(
    customerId: number,
  ): Promise<StatementResponseDto> {
    const { rows: statement } = await this.pool.query<CustomerStatement>(
      `
      SELECT
        s.valor as total,
        c.limite as limite,
        t.valor,
        t.tipo,
        t.descricao,
        t.realizada_em
      FROM clientes c
      LEFT JOIN saldos s ON c.id = s.cliente_id
      LEFT JOIN transacoes t ON c.id = t.cliente_id
      WHERE c.id = $1
      order by t.realizada_em desc
      limit 10
      `,
      [customerId],
    );

    if (!statement.length) throw new NotFoundException('Cliente not found');

    return {
      saldo: {
        total: statement[0].total,
        limite: statement[0].limite,
        data_extrato: new Date(),
      },
      ultimas_transacoes:
        statement[0].valor !== null
          ? statement.map((stt) => ({
              valor: stt.valor,
              tipo: stt.tipo,
              descricao: stt.descricao,
              realizada_em: stt.realizada_em,
            }))
          : [],
    };
  }

  async createTransaction(
    customerId: number,
    input: CreateTransactionRequestDto,
  ): Promise<CreateTransactionResponseDto> {
    const {
      rows: [customerBalance],
    } = await this.pool.query<CustomerBalance>(
      `
        SELECT *
        FROM saldos s
        INNER JOIN clientes c ON c.id = s.cliente_id
        WHERE s.cliente_id = $1
      `,
      [customerId],
    );

    if (!customerBalance) throw new NotFoundException('Cliente not found');

    const balance =
      input.tipo === TransactionTypeEnum.DEBIT
        ? this.debitTransaction(
            input.valor,
            customerBalance.valor,
            customerBalance.limite,
          )
        : this.creditTransaction(input.valor, customerBalance.valor);

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO transacoes (cliente_id, valor, tipo, descricao, realizada_em) VALUES (${customerId}, ${
          input.valor
        }, ${input.tipo}, ${input.descricao}, ${new Date()})`,
      );
      await tx.execute(
        sql`UPDATE saldos SET valor = ${balance} WHERE cliente_id = ${customerId}`,
      );
    });

    return {
      limite: customerBalance.limite,
      saldo: balance,
    };
  }

  private creditTransaction(
    transactionAmount: number,
    customerBalance: number,
  ): number {
    return customerBalance + transactionAmount;
  }

  private debitTransaction(
    transactionAmount: number,
    customerBalance: number,
    customerLimit: number,
  ): number {
    if ((customerBalance - transactionAmount) * -1 > customerLimit) {
      throw new UnprocessableEntityException(
        'Cliente does not have enough limit',
      );
    }

    return customerBalance - transactionAmount;
  }
}
