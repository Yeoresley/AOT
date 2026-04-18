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

CREATE TABLE IF NOT EXISTS domain_event_outbox (
  id VARCHAR(191) PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id VARCHAR(191) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  INDEX idx_outbox_status_created_at (status, created_at)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(191) PRIMARY KEY,
  sku VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  unit_measure VARCHAR(40) NOT NULL,
  stock_on_hand DECIMAL(14,3) NOT NULL,
  min_stock DECIMAL(14,3) NOT NULL,
  max_stock DECIMAL(14,3) NULL,
  average_cost_usd DECIMAL(14,4) NOT NULL,
  average_cost_cup DECIMAL(14,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(191) PRIMARY KEY,
  po_number VARCHAR(80) NOT NULL UNIQUE,
  supplier_name VARCHAR(180) NOT NULL,
  status VARCHAR(40) NOT NULL,
  order_date DATETIME NOT NULL,
  currency ENUM('USD','CUP') NOT NULL,
  total_amount DECIMAL(14,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(191) PRIMARY KEY,
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  work_order_id VARCHAR(191) NOT NULL,
  issue_date DATETIME NOT NULL,
  due_date DATETIME NULL,
  status VARCHAR(40) NOT NULL,
  subtotal_usd DECIMAL(14,4) NOT NULL,
  subtotal_cup DECIMAL(14,4) NOT NULL,
  total_usd DECIMAL(14,4) NOT NULL,
  total_cup DECIMAL(14,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

CREATE TABLE IF NOT EXISTS receivable_items (
  id VARCHAR(191) PRIMARY KEY,
  invoice_id VARCHAR(191) NOT NULL,
  due_date DATETIME NOT NULL,
  amount_usd DECIMAL(14,4) NOT NULL,
  amount_cup DECIMAL(14,4) NOT NULL,
  paid_usd DECIMAL(14,4) NOT NULL,
  paid_cup DECIMAL(14,4) NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receivable_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS approval_flows (
  id VARCHAR(191) PRIMARY KEY,
  flow_code VARCHAR(80) NOT NULL UNIQUE,
  flow_name VARCHAR(180) NOT NULL,
  target_entity VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_levels (
  id VARCHAR(191) PRIMARY KEY,
  approval_flow_id VARCHAR(191) NOT NULL,
  level_order INT NOT NULL,
  role_code VARCHAR(80) NOT NULL,
  required TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT uq_approval_level_order UNIQUE (approval_flow_id, level_order),
  CONSTRAINT fk_approval_levels_flow FOREIGN KEY (approval_flow_id) REFERENCES approval_flows(id)
);

CREATE TABLE IF NOT EXISTS external_portal_users (
  id VARCHAR(191) PRIMARY KEY,
  client_id VARCHAR(191) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_external_portal_client (client_id)
);
