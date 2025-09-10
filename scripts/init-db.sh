#!/bin/bash
# Database initialization script with security best practices

set -e

# Create tables if they don't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable row-level security
    ALTER DATABASE $POSTGRES_DB SET row_security = on;
    
    -- Create broadcasts table with proper constraints
    CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        stream_id VARCHAR(64) NOT NULL CHECK (length(stream_id) > 0),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Create chat_messages table with proper constraints
    CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
        stream_id VARCHAR(64) NOT NULL CHECK (length(stream_id) > 0),
        user_sub VARCHAR(255) NULL,
        user_name VARCHAR(100) NOT NULL CHECK (length(user_name) > 0),
        text TEXT NOT NULL CHECK (length(text) > 0 AND length(text) <= 500),
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Create reactions table with proper constraints
    CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
        stream_id VARCHAR(64) NOT NULL CHECK (length(stream_id) > 0),
        user_sub VARCHAR(255) NULL,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('like', 'heart', 'dislike')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Create events table for scheduled streams
    CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL CHECK (length(name) > 0),
        event_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255) NULL
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_broadcasts_stream_id_active 
        ON broadcasts(stream_id, started_at DESC) WHERE ended_at IS NULL;
    
    CREATE INDEX IF NOT EXISTS idx_chat_messages_broadcast_id 
        ON chat_messages(broadcast_id, id DESC);
    
    CREATE INDEX IF NOT EXISTS idx_reactions_broadcast_id 
        ON reactions(broadcast_id, kind);
        
    CREATE INDEX IF NOT EXISTS idx_events_date 
        ON events(event_date ASC);
        
    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS \$\$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    \$\$ language plpgsql;
    
    -- Add updated_at triggers
    DROP TRIGGER IF EXISTS update_broadcasts_updated_at ON broadcasts;
    CREATE TRIGGER update_broadcasts_updated_at
        BEFORE UPDATE ON broadcasts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
    DROP TRIGGER IF EXISTS update_events_updated_at ON events;
    CREATE TRIGGER update_events_updated_at
        BEFORE UPDATE ON events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
    -- Set up basic security policies (example)
    -- Note: Customize these based on your authentication system
    
    -- Grant appropriate permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON broadcasts TO $POSTGRES_USER;
    GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO $POSTGRES_USER;
    GRANT SELECT, INSERT, UPDATE, DELETE ON reactions TO $POSTGRES_USER;
    GRANT SELECT, INSERT, UPDATE, DELETE ON events TO $POSTGRES_USER;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;
    
    -- Log successful initialization
    SELECT 'Database initialized successfully' as status;
EOSQL

echo "Database initialization completed!"