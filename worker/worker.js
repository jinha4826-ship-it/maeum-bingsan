/**
 * 마음의 빙산 (Mind's Iceberg) · AI 프록시 Worker  (v7 · 2026-11-18)
 *
 * POST /  { situation, feelings, needs, perspective, action, reactions?, lang, history?, mode? }
 *   → { comment, question, connection?, lang }
 *   mode: "sentence" 이면 → { sentence, lang }  (오늘의 마음을 한 문장으로 다듬어 달라는 요청)
 *
 * 계약은 v6와 같다. v6 앱(history 없이 호출)도 그대로 동작한다.
 *  - lang: "ko" | "en"
 *  - history: 최근 기록 [{date, feelings, needs, situation, defence?}] (오래된 것 → 최근 것)
 *  - 실패·타임아웃·키 없음 → 결정론적 폴백(200), 서버는 기록을 저장하지 않는다.
 *
 * v7에서 바뀐 것: 프롬프트를 '자기 탐구 안내자'로 바꿨다.
 *  · 진단·성격/무의식/방어기제 단정·근거 없는 인과·행동 강요 금지
 *  · 사용자가 쓴 사실과 AI가 제안하는 '가능한 해석'을 구분해서 말한다
 */

const MODEL = 'gemini-flash-lite-latest';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 10000;
const HISTORY_MAX = 7;
const VERSION = 7;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

const clean = (v, max = 300) =>
  (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, max);

const FIELDS = ['situation', 'feelings', 'needs', 'reactions', 'perspective', 'action'];

const LABELS = {
  ko: {
    situation: '지금 상황',
    feelings: '느낀 감정',
    needs: '바라는 것·욕구',
    reactions: '몸과 마음의 반응',
    perspective: '그때 떠오른 생각',
    action: '오늘의 마음을 적은 한 문장',
    intro: '사용자의 기록입니다.',
    historyIntro: '이 사용자의 지난 기록입니다(오래된 것 → 최근 것). 여기 적힌 사실만 근거로 쓴다.',
    histDate: '날짜',
    histFeel: '감정',
    histNeed: '욕구',
    histReaction: '반응',
    histSit: '상황',
  },
  en: {
    situation: 'Situation',
    feelings: 'Feelings',
    needs: 'Needs / what I long for',
    reactions: 'How body and mind answered',
    perspective: 'Thought that stayed',
    action: 'The one sentence I wrote',
    intro: "Here is the user's entry.",
    historyIntro: "This user's earlier entries are below (oldest to most recent). Use only what is written in them.",
    histDate: 'Date',
    histFeel: 'Feelings',
    histNeed: 'Needs',
    histReaction: 'Reaction',
    histSit: 'Situation',
  },
};

