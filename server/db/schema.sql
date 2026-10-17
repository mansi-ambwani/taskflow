-- TaskFlow database schema (MySQL 8)
-- Run automatically by `npm run db:setup`, or manually:  mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskflow;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('admin','member') NOT NULL DEFAULT 'member',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  status       ENUM('todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
  priority     ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  due_date     DATE NULL,
  created_by   INT UNSIGNED NOT NULL,
  assigned_to  INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_creator  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,

  -- Composite indexes that match the API's most common filter + sort patterns.
  -- (scripts/benchmark.js measures the speed-up these give.)
  KEY idx_tasks_assignee_status_created (assigned_to, status, created_at),
  KEY idx_tasks_creator_status_created  (created_by, status, created_at),
  KEY idx_tasks_status_priority_created (status, priority, created_at),
  KEY idx_tasks_due_status (due_date, status),
  FULLTEXT KEY ft_tasks_title_desc (title, description)
) ENGINE=InnoDB;
