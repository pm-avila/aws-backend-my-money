-- init-scripts/01-create-extensions.sql
-- This file will be executed automatically when the container starts

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional databases if needed
-- CREATE DATABASE test_db;

-- Create custom schemas
CREATE SCHEMA IF NOT EXISTS app_schema;
CREATE SCHEMA IF NOT EXISTS audit_schema;

-- Create a sample table structure
CREATE TABLE IF NOT EXISTS app_schema.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an audit table for tracking changes
CREATE TABLE IF NOT EXISTS audit_schema.user_audit (
    audit_id SERIAL PRIMARY KEY,
    user_id UUID,
    operation VARCHAR(10),
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(50),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON app_schema.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON app_schema.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON app_schema.users(created_at);

-- Create a trigger function for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to the users table
DROP TRIGGER IF EXISTS update_users_updated_at ON app_schema.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON app_schema.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO app_schema.users (username, email, password_hash) 
VALUES 
    ('admin', 'admin@example.com', 'hashed_password_here'),
    ('user1', 'user1@example.com', 'hashed_password_here')
ON CONFLICT (username) DO NOTHING;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA app_schema TO myapp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_schema TO myapp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_schema TO myapp_user;

GRANT USAGE ON SCHEMA audit_schema TO myapp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit_schema TO myapp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit_schema TO myapp_user;