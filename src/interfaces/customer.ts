import { TransactionTypeEnum } from 'src/enums/transaction-type.enum';

export interface Customer {
  id: number;
  nome: string;
  limite: number;
  saldo: number;
}

export interface CustomerStatement {
  total: number;
  limite: number;
  valor: number;
  tipo: TransactionTypeEnum;
  descricao: string;
  realizada_em: Date;
}
