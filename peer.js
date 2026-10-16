/* Serverless, explicitly paired WebRTC data sync. No signaling or ICE service. */
(() => {
  'use strict';
  const MAX_MESSAGE = 8 * 1024 * 1024, CHUNK = 4096;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const copy = value => structuredClone(value);
  const randomId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const flat = state => new Map([
    ['settings', state.settings], ['schedule', state.schedule], ['workplaces', state.workplaces], ['calculator', state.calculator],
    ['memo', { workMemo: state.workMemo, workMemoDelta: state.workMemoDelta }],
    ...state.records.map(record => [`record:${record.id}`, record]),
  ]);
  const newer = (a, b) => !b || a.clock > b.clock || (a.clock === b.clock && a.actor > b.actor);
  function encode(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    return 'FRT1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    const value = String(code).replace(/\s+/g, '');
    if (!/^FRT1\.[A-Za-z0-9_-]+$/.test(value) || value.length > 100000) throw new Error('연결 코드 전체를 복사해 붙여넣어 주세요.');
    let data;
    try { data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.slice(5).replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)))); }
    catch { throw new Error('연결 코드를 읽을 수 없습니다. 전체 코드를 다시 복사해 주세요.'); }
    if (data.version !== 1 || !['offer', 'answer'].includes(data.kind) || typeof data.session !== 'string' || data.session.length > 100 || typeof data.sdp !== 'string' || !data.sdp.startsWith('v=0') || data.sdp.length > 60000 || !Number.isFinite(data.expires) || data.expires < Date.now() || data.expires > Date.now() + 11 * 60000) throw new Error('만료되었거나 지원하지 않는 연결 코드입니다. 요청 코드를 새로 만드세요.');
    return data;
  }
  class FreeterPeer {
    constructor(options) {
      this.options = options; this.actor = randomId(); this.status = 'idle'; this.ready = false;
      this.pc = null; this.channel = null; this.localCode = ''; this.clock = 0;
      this.versions = new Map(); this.transfers = new Map(); this.outbound = Promise.resolve();
    }
    notify(status, message) { this.status = status; this.message = message; this.options.onStatus?.(status, message); }
    close(message = '기기 연결을 해제했어요. 기록은 각 기기에 그대로 남아 있습니다.') {
      this.ready = false; this.pendingStart = null; this.localCode = ''; this.session = null;
      const pc = this.pc, channel = this.channel; this.pc = null; this.channel = null;
      if (channel) { channel.onclose = null; channel.close(); }
      if (pc) { pc.onconnectionstatechange = null; pc.close(); }
      clearTimeout(this.connectTimer);
      for (const transfer of this.transfers.values()) clearTimeout(transfer.timer);
      this.transfers.clear(); this.notify('idle', message);
    }
    create(session) {
      if (!globalThis.RTCPeerConnection || !globalThis.isSecureContext) throw new Error('HTTPS의 최신 Chrome·Safari·Firefox에서 기기 연결을 이용해 주세요.');
      this.close('연결 준비 중'); this.session = session; this.clock = 0; this.versions.clear(); this.outbound = Promise.resolve();
      const pc = this.pc = new RTCPeerConnection({ iceServers: [] });
      pc.ondatachannel = event => this.bind(event.channel);
      pc.onconnectionstatechange = () => {
        if (this.pc !== pc) return;
        if (pc.connectionState === 'failed') this.close('직접 연결하지 못했어요. 같은 와이파이인지, 공유기의 기기 간 통신이 허용되는지 확인하고 다시 연결해 주세요.');
        else if (pc.connectionState === 'disconnected') this.notify('waiting', '기기 연결이 잠시 끊겼어요. 두 창과 와이파이 연결을 확인해 주세요.');
        else if (pc.connectionState === 'connected' && this.channel?.readyState === 'open') this.notify(this.ready ? 'syncing' : 'connected', this.ready ? '두 기기를 실시간으로 연동하고 있어요.' : '연결됐어요. 기준으로 사용할 기록을 선택해 주세요.');
      };
      return pc;
    }
    bind(channel) {
      if (channel.label !== 'freeter-data') { channel.close(); return; }
      this.channel = channel; channel.bufferedAmountLowThreshold = 65536;
      channel.onopen = () => { clearTimeout(this.connectTimer); this.notify('connected', '연결됐어요. 기록이 있는 기기에서 ‘이 기기 기록으로 시작’을 누르세요.'); };
      channel.onclose = () => { if (this.channel === channel) this.close('상대 기기의 창이 닫혔거나 연결이 해제됐어요. 다시 코드를 교환해 연결할 수 있어요.'); };
      channel.onerror = () => this.close('기기 연결 중 오류가 발생했어요. 저장된 기록은 유지됩니다.');
      channel.onmessage = event => this.receiveChunk(event.data).catch(error => this.close(error.message));
      if (channel.readyState === 'open') channel.onopen();
    }
    async gathered(pc) {
      if (pc.iceGatheringState === 'complete') return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('네트워크 연결 준비가 지연됐어요. 와이파이를 확인하고 다시 시도해 주세요.')), 12000);
        const change = () => { if (pc.iceGatheringState === 'complete') finish(); };
        function finish(error) { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', change); error ? reject(error) : resolve(); }
        pc.addEventListener('icegatheringstatechange', change); change();
      });
      if (this.pc !== pc) throw new Error('연결 요청이 취소됐어요.');
      if (!pc.localDescription?.sdp.includes('a=candidate:')) throw new Error('이 브라우저 또는 네트워크에서 기기 간 직접 통신을 허용하지 않습니다. 일반 와이파이의 다른 브라우저에서 시도해 주세요.');
    }
    code(kind) { return this.localCode = encode({ version: 1, kind, session: this.session, expires: Date.now() + 10 * 60000, sdp: this.pc.localDescription.sdp }); }
    async offer() {
      const pc = this.create(randomId()); this.notify('preparing', '이 기기의 요청 코드를 만들고 있어요.');
      this.bind(pc.createDataChannel('freeter-data', { ordered: true }));
      await pc.setLocalDescription(await pc.createOffer()); await this.gathered(pc);
      const result = this.code('offer'); this.notify('offer', '요청 코드를 다른 기기에 전달해 주세요. 두 기기의 창을 계속 열어 두세요.'); return result;
    }
    async accept(value) {
      const code = decode(value);
      if (code.kind === 'offer') {
        const pc = this.create(code.session); this.notify('preparing', '요청을 확인하고 응답 코드를 만들고 있어요.');
        await pc.setRemoteDescription({ type: 'offer', sdp: code.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await this.gathered(pc);
        const result = this.code('answer'); this.notify('answer', '응답 코드를 처음 요청한 기기에 붙여넣어 주세요.'); this.timeout(); return result;
      }
      if (!this.pc || this.session !== code.session || this.pc.localDescription?.type !== 'offer') throw new Error('이 기기에서 만든 요청에 대한 응답 코드가 아닙니다. 요청한 기기에 붙여넣어 주세요.');
      await this.pc.setRemoteDescription({ type: 'answer', sdp: code.sdp }); this.notify('waiting', '다른 기기와 직접 연결하고 있어요.'); this.timeout(); return this.localCode;
    }
    timeout() {
      clearTimeout(this.connectTimer); this.connectTimer = setTimeout(() => { if (this.channel?.readyState !== 'open') this.close('연결 시간이 초과됐어요. 두 기기를 같은 와이파이에 연결하고 새 코드로 다시 시도해 주세요.'); }, 45000);
    }
    send(message) {
      const channel = this.channel;
      const json = JSON.stringify(message);
      if (json.length > MAX_MESSAGE) { this.close('전송 가능한 기록 크기를 초과했어요. JSON 파일로 백업해 주세요.'); return; }
      this.outbound = this.outbound.then(async () => {
        const id = randomId(), total = Math.max(1, Math.ceil(json.length / CHUNK));
        for (let i = 0; i < total; i++) {
          if (!channel || this.channel !== channel || channel.readyState !== 'open') throw new Error('연결이 종료되어 전송을 멈췄어요. 기록은 이 기기에 저장돼 있습니다.');
          if (channel.bufferedAmount > 262144) await new Promise((resolve, reject) => {
            const timer = setTimeout(() => finish(new Error('전송이 지연됐어요. 와이파이 연결을 확인해 주세요.')), 15000);
            const low = () => finish();
            const closed = () => finish(new Error('전송 중 연결이 종료됐어요.'));
            function finish(error) { clearTimeout(timer); channel.removeEventListener('bufferedamountlow', low); channel.removeEventListener('close', closed); error ? reject(error) : resolve(); }
            channel.addEventListener('bufferedamountlow', low, { once: true }); channel.addEventListener('close', closed, { once: true });
            if (channel.bufferedAmount <= 65536) finish();
          });
          channel.send(JSON.stringify({ t: 'chunk', id, i, n: total, s: json.slice(i * CHUNK, (i + 1) * CHUNK) }));
        }
      }).catch(error => { if (this.channel === channel) this.close(error.message); });
    }
    async receiveChunk(raw) {
      if (typeof raw !== 'string' || raw.length > 30000) throw new Error('지원하지 않는 기기 메시지입니다.');
      const frame = JSON.parse(raw);
      if (frame.t !== 'chunk' || typeof frame.id !== 'string' || frame.id.length > 100 || !Number.isInteger(frame.i) || !Number.isInteger(frame.n) || frame.n < 1 || frame.n > Math.ceil(MAX_MESSAGE / CHUNK) || typeof frame.s !== 'string' || frame.s.length > CHUNK) throw new Error('기기 전송 형식이 올바르지 않습니다.');
      let transfer = this.transfers.get(frame.id);
      if (!transfer) {
        if (frame.i !== 0 || this.transfers.size >= 2) throw new Error('기기 전송 순서가 올바르지 않습니다.');
        transfer = { parts: [], n: frame.n, size: 0, timer: setTimeout(() => this.transfers.delete(frame.id), 30000) }; this.transfers.set(frame.id, transfer);
      }
      if (frame.i !== transfer.parts.length || frame.n !== transfer.n || (transfer.size += frame.s.length) > MAX_MESSAGE) throw new Error('기기 전송을 검증하지 못했습니다.');
      transfer.parts.push(frame.s);
      if (transfer.parts.length === transfer.n) {
        clearTimeout(transfer.timer); this.transfers.delete(frame.id);
        await this.receive(JSON.parse(transfer.parts.join('')));
      }
    }
    start() {
      if (this.channel?.readyState !== 'open' || this.ready || this.pendingStart || this.receivingStart) throw new Error('연결이 준비되면 한 기기에서만 시작해 주세요.');
      const snapshot = this.options.validate(copy(this.options.getState()));
      this.pendingStart = snapshot; this.send({ type: 'start', actor: this.actor, state: snapshot }); this.notify('confirming', '다른 기기에서 기록 교체 안내를 확인해 주세요.');
    }
    async receive(message) {
      if (!message || typeof message.type !== 'string') throw new Error('기기 메시지가 올바르지 않습니다.');
      if (message.type === 'start') {
        if (this.ready || this.pendingStart || this.receivingStart) { this.send({ type: 'declined' }); return; }
        const session = this.session, snapshot = this.options.validate(message.state); this.receivingStart = true;
        let approved;
        try { approved = await this.options.approve(snapshot); } finally { this.receivingStart = false; }
        if (this.session !== session || this.channel?.readyState !== 'open') return;
        if (!approved) { this.send({ type: 'declined' }); this.notify('connected', '기록 교체를 취소했어요. 사용할 기준 기기를 다시 선택할 수 있어요.'); return; }
        this.options.apply(snapshot, true); this.baseline = copy(snapshot); this.ready = true; this.send({ type: 'started' }); this.notify('syncing', '두 기기를 실시간으로 연동하고 있어요.');
      } else if (message.type === 'started') {
        if (!this.pendingStart) throw new Error('시작 요청이 없는 연결 응답입니다.');
        this.baseline = this.pendingStart; this.pendingStart = null; this.ready = true; this.notify('syncing', '두 기기를 실시간으로 연동하고 있어요.'); this.publish(this.options.getState());
      } else if (message.type === 'declined') {
        this.pendingStart = null; this.notify('connected', '다른 기기에서 기록 교체를 취소했어요. 기준 기기를 다시 선택해 주세요.');
      } else if (message.type === 'patch') {
        if (!this.ready || !Array.isArray(message.changes) || message.changes.length > 50010) throw new Error('연동이 시작되지 않았거나 변경 내용이 올바르지 않습니다.');
        const candidate = copy(this.options.getState()), records = new Map(candidate.records.map(r => [r.id, r])), accepted = [];
        for (const change of message.changes) {
          if (!change || typeof change.key !== 'string' || change.key.length > 110 || !Number.isSafeInteger(change.clock) || change.clock < 1 || change.clock > 1000000000 || typeof change.actor !== 'string' || change.actor.length > 100) throw new Error('변경 이력이 올바르지 않습니다.');
          const previous = this.versions.get(change.key); this.clock = Math.max(this.clock, change.clock);
          if (!newer(change, previous)) continue;
          if (previous && previous.actor !== change.actor && !same(previous, change.base ?? null)) this.options.onConflict?.(change.key, copy(candidate));
          if (change.key.startsWith('record:')) {
            const id = change.key.slice(7); if (change.value === null) records.delete(id);
            else { if (!change.value || change.value.id !== id) throw new Error('근무 기록의 ID가 일치하지 않습니다.'); records.set(id, change.value); }
          } else if (change.key === 'memo') { candidate.workMemo = change.value?.workMemo; candidate.workMemoDelta = change.value?.workMemoDelta; }
          else if (['settings', 'schedule', 'workplaces', 'calculator'].includes(change.key)) candidate[change.key] = change.value;
          else throw new Error('지원하지 않는 연동 항목입니다.');
          accepted.push(change);
        }
        if (!accepted.length) return;
        candidate.records = [...records.values()]; const validated = this.options.validate(candidate);
        this.options.apply(validated, false); this.baseline = copy(validated);
        for (const change of accepted) this.versions.set(change.key, { clock: change.clock, actor: change.actor });
        this.options.onStatus?.('syncing', '방금 다른 기기의 변경 내용을 반영했어요.');
      } else throw new Error('지원하지 않는 기기 메시지입니다.');
    }
    publish(state) {
      if (!this.ready || this.channel?.readyState !== 'open') return;
      const before = flat(this.baseline), after = flat(state), keys = new Set([...before.keys(), ...after.keys()]);
      const changes = [];
      for (const key of keys) if (!same(before.get(key), after.get(key))) changes.push({ key, value: copy(after.get(key) ?? null) });
      if (!changes.length) return;
      const clock = ++this.clock;
      for (const change of changes) { change.base = this.versions.get(change.key) ?? null; change.clock = clock; change.actor = this.actor; this.versions.set(change.key, { clock, actor: this.actor }); }
      this.baseline = copy(state); this.send({ type: 'patch', changes });
    }
  }
  globalThis.FreeterPeer = FreeterPeer;
})();
