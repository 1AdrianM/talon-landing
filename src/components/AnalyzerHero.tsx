import { useState, useEffect, useMemo, useRef } from 'react';
import styles from './AnalyzerHero.module.css';

type State = 'idle' | 'loading' | 'result' | 'failed';
type SurveyStep = 'email' | 'survey' | 'done';

interface LiveResult {
  isMock: false;
  reason: string;
  action: string;
  confidence: number;
  price_diff?: string;
  suggested_price?: number;
  product_name?: string;
}

interface MockResult {
  isMock: true;
  verdict_type: 'alert' | 'opportunity' | 'hold';
  headline: string;
  price_from: number;
  price_to: number;
  competitors: number;
  margin_note: string;
  action: string;
  confidence: number;
}

type Result = LiveResult | MockResult;

const MOCK_RESULT: MockResult = {
  isMock: true,
  verdict_type: 'alert',
  headline: 'SneakerHub dropped Court Classic by 12%',
  price_from: 125,
  price_to: 109,
  competitors: 3,
  margin_note: 'still $4 above the cheapest',
  action: 'Drop to $109 (if your margin allows)',
  confidence: 88,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export function AnalyzerHero() {
  const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'https://api-talon.fly.dev';
  const mode = (import.meta.env.PUBLIC_ANALYZER_MODE as string | undefined) ?? 'mock';
  const demoKey = (import.meta.env.PUBLIC_DEMO_KEY as string | undefined) ?? '';

  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [competitorInputs, setCompetitorInputs] = useState(['', '', '']);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<Result | null>(null);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [surveyStep, setSurveyStep] = useState<SurveyStep>('email');
  const [survey, setSurvey] = useState<Record<string, string>>({});

  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const utm = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(UTM_KEYS.flatMap(k => (p.get(k) ? [[k, p.get(k)!]] : [])));
  }, []);

  useEffect(() => {
    fetch(`${apiUrl}/health`).catch(() => {});
    beacon('page_view', {});
  }, []);

  useEffect(() => {
    if (state === 'failed') errorRef.current?.focus();
    if (state === 'result') resultRef.current?.focus();
  }, [state]);

  function beacon(name: string, props: Record<string, unknown>) {
    try {
      navigator.sendBeacon(
        `${apiUrl}/events`,
        JSON.stringify({ name, props, utm, path: typeof window !== 'undefined' ? window.location.pathname : '/' }),
      );
    } catch {}
  }

  function normalizeUrl(raw: string): string {
    const t = raw.trim();
    return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`;
  }

  function validateUrl(raw: string): string {
    if (!raw.trim()) return 'Please enter a product URL';
    try { new URL(normalizeUrl(raw)); return ''; }
    catch { return 'Please enter a valid URL (e.g. mystore.com/products/sneaker)'; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateUrl(url);
    if (err) { setUrlError(err); return; }
    setUrlError('');

    const normalized = normalizeUrl(url);
    const competitors = competitorInputs.map(c => normalizeUrl(c)).filter(c => {
      try { new URL(c); return c !== 'https://'; }
      catch { return false; }
    });

    setState('loading');
    beacon('analyzer_url_submitted', {});

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${apiUrl}/api/v2/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${demoKey}` },
        body: JSON.stringify({ url: normalized, competitors }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();

      if (mode === 'mock') {
        setState('result');
        setResult(MOCK_RESULT);
        beacon('analyzer_result_shown', { mock: true });
      } else if (res.ok && data.reason && data.action && data.confidence != null) {
        setState('result');
        setResult({ isMock: false, reason: data.reason, action: data.action, confidence: Math.round(data.confidence * 100), price_diff: data.price_diff, suggested_price: data.suggested_price, product_name: data.product_name });
        beacon('analyzer_result_shown', { mock: false });
      } else {
        setState('failed');
        beacon('analyzer_failed', {});
      }
    } catch {
      clearTimeout(timer);
      setState('failed');
      beacon('analyzer_failed', {});
    }
  }

  function handleSampleClick() {
    beacon('sample_used', {});
    setState('result');
    setResult(MOCK_RESULT);
  }

  async function handleEmailCapture(source: string) {
    setEmailError('');
    if (!EMAIL_RE.test(email)) { setEmailError('Please enter a valid email address'); return; }
    try {
      await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, url, source, utm }),
      });
    } catch {}
    beacon('email_captured', { source });
    setSurveyStep('survey');
  }

  function handleSurveyAnswer(q: string, a: string) {
    const updated = { ...survey, [q]: a };
    setSurvey(updated);
    beacon('survey_answered', { question: q, answer: a });
    const questions = ['platform', 'products', 'how_check', 'want_first', 'channel'];
    const answered = questions.filter(k => updated[k]);
    if (answered.length >= questions.length) setSurveyStep('done');
  }

  // ── IDLE / FORM ──────────────────────────────────────────────────
  const form = (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="ah-url" className={styles.label}>Your product URL</label>
        <div className={styles.inputRow}>
          <input
            id="ah-url"
            className={`${styles.input} ${urlError ? styles.inputError : ''}`}
            type="text"
            inputMode="url"
            placeholder="mystore.com/products/sneaker"
            value={url}
            onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(''); }}
            aria-describedby={urlError ? 'ah-url-error' : undefined}
            aria-invalid={!!urlError}
            autoComplete="url"
          />
          <button className={styles.submitBtn} type="submit">Check my price</button>
        </div>
        {urlError && <span id="ah-url-error" className={styles.fieldError} role="alert">{urlError}</span>}
      </div>

      {showCompetitors && (
        <div className={styles.competitors}>
          {competitorInputs.map((val, i) => (
            <div key={i} className={styles.field}>
              <label htmlFor={`ah-comp-${i}`} className={styles.labelSm}>Competitor URL {i + 1}</label>
              <input
                id={`ah-comp-${i}`}
                className={styles.input}
                type="text"
                inputMode="url"
                placeholder="competitor.com/products/sneaker"
                value={val}
                onChange={e => { const c = [...competitorInputs]; c[i] = e.target.value; setCompetitorInputs(c); }}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      )}

      <div className={styles.formFooter}>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => { setShowCompetitors(v => !v); beacon('cta_monitoring_click', { action: 'toggle_competitors' }); }}
        >
          {showCompetitors ? '− Hide competitor URLs' : '+ Add competitor URLs (optional)'}
        </button>
        <span className={styles.trust}>No signup required · Free analysis</span>
      </div>

      <button type="button" className={styles.sampleLink} onClick={handleSampleClick}>
        Try a sample product →
      </button>
    </form>
  );

  // ── LOADING ──────────────────────────────────────────────────────
  const loading = (
    <div className={styles.loadingWrap} aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.loadingText}>Checking prices…</p>
    </div>
  );

  // ── RESULT ───────────────────────────────────────────────────────
  function ResultCard({ r }: { r: Result }) {
    const isMock = r.isMock;
    const isMockResult = r as MockResult;
    const isLiveResult = r as LiveResult;
    const type = isMock ? isMockResult.verdict_type : (isLiveResult.confidence >= 85 ? 'alert' : 'opportunity');
    const colorClass = type === 'alert' ? styles.cardAlert : type === 'opportunity' ? styles.cardOpp : styles.cardHold;

    return (
      <div ref={resultRef} className={`${styles.resultCard} ${colorClass}`} tabIndex={-1}>
        {isMock && (
          <div className={styles.mockBadge} aria-label="This is example data, not a real analysis">
            Example result (sample data). Your real analysis is coming by email.
          </div>
        )}
        <div className={styles.resultHeader}>
          <span className={styles.verdictLabel}>{type === 'alert' ? '⚠ Alert' : type === 'opportunity' ? '↑ Opportunity' : '· Hold'}</span>
          <span className={styles.confidence}>{isMock ? isMockResult.confidence : Math.round(isLiveResult.confidence)}% confidence</span>
        </div>
        <p className={styles.headline}>
          {isMock ? isMockResult.headline : isLiveResult.reason}
        </p>
        {isMock && (
          <p className={styles.priceMove}>
            <span className={styles.priceOld}>${isMockResult.price_from}</span>
            {' → '}
            <span className={styles.priceNew}>${isMockResult.price_to}</span>
            <span className={styles.priceSub}>, {isMockResult.margin_note}</span>
          </p>
        )}
        <div className={styles.actionBox}>
          <span className={styles.actionLabel}>Suggested action</span>
          <p className={styles.actionText}>{isMock ? isMockResult.action : isLiveResult.action}</p>
        </div>

        <div className={styles.monitorCta}>
          <p className={styles.monitorText}>
            Want Talon to keep watching this product? Leave your email and we'll send you a decision when something changes.
          </p>
          {surveyStep === 'email' && (
            <div className={styles.emailRow}>
              <input
                className={styles.emailInput}
                type="email"
                placeholder="you@store.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label="Your email address"
                aria-describedby={emailError ? 'ah-email-error' : undefined}
                aria-invalid={!!emailError}
              />
              <button
                className={styles.monitorBtn}
                type="button"
                onClick={() => { handleEmailCapture('analyzer_mock'); beacon('cta_monitoring_click', { action: 'enable_monitoring' }); }}
              >
                Enable monitoring <span className={styles.earlyTag}>early access</span>
              </button>
            </div>
          )}
          {emailError && <span id="ah-email-error" className={styles.fieldError} role="alert">{emailError}</span>}
          {surveyStep !== 'email' && (
            <p className={styles.emailSent}>Got it. Your analysis is on its way.</p>
          )}
          <p className={styles.priceLine}>Planned price: $19/month. <a href="#early-access" className={styles.surveyLink}>Tell us if that works for you.</a></p>
        </div>

        <button className={styles.resetBtn} type="button" onClick={() => { setState('idle'); setResult(null); setSurveyStep('email'); setEmail(''); }}>
          ← Check another product
        </button>
      </div>
    );
  }

  // ── FAILED ───────────────────────────────────────────────────────
  const failed = (
    <div ref={errorRef} className={styles.failedCard} tabIndex={-1} role="alert">
      <p className={styles.failedTitle}>We couldn't read that page yet.</p>
      <p className={styles.failedText}>
        Some stores block automated reading. Leave your email and we'll run the analysis by hand and send it within 24 hours.
      </p>
      {surveyStep === 'email' ? (
        <>
          <div className={styles.emailRow}>
            <input
              className={styles.emailInput}
              type="email"
              placeholder="you@store.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-label="Your email address"
              aria-describedby={emailError ? 'ah-failed-email-error' : undefined}
              aria-invalid={!!emailError}
            />
            <button
              className={styles.monitorBtn}
              type="button"
              onClick={() => handleEmailCapture('analyzer_failed')}
            >
              Send me the analysis
            </button>
          </div>
          {emailError && <span id="ah-failed-email-error" className={styles.fieldError} role="alert">{emailError}</span>}
        </>
      ) : (
        <p className={styles.emailSent}>Got it. Your analysis is on its way.</p>
      )}
      <button className={styles.resetBtn} type="button" onClick={() => { setState('idle'); setSurveyStep('email'); setEmail(''); }}>
        ← Try another URL
      </button>
    </div>
  );

  return (
    <div className={styles.root}>
      {state === 'idle' && form}
      {state === 'loading' && loading}
      {state === 'result' && result && <ResultCard r={result} />}
      {state === 'failed' && failed}
    </div>
  );
}
