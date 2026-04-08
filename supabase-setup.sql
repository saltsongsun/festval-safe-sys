-- ============================================================
-- 축제 재난안전 모니터링 시스템 — Supabase 테이블 설정
-- Supabase Dashboard → SQL Editor 에서 실행하세요
-- ============================================================

-- 1) 키-값 저장소 (앱 전체 상태 관리)
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);

-- 2) 알림 이력
CREATE TABLE IF NOT EXISTS alert_history (
  id BIGSERIAL PRIMARY KEY,
  festival_id TEXT DEFAULT 'default',
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) SMS 발송 이력
CREATE TABLE IF NOT EXISTS sms_log (
  id BIGSERIAL PRIMARY KEY,
  festival_id TEXT DEFAULT 'default',
  success BOOLEAN DEFAULT false,
  preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) 인파계수 로그
CREATE TABLE IF NOT EXISTS crowd_log (
  id BIGSERIAL PRIMARY KEY,
  festival_id TEXT DEFAULT 'default',
  zone_id TEXT,
  zone_name TEXT,
  delta INTEGER NOT NULL,
  total INTEGER NOT NULL,
  counter_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 실시간 구독을 위한 설정
ALTER TABLE app_state REPLICA IDENTITY FULL;

-- RLS 정책 (누구나 읽기/쓰기 — 축제 내부용)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_app_state" ON app_state FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_alert_history" ON alert_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_sms_log" ON sms_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE crowd_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crowd_log" ON crowd_log FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE app_state;

-- ============================================================
-- 설정 완료! 이제 Vercel에 배포하세요.
-- ============================================================
