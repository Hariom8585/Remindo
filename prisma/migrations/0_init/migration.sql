-- REMINDO Database Schema for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS remindo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE remindo;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  default_advance_minutes INT DEFAULT 15,
  default_alert_mode VARCHAR(32) DEFAULT 'ALARM',
  default_snooze_minutes INT DEFAULT 15,
  timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
  sound_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(32) DEFAULT 'dark',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(64) DEFAULT 'Other',
  priority VARCHAR(16) DEFAULT 'MEDIUM',
  due_date DATETIME(3) NULL,
  due_time VARCHAR(32) NULL,
  alert_mode VARCHAR(32) DEFAULT 'ALARM',
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_tasks_user_completed (user_id, is_completed),
  INDEX idx_tasks_due_date (due_date),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  remind_at DATETIME(3) NOT NULL,
  channel VARCHAR(32) DEFAULT 'BROWSER',
  alert_mode VARCHAR(32) DEFAULT 'ALARM',
  status VARCHAR(32) DEFAULT 'PENDING',
  advance_minutes INT DEFAULT 0,
  sent_at DATETIME(3) NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_reminders_user_status (user_id, status),
  INDEX idx_reminders_remind_status (remind_at, status),
  CONSTRAINT fk_reminders_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id VARCHAR(36) PRIMARY KEY,
  reminder_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  error_message TEXT NULL,
  delivered_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_logs_user (user_id),
  INDEX idx_logs_delivered (delivered_at),
  CONSTRAINT fk_logs_reminder FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE SET NULL,
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
