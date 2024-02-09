import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool } from 'pg';
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

  constructor() {
    this.pool = new Pool({
      host: 'localhost',
      user: 'admin',
      password: '123',
      database: 'rinha',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
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

    await Promise.all([
      this.pool.query(
        'INSERT INTO transacoes (cliente_id, valor, tipo, descricao, realizada_em) VALUES ($1, $2, $3, $4, $5)',
        [customerId, input.valor, input.tipo, input.descricao, new Date()],
      ),
      this.pool.query('UPDATE saldos SET valor = $1 WHERE cliente_id = $2', [
        balance,
        customerId,
      ]),
    ]);

    return {
      limite: customerBalance.limite,
      saldo: balance,
    };
  }

  async getCustomerStatement(
    customerId: number,
  ): Promise<StatementResponseDto> {
    const { rows: statement } = await this.pool.query<CustomerStatement>(
      `
      SELECT s.valor as total, c.limite as limite, t.valor, t.tipo, t.descricao, t.realizada_em 
      FROM saldos s 
      INNER JOIN clientes c ON c.id = s.cliente_id
      INNER JOIN transacoes t ON t.cliente_id = s.cliente_id
      WHERE s.cliente_id = $1
      order by t.realizada_em desc
      limit 10      
      `,
      [customerId],
    );

    return {
      saldo: {
        total: statement[0].valor,
        limite: statement[0].limite,
        data_extrato: new Date(),
      },
      ultimas_transacoes: statement.map((stt) => ({
        valor: stt.valor,
        tipo: stt.tipo,
        descricao: stt.descricao,
        realizada_em: stt.realizada_em,
      })),
    };
  }

  private creditTransaction(
    transactionValue: number,
    customerBalance: number,
  ): number {
    return customerBalance + transactionValue;
  }

  private debitTransaction(
    transactionValue: number,
    customerBalance: number,
    customerLimit: number,
  ): number {
    if ((customerBalance - transactionValue) * -1 > customerLimit) {
      throw new UnprocessableEntityException(
        'Cliente does not have enough limit',
      );
    }

    return customerBalance - transactionValue;
  }
}
