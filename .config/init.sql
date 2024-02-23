--- TABLES
CREATE UNLOGGED TABLE customers (
	id SERIAL PRIMARY KEY,
	account_limit INTEGER NOT NULL,
	account_balance INTEGER NOT NULL DEFAULT 0
);

CREATE UNLOGGED TABLE transactions (
	id SERIAL PRIMARY KEY,
	customer_id INTEGER NOT NULL,
	amount INTEGER NOT NULL,
	type CHAR(1) NOT NULL,
	description VARCHAR(10) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	CONSTRAINT fk_customers_transactions_id
		FOREIGN KEY (customer_id) REFERENCES customers(id)
);

--- INDEX
CREATE INDEX idx_customers_id ON customers (id);
CREATE INDEX idx_transactions_customer_id ON transactions (customer_id);
CREATE INDEX idx_transactions_customer_id_created_at ON transactions (customer_id, created_at DESC);

--- SEED
DO $$
BEGIN
	INSERT INTO customers (account_limit)
	VALUES
		(1000 * 100),
		(800 * 100),
		(10000 * 100),
		(100000 * 100),
		(5000 * 100);
END;
$$;
