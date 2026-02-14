-- Solana Radar - Database Schema
-- Run this in Supabase SQL Editor
-- This script drops all existing tables and recreates them from scratch.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS narrative_signals CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;
DROP TABLE IF EXISTS narratives CASCADE;
DROP TABLE IF EXISTS signals CASCADE;
DROP TABLE IF EXISTS metric_history CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;
DROP TABLE IF EXISTS collection_runs CASCADE;

-- Collection runs table
CREATE TABLE collection_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  signals_collected INTEGER NOT NULL DEFAULT 0,
  sources_queried TEXT[] NOT NULL DEFAULT '{}',
  error_message TEXT
);

-- Signals table
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_run_id UUID REFERENCES collection_runs(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('github', 'onchain', 'defi', 'market', 'twitter', 'reddit', 'rss')),
  source_url TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  entities TEXT[] NOT NULL DEFAULT '{}',
  magnitude REAL NOT NULL DEFAULT 0,
  velocity REAL NOT NULL DEFAULT 0,
  novelty REAL NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  composite_score REAL NOT NULL DEFAULT 0,
  z_score REAL,
  strength TEXT NOT NULL DEFAULT 'weak' CHECK (strength IN ('weak', 'medium', 'strong', 'extreme')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Narratives table
CREATE TABLE narratives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_run_id UUID REFERENCES collection_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  explanation TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0,
  signal_count INTEGER NOT NULL DEFAULT 0,
  source_diversity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'emerging' CHECK (status IN ('emerging', 'active', 'declining')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  evidence_chain JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Narrative-Signal junction table
CREATE TABLE narrative_signals (
  narrative_id UUID NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  relevance_score REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (narrative_id, signal_id)
);

-- Ideas table
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  narrative_id UUID NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_user TEXT NOT NULL,
  technical_approach TEXT NOT NULL,
  differentiation TEXT NOT NULL,
  feasibility_score REAL NOT NULL DEFAULT 0,
  impact_score REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metric history for z-score baseline
CREATE TABLE metric_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('github', 'onchain', 'defi', 'market', 'twitter', 'reddit', 'rss')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data sources configuration
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('github', 'onchain', 'defi', 'market', 'twitter', 'reddit', 'rss')),
  url TEXT NOT NULL,
  last_collected_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_signals_source ON signals(source);
CREATE INDEX idx_signals_composite_score ON signals(composite_score DESC);
CREATE INDEX idx_signals_detected_at ON signals(detected_at DESC);
CREATE INDEX idx_signals_collection_run ON signals(collection_run_id);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_narratives_confidence ON narratives(confidence_score DESC);
CREATE INDEX idx_narratives_status ON narratives(status);
CREATE INDEX idx_narratives_slug ON narratives(slug);
CREATE INDEX idx_narratives_created_at ON narratives(created_at DESC);
CREATE INDEX idx_ideas_narrative ON ideas(narrative_id);
CREATE INDEX idx_metric_history_name ON metric_history(metric_name, recorded_at DESC);
CREATE INDEX idx_collection_runs_status ON collection_runs(status, started_at DESC);

-- Row level security
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read on collection_runs" ON collection_runs FOR SELECT USING (true);
CREATE POLICY "Allow public read on signals" ON signals FOR SELECT USING (true);
CREATE POLICY "Allow public read on narratives" ON narratives FOR SELECT USING (true);
CREATE POLICY "Allow public read on narrative_signals" ON narrative_signals FOR SELECT USING (true);
CREATE POLICY "Allow public read on ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Allow public read on metric_history" ON metric_history FOR SELECT USING (true);
CREATE POLICY "Allow public read on data_sources" ON data_sources FOR SELECT USING (true);