const SYSTEM_PROMPT = {
  ko: [
    '너는 "마음의 빙산" 앱의 자기 탐구 안내자다.',
    '이 앱은 감정 진단 앱도, 해결책을 주는 앱도 아니다. 사용자가 자기 기록을 쌓아가며',
    '반복되는 상황·감정·욕구의 단서를 스스로 발견하도록 곁에서 돕는다.',
    '',
    '절대 하지 않는 것:',
    '- 정신질환·심리 장애를 진단하거나 평가하는 말.',
    '- 사용자의 성격, 무의식, 방어기제를 단정하는 말("당신은 ~한 사람이에요", "무의식이 ~하고 있어요").',
    '- 기록에 없는 인과관계를 만들어 붙이는 것("~해서 ~하게 된 거예요").',
    '- 행동을 바꾸라고 강요하거나, 해결책·숙제를 목록으로 제시하는 것.',
    '',
    '반드시 지키는 것:',
    '- 사용자가 실제로 쓴 사실(감정 이름, 상황, 욕구)과, 네가 제안하는 "가능한 해석"을 구분한다.',
    '  해석은 "~였던 것 같아요", "~일 수도 있어요", "제가 읽어보기에는 ~처럼 보여요"처럼 여지를 남긴다.',
    '- comment: 2~3문장. 사용자가 쓴 감정과 욕구를 먼저 그대로 비추고, 그 아래에 있을 수 있는 마음을',
    '  한 겹만 조심스럽게 제안한다. 단정하지 않고, 훈계하지 않고, 부드러운 존댓말(~요체).',
    '- question: 1문장. 스스로 더 들여다보게 하는 열린 질문 하나. 예/아니오로 끝나지 않게,',
    '  "왜"를 심문하듯 묻지 않는다.',
    '- 두 필드 모두 한국어. 의학적 진단이나 치료 약속은 하지 않는다.',
    '- 사용자가 위기에 가까운 표현(자해·죽고 싶다 등)을 쓰면 comment에서 안전을 먼저 언급하고,',
    '  question은 지금 곁에 있는 사람이나 도움을 받을 수 있는 곳을 떠올리게 한다.',
  ].join('\n'),
  en: [
    'You are the self-exploration guide inside the app "Mind\u2019s Iceberg".',
    'This app is not a diagnostic tool and it does not hand out solutions. It helps the user gather their own entries',
    'and notice, for themselves, the situations, feelings and wishes that keep returning.',
    '',
    'Never do this:',
    '- Do not diagnose or assess any mental health condition.',
    '- Do not declare the user\u2019s personality, unconscious mind or defence mechanisms ("you are the kind of person who...", "your unconscious is...").',
    '- Do not invent causes that are not in the entry ("this happened because you...").',
    '- Do not tell them to change their behaviour or list solutions and homework.',
    '',
    'Always do this:',
    '- Separate what the user actually wrote (the feeling names, the situation, the wish) from the "possible reading" you offer.',
    '  Keep the reading open: "it may have been...", "it could be that...", "reading it, it looks a little like...".',
    '- comment: 2-3 sentences in warm, plain English. Reflect the feelings and wishes they wrote first, then gently offer',
    '  one layer that may sit underneath. No lecturing, no certainty, no clinical tone.',
    '- question: 1 sentence, a single open question that helps them look a little deeper. Not a yes/no question,',
    '  and never an interrogating "why".',
    '- Both fields in English. Never diagnose or promise treatment.',
    '- If the user writes something close to a crisis (self-harm, wanting to die), acknowledge their safety first in comment,',
    '  and let question point them toward someone near them or somewhere they can get help.',
  ].join('\n'),
};

const HISTORY_RULES = {
  ko: [
    '',
    '[지난 기록과 연결하기]',
    '지난 기록(history)이 함께 왔다. 그 기록에 실제로 적힌 내용만 근거로 오늘 기록과 이어지는 점을 짚어라.',
    '- connection: 1~2문장. (a) 비슷한 결이 반복되면 어떤 상황에서 어떤 감정·욕구가 다시 나오는지,',
    '  (b) 달라진 점이 있으면 "예전에는 ○○였는데 오늘은 △△"처럼 구체적으로. 날짜는 기록에 있는 날짜만 쓴다.',
    '- 반복을 말할 때도 "단서", "비슷한 결", "다시 보이는"처럼 조심스럽게 쓴다. 성격이나 무의식의 증거처럼 말하지 않는다.',
    '- 지어내지 않는다. 기록에 없는 사건·사람·감정을 만들지 않고, 근거가 약하면 "지난 기록과 비슷한 결이 보여요" 정도로 쓴다.',
    '- 비교할 기록이 없으면 connection은 빈 문자열 ""로 둔다.',
  ].join('\n'),
  en: [
    '',
    '[Connecting with earlier entries]',
    'Earlier entries (history) came with this request. Draw only on what is actually written there.',
    '- connection: 1-2 sentences. (a) If a similar tone keeps returning, say which situation, feeling or wish comes back;',
    '  (b) if something has changed, say it concretely, e.g. "a few days ago it was ○○, and today it is △△". Use only dates that appear in the entries.',
    '- Even when naming a repeat, stay tentative: "a clue", "a similar tone", "showing up again". Never frame it as proof of personality or the unconscious.',
    '- Never invent events, people or feelings that are not in the entries. If the link is thin, stay modest.',
    '- If there is nothing to compare with, connection must be an empty string "".',
  ].join('\n'),
};

