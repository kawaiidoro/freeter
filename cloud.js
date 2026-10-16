import { emptyState, validateState } from './core.js';

export const CLOUD_LIMIT = 2 * 1024 * 1024;
export function cloudConfig(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['url','publishableKey'].includes(key)))throw new Error('공개 Supabase 설정에는 URL과 Publishable key만 넣으세요.');
  if (!input?.url && !input?.publishableKey) return null;
  const url = new URL(input.url);
  if (url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Supabase Project URL을 확인하세요.');
  const key = input.publishableKey;
  let allowed = typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key);
  if (!allowed && typeof key === 'string' && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) {
    try { const payload = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); allowed = payload.role === 'anon' && (!payload.ref || payload.ref === url.hostname.split('.')[0]); } catch { /* Never accept private or malformed keys. */ }
  }
  if (!allowed) throw new Error('프런트엔드에는 Publishable 또는 anon public key만 사용할 수 있습니다.');
  return { url: url.origin, publishableKey: key, project: url.hostname.split('.')[0] };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const copy = value => structuredClone(value);
export function mergeWorkspaces(base, local, remote) {
  const result = copy(remote), conflicts = [];
  const choose = (key, a, b, c) => {
    if (same(b, a)) return c;
    if (same(c, a) || same(b, c)) return b;
    conflicts.push(key); return b;
  };
  for (const key of ['schedule', 'settings', 'calculator']) result[key] = choose(key, base[key], local[key], remote[key]);
  const memo = s => [s.workMemo, s.workMemoDelta];
  [result.workMemo, result.workMemoDelta] = choose('memo', memo(base), memo(local), memo(remote));
  const maps = [base, local, remote].map(s => new Map(s.records.map(r => [r.id, r])));
  result.records = [...new Set(maps.flatMap(m => [...m.keys()]))].map(id => choose('record:' + id, ...maps.map(m => m.get(id)))).filter(Boolean);
  result.workplaces = [...new Set([...local.workplaces, ...remote.workplaces, ...result.records.map(r => r.workplace)])];
  return { data: validateState(result), conflicts };
}
const labels = {
  disabled: '계정 서비스 준비 중', guest: '이 브라우저에 저장', loading: '계정 기록을 불러오는 중',
  pending: '기기에 저장됨 · 업로드 대기', syncing: '계정에 저장 중', synced: '계정 동기화 완료',
  offline: '연결 대기 · 이 기기의 기록은 보존돼요', conflict: '동시 수정 확인 필요', error: '동기화 확인 필요',
};
export function cloudError(error) {
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return '계정 저장소 설정이 완료되지 않았어요. 잠시 후 다시 시도해 주세요.';
  if (error?.code === '42501') return '계정 기록에 접근할 수 없어요. 다시 로그인해 주세요.';
  return '계정에 연결하지 못했어요. 이 기기의 기록은 보존됩니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
}
export class FreeterCloud {
  constructor({ config, createClient, storage, onStatus = () => {}, onWorkspace = () => {}, onGuest = () => {}, delay = 800, request = (...args)=>globalThis.fetch(...args) }) {
    this.config = cloudConfig(config); this.storage = storage; this.onStatus = onStatus; this.onWorkspace = onWorkspace; this.onGuest = onGuest; this.delay = delay;this.request=request;
    this.user = null; this.target = undefined; this.epoch = 0; this.phase = this.config ? 'guest' : 'disabled'; this.message = ''; this.revision = 0; this.generation = 1; this.dirty = false; this.reset = false; this.current = emptyState(); this.base = emptyState(); this.lastSynced = null;
    if (this.config) try{this.client = createClient(this.config.url, this.config.publishableKey, {
      auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, storageKey: `freeter:auth:${this.config.project}`, storage },
      global: { fetch: (url, options) => this.request(url, { ...options, cache: 'no-store', referrerPolicy: 'no-referrer' }) },
    });}catch{this.config=null;this.phase='disabled';this.message='이 브라우저에서 계정 서비스를 시작하지 못했어요. 기존 도구는 계속 사용할 수 있습니다.';}
  }
  get cacheKey() { return this.user ? `freeter:account:${this.config.project}:${this.user.id}` : null; }
  get snapshot() { return { phase: this.phase, label: this.message || labels[this.phase], user: this.user, configured: !!this.config, pending: this.dirty, signingOut:!!this.signingOut,lastSynced: this.lastSynced }; }
  status(phase, message = '') { this.phase = phase; this.message = message; this.onStatus(this.snapshot); }
  persist() {
    this.storage.setItem(this.cacheKey, JSON.stringify({ owner: this.user.id, data: this.current, base: this.base, revision: this.revision, generation: this.generation, dirty: this.dirty, reset: this.reset }));
  }
  async start(callbackUrl, replaceUrl) {
    let code=null,failed=false;
    if(callbackUrl){
      const url=new URL(callbackUrl);code=url.searchParams.get('code');failed=url.searchParams.has('error')||url.searchParams.has('error_description');
      for(const key of ['code','error','error_description','error_code','state','access_token','refresh_token'])url.searchParams.delete(key);
      if(/access_token=|refresh_token=|error_description=/.test(url.hash))url.hash='';
      if(url.href!==callbackUrl)replaceUrl?.(url.href);
    }
    if (!this.client) { this.status('disabled',this.message); return; }
    this.subscription = this.client.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') setTimeout(() => this.sessionChanged(session).catch(() => this.status('error')), 0);
    }).data.subscription;
    if (failed) { this.status('guest', '로그인을 완료하지 못했어요. Google 로그인을 다시 시도해 주세요.'); return; }
    if (code) {
      const { error } = await this.client.auth.exchangeCodeForSession(code);
      if (error) { this.status('guest', '로그인 확인 시간이 지났거나 다른 브라우저에서 요청했어요. 다시 로그인해 주세요.'); return; }
    }
    const { data, error } = await this.client.auth.getSession();
    if (error) { this.status('error', cloudError(error)); return; }
    await this.sessionChanged(data.session);
  }
  async sessionChanged(session) {
    const target = session?.user?.id || null;
    if (target === this.target) return;
    this.target = target; const epoch = ++this.epoch; clearTimeout(this.timer); this.stopPolling(); this.user = null; this.dirty = false; this.reset = false;
    this.current = emptyState(); this.base = emptyState(); this.revision = 0; this.generation = 1;
    if (!target) { this.onGuest(); this.status('guest'); return; }
    this.status('loading');
    const { data, error } = await this.client.auth.getUser();
    if (epoch !== this.epoch) return;
    if (error || !data.user || data.user.id !== target) { this.target = undefined; this.onGuest(); this.status('error', '계정을 확인하지 못했어요. 인터넷 연결 후 다시 시도해 주세요.'); return; }
    this.user = { id: data.user.id, email: data.user.email || '' };
    try {
      const raw = this.storage.getItem(this.cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.owner !== target || !Number.isSafeInteger(cached.revision) || cached.revision < 0 || !Number.isSafeInteger(cached.generation) || cached.generation < 1 || typeof cached.dirty !== 'boolean') throw new Error('Invalid account cache');
        this.current = validateState(cached.data); this.base = validateState(cached.base); this.revision = cached.revision; this.generation = cached.generation; this.dirty = cached.dirty; this.reset = cached.reset === true;
      }
    } catch {
      this.status('error', '이 기기의 계정 기록을 읽지 못했어요. 저장 원본은 유지했으며 자동 동기화를 멈췄어요.'); this.cacheBlocked = true; this.onWorkspace(emptyState()); return;
    }
    this.cacheBlocked = false; this.onWorkspace(copy(this.current));
    await this.sync(); if (epoch !== this.epoch) return;
    this.interval = setInterval(() => { if (typeof document === 'undefined' || !document.hidden) this.sync(); }, 10000);
  }
  async googleLogin(redirectTo) {
    if (!this.client) throw new Error('계정 서비스가 준비 중이에요. 기존 도구는 계속 사용할 수 있어요.');
    let settings;
    try{const response=await this.request(this.config.url+'/auth/v1/settings',{headers:{apikey:this.config.publishableKey},cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(response.ok)settings=await response.json();}catch{/* Keep the current page and saved data when login is unavailable. */}
    if(settings?.external?.google!==true)throw new Error('지금은 Google 로그인을 사용할 수 없어요. 잠시 후 다시 시도해 주세요. 기존 도구는 계속 사용할 수 있습니다.');
    const { data, error } = await this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    if (error) throw new Error('Google 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    const url = new URL(data.url);
    if (url.origin !== this.config.url || url.pathname !== '/auth/v1/authorize') throw new Error('로그인 주소를 확인하지 못했어요.');
    return url.href;
  }
  save(data, { reset = false } = {}) {
    if (!this.user || this.cacheBlocked || this.signingOut) return false;
    const next = validateState(data);
    if (new TextEncoder().encode(JSON.stringify(next)).length > CLOUD_LIMIT) { this.status('error', '계정 저장은 2MB까지 가능해요. 전체 기록을 JSON으로 백업한 후 기록을 정리해 주세요.'); return false; }
    this.current = next; this.dirty = true; this.reset ||= reset; if(reset)this.resetSerial=(this.resetSerial||0)+1;
    try { this.persist(); } catch { this.status('error', '이 기기에 기록을 저장하지 못했어요. 새로고침 전에 JSON으로 백업해 주세요.'); return false; }
    if (this.phase !== 'conflict') { this.status('pending'); clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), this.delay); }
    return true;
  }
  async read(user) {
    const { data, error } = await this.client.from('freeter_workspaces').select('data,revision,generation,updated_at').eq('user_id', user).maybeSingle();
    if (error) throw error;
    if (!data) return { data: emptyState(), revision: 0, generation: 1, updated_at: null };
    if (!Number.isSafeInteger(data.revision) || data.revision < 1 || !Number.isSafeInteger(data.generation) || data.generation < 1) throw new Error('Invalid server revision');
    return { ...data, data: validateState(data.data) };
  }
  applyRemote(remote) {
    const changed = !same(this.current, remote.data);
    const previous={current:this.current,base:this.base,revision:this.revision,generation:this.generation,dirty:this.dirty,reset:this.reset,lastSynced:this.lastSynced};
    this.current = copy(remote.data); this.base = copy(remote.data); this.revision = remote.revision; this.generation = remote.generation; this.dirty = false; this.reset = false; this.lastSynced = remote.updated_at;
    try{this.persist();}catch(error){Object.assign(this,previous);throw error;}
    if (changed) this.onWorkspace(copy(this.current)); this.status('synced');
  }
  reconcile(remote) {
    if (!this.dirty) { this.applyRemote(remote); return true; }
    if (remote.generation !== this.generation || remote.revision < this.revision || (this.reset&&remote.revision!==this.revision)) { this.status('conflict'); return false; }
    if(this.reset)return true;
    const merged = mergeWorkspaces(this.base, this.current, remote.data);
    if (merged.conflicts.length) { this.status('conflict'); return false; }
    const changed = !same(this.current, merged.data);
    const previous={current:this.current,base:this.base,revision:this.revision,generation:this.generation,dirty:this.dirty};
    this.current = merged.data; this.base = copy(remote.data); this.revision = remote.revision; this.generation = remote.generation; this.dirty = !same(this.current, this.base);
    try{this.persist();}catch(error){Object.assign(this,previous);throw error;}
    if (changed) this.onWorkspace(copy(this.current)); return true;
  }
  async sync() {
    if (!this.user || this.cacheBlocked || this.phase === 'conflict') return false;
    if (this.inFlight?.epoch === this.epoch) return this.inFlight.promise;
    const epoch = this.epoch, user = this.user.id;
    const promise = this.runSync(epoch, user).catch(error => { if (epoch === this.epoch) this.status('offline', cloudError(error)); return false; }).finally(() => { if (this.inFlight?.epoch === epoch) this.inFlight = null; });
    this.inFlight = { epoch, promise }; return promise;
  }
  async runSync(epoch, user) {
    this.status('syncing');
    if (!this.dirty) {
      const remote = await this.read(user); if (epoch !== this.epoch) return false;
      // An edit may have happened while the read was in flight.
      if (!this.reconcile(remote)) return false;
    }
    for (let attempt = 0; this.dirty && attempt < 3; attempt++) {
      const sent = copy(this.current), reset = this.reset, resetSerial=this.resetSerial;
      const { data, error } = await this.client.rpc('freeter_save_workspace', { p_data: sent, p_expected_revision: this.revision, p_expected_generation: this.generation, p_reset: reset });
      if (epoch !== this.epoch) return false;
      if (error) {
        if (error.code !== '40001') throw error;
        const remote = await this.read(user); if (epoch !== this.epoch) return false;
        if (!this.reconcile(remote)) return false;
        continue;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !Number.isSafeInteger(row.revision) || row.revision <= this.revision || !Number.isSafeInteger(row.generation) || row.generation < this.generation) throw new Error('Invalid save response');
      this.base = sent; this.revision = row.revision; this.generation = row.generation; this.lastSynced = row.updated_at; this.dirty = !same(this.current, sent); if (this.resetSerial === resetSerial) this.reset = false; this.persist();
    }
    this.status(this.dirty ? 'pending' : 'synced'); return !this.dirty;
  }
  async resolve(choice) {
    if (!this.user || !['local', 'remote'].includes(choice)) throw new Error('기록을 선택해 주세요.');
    const epoch = this.epoch, remote = await this.read(this.user.id); if (epoch !== this.epoch) return;
    // Recovery stays private to this account. Never overwrite it after a failed write.
    this.storage.setItem(this.cacheKey + ':recovery', JSON.stringify(this.current));
    if (choice === 'remote') { this.applyRemote(remote); return; }
    this.base = copy(remote.data); this.revision = remote.revision; this.generation = remote.generation; this.dirty = true; this.persist(); this.status('pending'); await this.sync();
  }
  async signOut({discardPending=false}={}) {
    const epoch=this.epoch;
    if (this.dirty && !discardPending && !await this.sync()) { const error=new Error('아직 계정에 저장하지 못한 기록이 있어요. JSON으로 백업해 주세요.');error.code='UNSAVED';throw error; }
    if(epoch!==this.epoch)throw new Error('계정이 변경되어 로그아웃을 중지했어요.');
    const key = this.cacheKey;
    this.signingOut=true;this.status('syncing','로그아웃 중');
    let result;try{result=await this.client.auth.signOut({ scope: 'local' });}catch{this.signingOut=false;this.status('error');throw new Error('로그아웃을 완료하지 못했어요. 다시 시도해 주세요.');}
    const {error}=result;
    if (error && this.storage.getItem(`freeter:auth:${this.config.project}`)) {this.signingOut=false;this.status('error');throw new Error('로그아웃을 완료하지 못했어요. 인터넷 연결 후 다시 시도해 주세요.');}
    if (key) { this.storage.removeItem(key); this.storage.removeItem(key + ':recovery'); }
    this.cacheBlocked = false;this.signingOut=false;await this.sessionChanged(null);return {revoked:!error};
  }
  stopPolling() { if (this.interval) clearInterval(this.interval); this.interval = null; }
  stop() { clearTimeout(this.timer); this.stopPolling(); this.subscription?.unsubscribe(); this.epoch++; }
}
