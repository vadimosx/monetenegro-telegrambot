-- Таблица кураторов (люди которые выдают евро)
CREATE TABLE IF NOT EXISTS curators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telegram_username VARCHAR(255),
  eur_balance DECIMAL(15, 2) DEFAULT 0,           -- текущий баланс EUR
  total_eur_purchased DECIMAL(15, 2) DEFAULT 0,   -- всего откуплено EUR
  total_usdt_spent DECIMAL(15, 2) DEFAULT 0,      -- всего потрачено USDT на откуп
  avg_buyback_rate DECIMAL(15, 6) DEFAULT 0,      -- средний курс откупа (USDT за 1 EUR)
  profit_balance_usdt DECIMAL(15, 2) DEFAULT 0,   -- накопленная прибыль куратора в USDT
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица откупов (пополнения евро куратором)
CREATE TABLE IF NOT EXISTS buybacks (
  id SERIAL PRIMARY KEY,
  curator_id INTEGER REFERENCES curators(id) ON DELETE CASCADE,
  eur_amount DECIMAL(15, 2) NOT NULL,             -- сумма откупленных EUR
  usdt_spent DECIMAL(15, 2) NOT NULL,             -- потрачено USDT
  rate DECIMAL(15, 6) NOT NULL,                   -- курс откупа (USDT за 1 EUR)
  eur_balance_before DECIMAL(15, 2),              -- баланс до откупа
  eur_balance_after DECIMAL(15, 2),               -- баланс после откупа
  avg_rate_before DECIMAL(15, 6),                 -- средний курс до откупа
  avg_rate_after DECIMAL(15, 6),                  -- средний курс после откупа
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Расширенная таблица сделок
CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  
  -- Направление обмена
  direction VARCHAR(50) NOT NULL,                 -- например: RUB_EUR, USDT_EUR, UAH_EUR
  
  -- Данные клиента
  client_nickname VARCHAR(255),
  client_telegram VARCHAR(255),
  city VARCHAR(100),
  
  -- Заявка (изначальные данные)
  requested_give_amount DECIMAL(15, 2),           -- клиент хочет отдать
  requested_give_currency VARCHAR(10),            -- валюта отдачи
  requested_receive_amount DECIMAL(15, 2),        -- клиент хочет получить
  requested_receive_currency VARCHAR(10),         -- валюта получения
  requested_rate DECIMAL(15, 6),                  -- курс в заявке
  
  -- Фактические данные (заполняются при закрытии)
  actual_give_amount DECIMAL(15, 2),              -- фактически отдал клиент
  actual_give_currency VARCHAR(10),
  actual_receive_amount DECIMAL(15, 2),           -- фактически получил клиент
  actual_receive_currency VARCHAR(10),
  actual_rate DECIMAL(15, 6),
  
  -- Курсы для расчета себестоимости
  rub_to_usdt_rate DECIMAL(15, 6),                -- курс рубля к USDT (если RUB направление)
  uah_to_usdt_rate DECIMAL(15, 6),                -- курс гривны к USDT (если UAH направление)
  
  -- Куратор и расчет прибыли
  curator_id INTEGER REFERENCES curators(id),
  curator_avg_rate_at_close DECIMAL(15, 6),       -- средний курс откупа на момент закрытия
  
  -- Финансовые показатели (рассчитываются при закрытии)
  revenue_usdt DECIMAL(15, 2),                    -- выручка в USDT (что получили от клиента)
  cost_usdt DECIMAL(15, 2),                       -- себестоимость в USDT (сколько стоило EUR)
  gross_profit_usdt DECIMAL(15, 2),               -- валовая прибыль
  curator_share_usdt DECIMAL(15, 2),              -- доля куратора (40%)
  net_profit_usdt DECIMAL(15, 2),                 -- чистая прибыль (60%)
  
  -- Банк для RUB/UAH переводов
  bank_name VARCHAR(255),
  
  -- Статус
  status VARCHAR(50) DEFAULT 'pending',           -- pending, in_progress, completed, cancelled
  
  -- Комментарии
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Таблица истории изменений баланса куратора
CREATE TABLE IF NOT EXISTS curator_balance_history (
  id SERIAL PRIMARY KEY,
  curator_id INTEGER REFERENCES curators(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,            -- buyback, deal_close, manual_adjustment
  reference_id INTEGER,                           -- ID связанной записи (buyback_id или deal_id)
  eur_change DECIMAL(15, 2),                      -- изменение EUR баланса
  usdt_change DECIMAL(15, 2),                     -- изменение USDT (для откупов)
  profit_change DECIMAL(15, 2),                   -- изменение прибыли
  eur_balance_after DECIMAL(15, 2),
  avg_rate_after DECIMAL(15, 6),
  profit_balance_after DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица курсов откупа валют в USDT (RUB, UAH)
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  currency VARCHAR(10) NOT NULL,                  -- RUB, UAH, EUR
  rate_to_usdt DECIMAL(15, 6) NOT NULL,          -- курс к USDT
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_deals_curator ON deals(curator_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buybacks_curator ON buybacks(curator_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_curator ON curator_balance_history(curator_id);
