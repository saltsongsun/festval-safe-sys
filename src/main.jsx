import React from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import App from './App.jsx'

// ─── Supabase 초기화 ─────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project-id.supabase.co') {
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { params: { eventsPerSecond: 10 } }
  })
  console.log('✅ Supabase 연결됨:', supabaseUrl)
} else {
  console.log('⚠️ Supabase 미설정 — localStorage 모드로 동작합니다.')
}

// ─── Storage Adapter ─────────────────────────────────────────────
// Supabase가 연결되면 DB 사용, 아니면 localStorage 사용
// 모든 기기가 같은 데이터를 공유합니다.
window.storage = supabase ? {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return { key, value: JSON.stringify(data.value) }
    } catch (e) {
      console.warn('storage.get 실패, localStorage fallback:', e.message)
      const val = localStorage.getItem(key)
      return val ? { key, value: val } : null
    }
  },

  async set(key, value) {
    try {
      const parsed = JSON.parse(value)
      const { error } = await supabase
        .from('app_state')
        .upsert({ key, value: parsed, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      // localStorage에도 백업
      localStorage.setItem(key, value)
      return { key, value }
    } catch (e) {
      console.warn('storage.set 실패, localStorage fallback:', e.message)
      localStorage.setItem(key, value)
      return { key, value }
    }
  },

  async delete(key) {
    try {
      await supabase.from('app_state').delete().eq('key', key)
      localStorage.removeItem(key)
    } catch { localStorage.removeItem(key) }
    return { key, deleted: true }
  },

  async list(prefix) {
    try {
      const { data } = await supabase.from('app_state').select('key')
      const keys = (data || []).map(d => d.key).filter(k => !prefix || k.startsWith(prefix))
      return { keys }
    } catch { return { keys: [] } }
  }
} : {
  // localStorage 전용 모드
  async get(key) {
    const val = localStorage.getItem(key)
    return val ? { key, value: val } : null
  },
  async set(key, value) {
    localStorage.setItem(key, value)
    return { key, value }
  },
  async delete(key) {
    localStorage.removeItem(key)
    return { key, deleted: true }
  },
  async list(prefix) {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!prefix || k.startsWith(prefix)) keys.push(k)
    }
    return { keys }
  }
}

// ─── Supabase Realtime 구독 (다른 기기의 변경 감지) ──────────────
if (supabase) {
  supabase
    .channel('app_state_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state' }, (payload) => {
      if (payload.new?.key && payload.new?.value) {
        const key = payload.new.key
        const value = JSON.stringify(payload.new.value)
        localStorage.setItem(key, value)
        // React usePersist 훅에 변경 알림 → 즉시 상태 업데이트
        window.dispatchEvent(new CustomEvent('supabase-sync', {
          detail: { key, value }
        }))
      }
    })
    .subscribe((status) => {
      console.log('Realtime 구독 상태:', status)
    })
}

// ─── 렌더링 ──────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