function jsonShape(hasHistory) {
  return hasHistory
    ? '반드시 아래 JSON 형식만 출력한다: {"comment": "...", "question": "...", "connection": "..."}'
    : '반드시 아래 JSON 형식만 출력한다: {"comment": "...", "question": "..."}';
}
function jsonShapeEn(hasHistory) {
  return hasHistory
    ? 'Output ONLY this JSON shape: {"comment": "...", "question": "...", "connection": "..."}'
    : 'Output ONLY this JSON shape: {"comment": "...", "question": "..."}';
}

function systemPromptFor(lang, hasHistory) {
  const base = SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.ko;
  const shape = lang === 'en' ? jsonShapeEn(hasHistory) : jsonShape(hasHistory);
  if (!hasHistory) return base + '\n\n' + shape;
  const extra = HISTORY_RULES[lang] || HISTORY_RULES.ko;
  return base + extra + '\n\n' + shape;
}

/* mode: "sentence" — 오늘의 마음을 한 문장으로 다듬기 */
const SENTENCE_PROMPT = {
  ko: [
    '너는 "마음의 빙산" 앱에서 사용자가 쓴 기록을 한 문장으로 정리하는 도우미다.',
    '규칙:',
    '- 사용자가 쓴 사실(상황·감정·욕구)만 재료로 쓴다. 없는 사건·감정·원인을 만들지 않는다.',
    '- 사용자가 쓴 문장이 있으면 그 뜻과 말투를 살려서 다듬기만 한다. 새 해석을 덧붙이지 않는다.',
    '- 1문장, 40~90자. 담담하고 다정한 존댓말(~요체, \'~습니다\'체 금지). 진단·평가·훈계·조언 금지.',
    '- "오늘은 ..." 으로 시작해도 좋다. 욕구가 적혀 있으면 그 바람을 한 번 언급한다.',
    '반드시 아래 JSON 형식만 출력한다: {"sentence": "..."}',
  ].join('\n'),
  en: [
    'You tidy up an entry from the app "Mind\u2019s Iceberg" into one sentence.',
    'Rules:',
    '- Use only what the user wrote (situation, feelings, wishes). Invent nothing.',
    '- If the user already wrote a sentence, keep its meaning and tone and only tidy it. Do not add a new reading.',
    '- One sentence, 12-22 words, plain and gentle. No diagnosis, no advice.',
    'Output ONLY this JSON shape: {"sentence": "..."}',
  ].join('\n'),
};

function cleanHistory(h) {
  if (!Array.isArray(h)) return [];
  const out = [];
  for (const it of h.slice(0, HISTORY_MAX)) {
    if (!it || typeof it !== 'object') continue;
    const e = {
      date: clean(it.date, 24),
      feelings: clean(it.feelings, 90),
      needs: clean(it.needs, 90),
      reaction: clean(it.reaction || it.reactions, 90),
      situation: clean(it.situation, 140),
    };
    if (e.situation || e.feelings || e.needs) out.push(e);
  }
  return out;
}

function buildUserPrompt(d, lang, history) {
  const L = LABELS[lang] || LABELS.ko;
  const lines = [];
  for (const key of FIELDS) {
    const v = clean(d[key], 300);
    if (v) lines.push(`${L[key]}: ${v}`);
  }
  let prompt = `${L.intro}\n\n${lines.join('\n')}`;
  if (history && history.length) {
    const rows = history.map((h, i) => {
      const parts = [];
      if (h.date) parts.push(`${L.histDate}: ${h.date}`);
      if (h.feelings) parts.push(`${L.histFeel}: ${h.feelings}`);
      if (h.needs) parts.push(`${L.histNeed}: ${h.needs}`);
      if (h.reaction) parts.push(`${L.histReaction}: ${h.reaction}`);
      if (h.situation) parts.push(`${L.histSit}: ${h.situation}`);
      return `${i + 1}. ` + parts.join(' · ');
    });
    prompt += `\n\n${L.historyIntro}\n${rows.join('\n')}`;
  }
  return prompt;
}

