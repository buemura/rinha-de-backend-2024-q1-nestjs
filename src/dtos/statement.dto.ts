import { Transaction } from './transaction.dto';

class Balance {
  total: number;
  data_extrato: Date;
  limite: number;
}

export class StatementResponseDto {
  saldo: Balance;
  ultimas_transacoes: Transaction[];
}
