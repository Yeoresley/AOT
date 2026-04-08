CREATE DATABASE IF NOT EXISTS rapitrans_workshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rapitrans_workshop;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(191) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(191) PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(191) NOT NULL,
  role_id VARCHAR(191) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(191) NOT NULL,
  permission_id VARCHAR(191) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE IF NOT EXISTS establishments (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  margin_usd_pct DECIMAL(8,4) NOT NULL,
  margin_cup_pct DECIMAL(8,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(191) PRIMARY KEY,
  plate VARCHAR(32) NOT NULL UNIQUE,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  year INT NULL,
  vin VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(191) PRIMARY KEY,
  folio VARCHAR(60) NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','PENDING_CLOSURE','CLOSED','CANCELED') NOT NULL DEFAULT 'OPEN',
  establishment_id VARCHAR(191) NOT NULL,
  client_id VARCHAR(191) NOT NULL,
  vehicle_id VARCHAR(191) NOT NULL,
  delivered_by VARCHAR(180) NOT NULL,
  received_by VARCHAR(180) NOT NULL,
  received_at DATETIME NOT NULL,
  requested_activity TEXT NOT NULL,
  vehicle_condition_notes TEXT NOT NULL,
  visible_incidents TEXT NOT NULL,
  initial_traceability TEXT NOT NULL,
  cancellation_reason TEXT NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT uq_work_orders_est_folio UNIQUE (establishment_id, folio),
  CONSTRAINT fk_work_orders_establishment FOREIGN KEY (establishment_id) REFERENCES establishments(id),
  CONSTRAINT fk_work_orders_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_work_orders_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  INDEX idx_work_orders_status_received_at (status, received_at),
  INDEX idx_work_orders_client (client_id),
  INDEX idx_work_orders_vehicle (vehicle_id)
);

CREATE TABLE IF NOT EXISTS work_order_cost_summary (
  id VARCHAR(191) PRIMARY KEY,
  work_order_id VARCHAR(191) NOT NULL UNIQUE,
  salary_usd DECIMAL(14,4) NOT NULL,
  salary_cup DECIMAL(14,4) NOT NULL,
  salary_overhead_usd DECIMAL(14,4) NOT NULL,
  salary_overhead_cup DECIMAL(14,4) NOT NULL,
  depreciation_usd DECIMAL(14,4) NOT NULL,
  depreciation_cup DECIMAL(14,4) NOT NULL,
  outsourced_usd DECIMAL(14,4) NOT NULL,
  outsourced_cup DECIMAL(14,4) NOT NULL,
  consumables_usd DECIMAL(14,4) NOT NULL,
  consumables_cup DECIMAL(14,4) NOT NULL,
  ppa_usd DECIMAL(14,4) NOT NULL,
  ppa_cup DECIMAL(14,4) NOT NULL,
  total_cost_usd DECIMAL(14,4) NOT NULL,
  total_cost_cup DECIMAL(14,4) NOT NULL,
  margin_usd DECIMAL(14,4) NOT NULL,
  margin_cup DECIMAL(14,4) NOT NULL,
  invoice_total_usd DECIMAL(14,4) NOT NULL,
  invoice_total_cup DECIMAL(14,4) NOT NULL,
  calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cost_summary_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NULL,
  action VARCHAR(120) NOT NULL,
  entity VARCHAR(120) NOT NULL,
  entity_id VARCHAR(191) NULL,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity_created_at (entity, created_at)
);
