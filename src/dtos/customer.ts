import { TransactionTypeEnum } from 'src/enums/transaction-type.enum';

export class Customer {
  id: number;
  name: string;
  account_limit: number;
  balance: number;
}

export class CustomerStatement {
  total: number;
  limite: number;
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}