/* 폴백 문장이 언어를 섞지 않도록 */
function sameLang(v, lang) {
  if (!v) return '';
  const hangul = /[\uAC00-\uD7A3]/.test(v);
  if (lang === 'en') return hangul ? '' : v;
  return hangul ? v : '';
}

function mmdd(dateStr) {
  const m = String(dateStr || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}-${m[3]}` : '';
}

/** 과거 기록이 있을 때, 실제 기록만으로 만드는 결정론적 한 줄 (단정 없이) */
function fallbackConnection(d, history, lang) {
  if (!history || !history.length) return '';
  const last = history[history.length - 1];
  const day = mmdd(last.date);
  const feel = sameLang(clean(d.feelings, 40), lang);
  const prevFeel = sameLang(clean(last.feelings, 40), lang);
  const prevSit = sameLang(clean(last.situation, 50), lang);
  if (lang === 'en') {
    if (!prevFeel && !prevSit) return '';
    const when = day ? `On ${day}` : 'In your last entry';
    const was = prevFeel ? `${when} the feeling was “${prevFeel}”` : `${when} you wrote about “${prevSit}”`;
    const now = feel ? `, and today it is “${feel}”.` : '.';
    return was + now + ' It may be a similar tone showing up again — or a slightly different one.';
  }
  if (!prevFeel && !prevSit) return '';
  const when = day ? `지난 ${day} 기록에서는` : '지난 기록에서는';
  const repeat = !!(prevFeel && feel && prevFeel === feel);
  const was = prevFeel
    ? (repeat ? `${when} ‘${prevFeel}’이 올라왔는데, 오늘도 같은 감정이 적혀 있어요.` : `${when} ‘${prevFeel}’이 올라왔는데`)
    : `${when} ‘${prevSit}’을 적으셨는데`;
  const now = repeat ? '' : (feel ? ` 오늘은 ‘${feel}’이에요.` : ' 오늘의 마음도 이어지고 있어요.');
  return was + now + ' 같은 결이 다시 보이는지, 아니면 조금 달라졌는지 한 번 살펴봐도 좋겠어요.';
}

function fallback(d, lang, history) {
  const feelings = clean(d.feelings, 60);
  const needs = clean(d.needs, 60);
  const connection = fallbackConnection(d, history, lang);
  if (lang === 'en') {
    const f = feelings || 'what you are feeling';
    const comment = needs
      ? `You wrote that you feel "${f}", and underneath it there may be a wish for "${needs}". That reading is only one possibility — you know the day better than this app does.`
      : `You wrote that you feel "${f}". That reading is only one possibility — you know the day better than this app does.`;
    const out = { comment, question: 'If this feeling asked for one very small thing, what might it be?', fallback: true };
    if (history && history.length) out.connection = connection;
    return out;
  }
  const f = feelings || '그 마음';
  const comment = needs
    ? `"${f}"이라고 적어 주셨고, 그 아래에 "${needs}"이라는 바람이 있었던 것 같아요. 이건 기록에서 읽어본 가능한 해석 중 하나예요.`
    : `"${f}"이라고 적어 주셨어요. 이건 기록에서 읽어본 가능한 해석 중 하나이고, 그날을 가장 잘 아는 건 앱이 아니라 나예요.`;
  const out = { comment, question: '지금 이 마음이 아주 작게 하나만 바란다면, 무엇일까요?', fallback: true };
  if (history && history.length) out.connection = connection;
  return out;
}

function fallbackSentence(d, lang) {
  const feel = clean(d.feelings, 40);
  const need = clean(d.needs, 40);
  const sit = clean(d.situation, 50);
  if (lang === 'en') {
    if (feel && need) return `Today${sit ? ', with ' + sit.toLowerCase() + ',' : ''} I felt ${feel}, and underneath there may have been a wish for ${need}.`;
    if (feel) return `Today I felt ${feel}${sit ? ' about ' + sit.toLowerCase() : ''}.`;
    return 'Today I wrote down what happened and left the feeling open for now.';
  }
  if (feel && need) return `오늘은 ${sit ? `'${sit}' 일로 ` : ''}'${feel}'이 올라왔고, 그 아래에는 '${need}'의 바람이 있었던 것 같아요.`;
  if (feel) return `오늘은 ${sit ? `'${sit}' 일로 ` : ''}'${feel}'이 올라왔어요.`;
  return '오늘은 있었던 일을 적어두고, 감정은 잠시 열어두었어요.';
}

function parseModelJson(text, withConnection) {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const o = JSON.parse(t.slice(start, end + 1));
    const comment = clean(o.comment, 600);
    const question = clean(o.question, 300);
    if (!comment || !question) return null;
    const out = { comment, question };
    if (withConnection) out.connection = clean(o.connection, 400);
    return out;
  } catch (e) {
    return null;
  }
}

function parseSentenceJson(text) {
  if (!text) return '';
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return '';
  try {
    const o = JSON.parse(t.slice(start, end + 1));
    return clean(o.sentence, 300);
  } catch (e) {
    return '';
  }
}

async function callGemini(apiKey, { system, user, temperature, maxTokens }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log('gemini_error', res.status, errText.slice(0, 400));
      return '';
    }
    const body = await res.json();
    const cand = body && body.candidates && body.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    return parts.map((p) => (p && p.text) || '').join('');
  } catch (e) {
    console.log('gemini_exception', String(e && e.message ? e.message : e));
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method === 'GET') {
      return json({ ok: true, service: 'maeum-bingsan-ai', model: MODEL, langs: ['ko', 'en'], history: HISTORY_MAX, mode: ['sentence'], version: VERSION });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ error: 'invalid_json' }, 400);
    }
    if (!data || typeof data !== 'object') {
      return json({ error: 'invalid_body' }, 400);
    }

    const lang = String(data.lang || '').toLowerCase().startsWith('en') ? 'en' : 'ko';
    const mode = data.mode === 'sentence' ? 'sentence' : 'entry';
    const history = cleanHistory(data.history);
    const hasHistory = history.length > 0;

    if (!clean(data.situation, 300) && !clean(data.feelings, 300)) {
      return json({ error: 'empty_input', lang }, 400);
    }

    const apiKey = env && env.GEMINI_API_KEY;

    if (mode === 'sentence') {
      if (!apiKey) return json({ sentence: fallbackSentence(data, lang), lang, fallback: true });
      const text = await callGemini(apiKey, {
        system: SENTENCE_PROMPT[lang] || SENTENCE_PROMPT.ko,
        user: buildUserPrompt(data, lang, []),
        temperature: 0.6,
        maxTokens: 160,
      });
      const sentence = parseSentenceJson(text);
      if (!sentence) return json({ sentence: fallbackSentence(data, lang), lang, fallback: true });
      return json({ sentence, lang });
    }

    if (!apiKey) {
      console.log('missing_gemini_key');
      return json(fallback(data, lang, history));
    }

    const text = await callGemini(apiKey, {
      system: systemPromptFor(lang, hasHistory),
      user: buildUserPrompt(data, lang, history),
      temperature: 0.8,
      maxTokens: hasHistory ? 520 : 400,
    });
    const result = parseModelJson(text, hasHistory);
    if (!result) return json(fallback(data, lang, history));
    const out = { comment: result.comment, question: result.question, lang };
    if (hasHistory) out.connection = result.connection || fallbackConnection(data, history, lang);
    return json(out);
  },
};
