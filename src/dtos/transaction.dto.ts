import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TransactionTypeEnum } from 'src/enums/transaction-type.enum';

export class Transaction {
  amount: number;
  type: TransactionTypeEnum;
  description: string;
  created_at: Date;
}

export class CreateTransactionRequestDto {
  @IsNotEmpty()
  @IsInt()
  valor: number;

  @IsNotEmpty()
  @IsEnum(TransactionTypeEnum)
  tipo: TransactionTypeEnum;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  descricao: string;
}

export class CreateTransactionResponseDto {
  limite: number;
  saldo: number;
}
